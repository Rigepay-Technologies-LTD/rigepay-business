<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { setupTokenHttp } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useTwoFactorStore } from '@/stores/twoFactor'
import { applyDashboardToken, type DashboardTokenData } from '@/lib/dashboardToken'
import { decodeCreationOptions, encodeAttestationResponse, isWebAuthnSupported } from '@/lib/webauthn'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import OtpInput from '@/components/auth/OtpInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const copied = ref(false)
function copySecret() {
  navigator.clipboard?.writeText(secret.value).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  })
}
function copyBackupCodes() {
  if (!backupCodes.value) return
  navigator.clipboard?.writeText(backupCodes.value.join('\n')).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  })
}

const router = useRouter()
const twoFactor = useTwoFactorStore()

type Method = 'choose' | 'totp' | 'passkey'
const method = ref<Method>('choose')

const loading = ref(false)
const error = ref<string | null>(null)

const otpauthUri = ref('')
const secret = ref('')
const qrDataUrl = ref('')
const code = ref('')
const backupCodes = ref<string[] | null>(null)

onMounted(() => {
  if (!twoFactor.setupToken) {
    router.replace({ name: 'login' })
  }
})

interface TotpSetupResponse {
  status: string
  secret: string
  otpauth_uri: string
}

async function startTotp() {
  error.value = null
  loading.value = true
  try {
    const res = await setupTokenHttp(twoFactor.setupToken!).post<TotpSetupResponse>('/org/v1/auth/2fa/totp/setup')
    secret.value = res.data.secret
    otpauthUri.value = res.data.otpauth_uri
    qrDataUrl.value = await QRCode.toDataURL(otpauthUri.value)
    method.value = 'totp'
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

interface VerifySetupResponse {
  status: string
  data: DashboardTokenData
}

async function confirmTotp() {
  error.value = null
  if (!/^\d{6}$/.test(code.value)) {
    error.value = 'Enter the 6-digit code from your authenticator app.'
    return
  }
  loading.value = true
  try {
    const res = await setupTokenHttp(twoFactor.setupToken!).post<VerifySetupResponse>(
      '/org/v1/auth/2fa/totp/verify-setup',
      { code: code.value },
    )
    backupCodes.value = res.data.data.backup_codes ?? []
    applyDashboardToken(res.data.data)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function startPasskey() {
  error.value = null

  if (!isWebAuthnSupported()) {
    error.value = 'Passkeys are not supported in this browser. Try Chrome, Edge, or Safari, or use an authenticator app instead.'
    return
  }

  loading.value = true
  try {
    const beginRes = await setupTokenHttp(twoFactor.setupToken!).post<{
      status: string
      session_id: string
      creation_options: { publicKey: any }
    }>('/org/v1/auth/2fa/passkey/register/begin')

    const publicKey = decodeCreationOptions(beginRes.data.creation_options.publicKey)
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
    if (!credential) throw new Error('PASSKEY_CANCELLED')

    const finishRes = await setupTokenHttp(twoFactor.setupToken!).post<VerifySetupResponse>(
      '/org/v1/auth/2fa/passkey/register/finish',
      {
        session_id: beginRes.data.session_id,
        credential_name: 'Primary passkey',
        attestation_response: encodeAttestationResponse(credential),
      },
    )
    applyDashboardToken(finishRes.data.data)
    router.push(twoFactor.redirectPath ?? { name: 'home' })
    twoFactor.clear()
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.message === 'PASSKEY_CANCELLED') {
      error.value = 'Passkey setup was cancelled or timed out. You can try again or use an authenticator app instead.'
    } else if (err?.name === 'InvalidStateError') {
      error.value = 'This passkey is already registered on this device.'
    } else {
      error.value = extractErrorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

function finishEnrollment() {
  const redirectPath = twoFactor.redirectPath
  twoFactor.clear()
  router.push(redirectPath ?? { name: 'home' })
}
</script>

<template>
  <AuthLayout
    title="Secure your account"
    subtitle="Set up two-factor authentication before you access the dashboard."
  >
    <!-- Backup codes -->
    <div v-if="backupCodes" class="flex flex-col gap-4">
      <div class="flex items-start gap-2.5 rounded-xl bg-warning-light border border-warning/20 px-3.5 py-3 text-[13px] text-warning-text">
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
        </svg>
        <span>Save these codes somewhere safe. Each one works <b>once</b> if you lose your authenticator.</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5 bg-surface-2 rounded-xl p-4 font-mono text-sm text-text-primary">
        <span v-for="c in backupCodes" :key="c" class="tracking-wider">{{ c }}</span>
      </div>
      <AppButton variant="secondary" size="sm" block @click="copyBackupCodes">
        {{ copied ? 'Copied ✓' : 'Copy all codes' }}
      </AppButton>
      <AppButton size="lg" block @click="finishEnrollment">Continue to dashboard</AppButton>
    </div>

    <!-- Method choice -->
    <div v-else-if="method === 'choose'" class="flex flex-col gap-3">
      <ErrorBanner :message="error" />
      <button
        type="button"
        class="group flex items-center gap-3.5 text-left rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/40 transition-colors disabled:opacity-50"
        :disabled="loading"
        @click="startTotp"
      >
        <div class="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-text-primary">Authenticator app</p>
          <p class="text-xs text-text-muted mt-0.5">Google Authenticator, 1Password, Authy — scan a QR code.</p>
        </div>
        <svg class="w-4 h-4 text-text-muted ml-auto shrink-0 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg>
      </button>

      <button
        type="button"
        class="group flex items-center gap-3.5 text-left rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/40 transition-colors disabled:opacity-50"
        :disabled="loading"
        @click="startPasskey"
      >
        <div class="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="10" cy="8" r="5" /><path d="M2 21a8 8 0 0 1 10-7.75M15 15l6 6M18 15l3 3" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-text-primary">Passkey</p>
          <p class="text-xs text-text-muted mt-0.5">Fingerprint, Face ID or a security key. Phishing-resistant.</p>
        </div>
        <svg class="w-4 h-4 text-text-muted ml-auto shrink-0 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>

    <!-- TOTP setup -->
    <div v-else-if="method === 'totp'" class="flex flex-col gap-5">
      <div class="flex flex-col items-center gap-3">
        <div class="p-3 rounded-2xl bg-white border border-border">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="TOTP QR code" class="w-40 h-40" />
        </div>
        <p class="text-xs text-text-secondary text-center">Scan this with your authenticator app.</p>
      </div>

      <div class="rounded-xl border border-border bg-surface-2/50 p-3 flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-medium text-text-muted">Can't scan? Enter this key</p>
          <p class="font-mono text-[13px] text-text-primary break-all">{{ secret }}</p>
        </div>
        <button type="button" class="shrink-0 text-xs font-semibold text-primary hover:underline" @click="copySecret">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <OtpInput
        v-model="code"
        label="Enter the 6-digit code to confirm"
        :error="error ?? undefined"
        autofocus
        @complete="confirmTotp"
      />

      <ErrorBanner :message="error" />

      <AppButton :loading="loading" size="lg" block @click="confirmTotp">Confirm &amp; continue</AppButton>
      <button type="button" class="text-sm text-text-muted hover:text-text-secondary transition-colors" @click="method = 'choose'">
        ← Choose a different method
      </button>
    </div>
  </AuthLayout>
</template>
