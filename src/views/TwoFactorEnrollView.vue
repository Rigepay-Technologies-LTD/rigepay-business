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
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

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
    twoFactor.clear()
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
    twoFactor.clear()
    router.push({ name: 'home' })
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
  router.push({ name: 'home' })
}
</script>

<template>
  <AuthLayout title="Secure your account" subtitle="Two-factor authentication is required before you can access the dashboard.">
    <div v-if="backupCodes" class="flex flex-col gap-4">
      <p class="text-sm text-text-secondary">
        Save these backup codes somewhere safe. Each can be used once to log in if you lose access to your
        authenticator app.
      </p>
      <div class="grid grid-cols-2 gap-2 bg-surface-2 rounded-xl p-4 font-mono text-sm">
        <span v-for="c in backupCodes" :key="c">{{ c }}</span>
      </div>
      <AppButton block @click="finishEnrollment">Continue to dashboard</AppButton>
    </div>

    <div v-else-if="method === 'choose'" class="flex flex-col gap-3">
      <ErrorBanner :message="error" />
      <AppButton :loading="loading" block @click="startTotp">Set up with an authenticator app</AppButton>
      <AppButton variant="secondary" :loading="loading" block @click="startPasskey">Set up with a passkey</AppButton>
    </div>

    <div v-else-if="method === 'totp'" class="flex flex-col gap-4">
      <div class="flex justify-center">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="TOTP QR code" class="w-40 h-40 rounded-lg border border-border" />
      </div>
      <p class="text-xs text-text-muted text-center break-all">
        Can't scan? Enter this key manually: <span class="font-mono">{{ secret }}</span>
      </p>

      <AppInput v-model="code" label="6-digit code" placeholder="123456" required />

      <ErrorBanner :message="error" />

      <AppButton :loading="loading" block @click="confirmTotp">Confirm</AppButton>
      <button type="button" class="text-xs text-text-muted hover:underline" @click="method = 'choose'">
        Back
      </button>
    </div>
  </AuthLayout>
</template>
