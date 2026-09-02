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
    :step="1"
    :steps="['Email', 'Verify', 'Details', 'Business', 'Security']"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput
        v-model="email"
        label="Email address"
        type="email"
        placeholder="you@company.co.ke"
        required
      >
        <template #icon>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
          </svg>
        </template>
      </AppInput>

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" size="lg" block>Continue</AppButton>

      <p class="text-sm text-text-secondary text-center pt-1">
        Already have an account?
        <router-link :to="{ name: 'login' }" class="text-primary font-semibold hover:underline">Log in</router-link>
      </p>
    </form>
  </AuthLayout>
</template>
