<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { onboardingHttp } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useOnboardingStore } from '@/stores/onboarding'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const onboarding = useOnboardingStore()

const password = ref('')
const passwordConfirm = ref('')
const pin = ref('')
const pinConfirm = ref('')

const loading = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  if (!onboarding.onboardingToken) {
    router.replace({ name: 'onboard-email' })
  }
})

async function submit() {
  error.value = null


  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (!/^\d{4}$/.test(pin.value)) {
    error.value = 'PIN must be exactly 4 digits.'
    return
  }
  if (pin.value !== pinConfirm.value) {
    error.value = 'PINs do not match.'
    return
  }

  loading.value = true
  try {
    await onboardingHttp(onboarding.onboardingToken!).put('/onboard/security-setup', {
      password: password.value,
      password_confirm: passwordConfirm.value,
      pin: pin.value,
      pin_confirm: pinConfirm.value,
    })
    onboarding.reset()
    router.push({ name: 'onboard-complete' })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Secure your account" subtitle="Step 5 of 5 — set a password and PIN">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput v-model="password" type="password" label="Password" hint="At least 8 characters" required />
      <AppInput v-model="passwordConfirm" type="password" label="Confirm password" required />

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="pin" type="password" label="4-digit PIN" required />
        <AppInput v-model="pinConfirm" type="password" label="Confirm PIN" required />
      </div>

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" block>Finish setup</AppButton>
    </form>
  </AuthLayout>
</template>
