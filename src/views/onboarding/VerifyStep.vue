<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/lib/http'
import { extractErrorCode, extractErrorMessage } from '@/lib/errors'
import { useOnboardingStore } from '@/stores/onboarding'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const onboarding = useOnboardingStore()

const code = ref('')
const loading = ref(false)
const resending = ref(false)
const error = ref<string | null>(null)
const resendMessage = ref<string | null>(null)

onMounted(() => {
  if (!onboarding.email) {
    router.replace({ name: 'onboard-email' })
  }
})

interface VerifyResponseBody {
  status: string
  data: {
    action: 'login' | 'register'
    email: string
    access_token: string
    user_id: string | null
    role: string
    onboarding_mode: boolean
  }
}

async function submit() {
  error.value = null

  if (!/^\d{6}$/.test(code.value)) {
    error.value = 'Enter the 6-digit code we sent to your email.'
    return
  }

  loading.value = true
  try {
    const res = await http.post<VerifyResponseBody>('/onboard/v2/email/verify', {
      email: onboarding.email,
      code: code.value,
    })

    const { action, access_token, user_id } = res.data.data

    if (action === 'login') {
      router.push({ name: 'login', query: { email: onboarding.email } })
      return
    }

    onboarding.setToken(access_token, user_id ?? '')
    router.push({ name: 'onboard-personal' })
  } catch (err) {
    const errCode = extractErrorCode(err)
    if (errCode === 'OTP_INCORRECT') {
      error.value = 'The verification code you entered is incorrect. Please check and try again.'
    } else if (errCode === 'OTP_EXPIRED') {
      error.value = 'Your verification code has expired. Please request a new one.'
    } else {
      error.value = extractErrorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

async function resend() {
  resending.value = true
  error.value = null
  resendMessage.value = null
  try {
    await http.post('/onboard/v2/email/initiate', { email: onboarding.email })
    resendMessage.value = 'A new verification code has been sent to your email.'
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <AuthLayout title="Check your email" :subtitle="`Enter the 6-digit code sent to ${onboarding.email}`">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput
        v-model="code"
        label="Verification code"
        placeholder="123456"
        required
      />

      <ErrorBanner :message="error" />
      <p v-if="resendMessage" class="text-sm text-success-text bg-success-light rounded-xl px-3.5 py-2.5">
        {{ resendMessage }}
      </p>

      <AppButton type="submit" :loading="loading" block>Verify</AppButton>

      <button
        type="button"
        class="text-xs text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="resending"
        @click="resend"
      >
        {{ resending ? 'Sending…' : "Didn't get a code? Resend" }}
      </button>
    </form>
  </AuthLayout>
</template>
