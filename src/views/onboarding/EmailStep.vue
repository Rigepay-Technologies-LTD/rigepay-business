<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useOnboardingStore } from '@/stores/onboarding'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const onboarding = useOnboardingStore()

const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function submit() {
  error.value = null

  if (!isValidEmail(email.value)) {
    error.value = 'Please enter a valid email address.'
    return
  }

  loading.value = true
  try {
    await http.post('/onboard/v2/email/initiate', { email: email.value })
    onboarding.setEmail(email.value)
    router.push({ name: 'onboard-verify' })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="Create your business account"
    subtitle="Enter your email to get started — we'll send you a verification code."
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput
        v-model="email"
        label="Email address"
        type="email"
        placeholder="you@company.com"
        required
      />

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" block>Continue</AppButton>

      <p class="text-xs text-text-muted text-center">
        Already have an account?
        <router-link :to="{ name: 'login' }" class="text-primary font-semibold hover:underline">Log in</router-link>
      </p>
    </form>
  </AuthLayout>
</template>
