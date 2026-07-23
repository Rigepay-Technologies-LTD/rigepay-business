<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setupTokenHttp } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useTwoFactorStore } from '@/stores/twoFactor'
import { applyDashboardToken, type DashboardTokenData } from '@/lib/dashboardToken'
import { decodeRequestOptions, encodeAssertionResponse, isWebAuthnSupported } from '@/lib/webauthn'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const twoFactor = useTwoFactorStore()


const hasTotp = computed(() => twoFactor.methods.includes('totp'))
const hasPasskey = computed(() => twoFactor.methods.includes('passkey'))

type Mode = 'totp' | 'recover' | 'passkey'
const mode = ref<Mode>('totp')

const code = ref('')
const backupCode = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  if (!twoFactor.setupToken) {
    router.replace({ name: 'login' })
  }
  mode.value = hasTotp.value ? 'totp' : 'passkey'
})

interface ChallengeResponse {
  status: string
  data: DashboardTokenData
}

function finish(data: DashboardTokenData) {
  applyDashboardToken(data)
  twoFactor.clear()
  router.push({ name: 'home' })
}

async function submitTotp() {
  error.value = null
  if (!/^\d{6}$/.test(code.value)) {
    error.value = 'Enter the 6-digit code from your authenticator app.'
    return
  }
  loading.value = true
  try {
    const res = await setupTokenHttp(twoFactor.setupToken!).post<ChallengeResponse>('/org/v1/auth/2fa/totp/validate', {
      code: code.value,
    })
    finish(res.data.data)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function submitRecovery() {
  error.value = null
  if (!backupCode.value.trim()) {
    error.value = 'Enter a backup code.'
    return
  }
  loading.value = true
  try {
    const res = await setupTokenHttp(twoFactor.setupToken!).post<ChallengeResponse>('/org/v1/auth/2fa/totp/recover', {
      backup_code: backupCode.value.trim(),
    })
    finish(res.data.data)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function submitPasskey() {
  error.value = null

  if (!isWebAuthnSupported()) {
    error.value = 'Passkeys are not supported in this browser.'
    return
  }

  loading.value = true
  try {
    const beginRes = await setupTokenHttp(twoFactor.setupToken!).post<{
      status: string
      session_id: string
      request_options: { publicKey: any }
    }>('/org/v1/auth/2fa/passkey/auth/begin')

    const publicKey = decodeRequestOptions(beginRes.data.request_options.publicKey)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
    if (!credential) throw new Error('PASSKEY_CANCELLED')

    const finishRes = await setupTokenHttp(twoFactor.setupToken!).post<ChallengeResponse>(
      '/org/v1/auth/2fa/passkey/auth/finish',
      {
        session_id: beginRes.data.session_id,
        assertion_response: encodeAssertionResponse(credential),
      },
    )
    finish(finishRes.data.data)
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.message === 'PASSKEY_CANCELLED') {
      error.value = 'Passkey authentication was cancelled or timed out.'
    } else {
      error.value = extractErrorMessage(err)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Verify it's you" subtitle="Two-factor authentication is required to continue.">
    <div class="flex flex-col gap-4">
      <div v-if="hasTotp && hasPasskey" class="flex gap-2 rounded-xl bg-surface-2 p-1">
        <button
          type="button"
          :class="['flex-1 text-xs font-semibold rounded-lg py-1.5', mode === 'totp' || mode === 'recover' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted']"
          @click="mode = 'totp'"
        >
          Authenticator app
        </button>
        <button
          type="button"
          :class="['flex-1 text-xs font-semibold rounded-lg py-1.5', mode === 'passkey' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted']"
          @click="mode = 'passkey'"
        >
          Passkey
        </button>
      </div>

      <form v-if="mode === 'totp'" class="flex flex-col gap-4" @submit.prevent="submitTotp">
        <AppInput v-model="code" label="6-digit code" placeholder="123456" required />
        <ErrorBanner :message="error" />
        <AppButton type="submit" :loading="loading" block>Verify</AppButton>
        <button type="button" class="text-xs text-primary font-semibold hover:underline" @click="mode = 'recover'">
          Use a backup code instead
        </button>
      </form>

      <form v-else-if="mode === 'recover'" class="flex flex-col gap-4" @submit.prevent="submitRecovery">
        <AppInput v-model="backupCode" label="Backup code" required />
        <ErrorBanner :message="error" />
        <AppButton type="submit" :loading="loading" block>Verify</AppButton>
        <button type="button" class="text-xs text-text-muted hover:underline" @click="mode = 'totp'">
          Back
        </button>
      </form>

      <div v-else-if="mode === 'passkey'" class="flex flex-col gap-4">
        <p class="text-sm text-text-secondary text-center">Use your device's passkey to verify it's you.</p>
        <ErrorBanner :message="error" />
        <AppButton :loading="loading" block @click="submitPasskey">Continue with passkey</AppButton>
        <button v-if="hasTotp" type="button" class="text-xs text-text-muted hover:underline" @click="mode = 'totp'">
          Use authenticator app instead
        </button>
      </div>
    </div>
  </AuthLayout>
</template>
