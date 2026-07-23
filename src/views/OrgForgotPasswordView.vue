<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { orgForgotPassword, orgResetPassword } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()

const step = ref<'request' | 'reset'>('request')

const email = ref('')
const otp = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const done = ref(false)

async function requestOtp() {
  error.value = null
  if (!email.value.trim()) {
    error.value = 'Email is required.'
    return
  }
  loading.value = true
  try {
    await orgForgotPassword(email.value.trim())
    info.value = 'If that email is registered, a reset code has been sent — check your inbox.'
    step.value = 'reset'
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function submitReset() {
  error.value = null
  if (!otp.value.trim() || newPassword.value.length < 8) {
    error.value = 'Enter the 6-digit code and a new password of at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await orgResetPassword(email.value.trim(), otp.value.trim(), newPassword.value)
    done.value = true
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Reset your password" subtitle="For organization and branch member accounts">
    <div v-if="done" class="flex flex-col gap-4 text-center">
      <p class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3">
        Password reset. You can now log in with your new password.
      </p>
      <AppButton block @click="router.push({ name: 'login' })">Go to login</AppButton>
    </div>

    <form v-else-if="step === 'request'" class="flex flex-col gap-4" @submit.prevent="requestOtp">
      <p class="text-xs text-text-muted">Enter your account email and we'll send a reset code.</p>
      <AppInput v-model="email" type="email" label="Email address" required />
      <ErrorBanner :message="error" />
      <AppButton type="submit" :loading="loading" block>Send reset code</AppButton>
      <p class="text-xs text-text-muted text-center">
        <router-link :to="{ name: 'login' }" class="text-primary font-semibold hover:underline">Back to login</router-link>
      </p>
    </form>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submitReset">
      <p v-if="info" class="text-xs text-success-text bg-success-light rounded-xl px-4 py-3">{{ info }}</p>
      <AppInput v-model="otp" label="6-digit reset code" placeholder="000000" required />
      <AppInput v-model="newPassword" type="password" label="New password" hint="At least 8 characters" required />
      <AppInput v-model="confirmPassword" type="password" label="Confirm new password" required />
      <ErrorBanner :message="error" />
      <AppButton type="submit" :loading="loading" block>Reset password</AppButton>
      <p class="text-xs text-text-muted text-center">
        Didn't get a code?
        <button type="button" class="text-primary font-semibold hover:underline" @click="step = 'request'">Try again</button>
      </p>
    </form>
  </AuthLayout>
</template>
