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

const firstName = ref('')
const lastName = ref('')
const idNumber = ref('')
const dob = ref('')
const termsAccepted = ref(false)

const loading = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  if (!onboarding.onboardingToken) {
    router.replace({ name: 'onboard-email' })
  }
})

async function submit() {
  error.value = null

  if (!firstName.value.trim() || firstName.value.trim().length < 2) {
    error.value = 'First name must be at least 2 characters.'
    return
  }
  if (!lastName.value.trim() || lastName.value.trim().length < 2) {
    error.value = 'Last name must be at least 2 characters.'
    return
  }
  if (!idNumber.value.trim() || idNumber.value.trim().length < 5) {
    error.value = 'ID number must be at least 5 characters.'
    return
  }
  if (!dob.value) {
    error.value = 'Please enter your date of birth.'
    return
  }
  if (!termsAccepted.value) {
    error.value = 'You must accept the Terms & Conditions to continue.'
    return
  }

  loading.value = true
  try {
    await onboardingHttp(onboarding.onboardingToken!).put('/onboard/personal-details', {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: onboarding.email,
      id_number: idNumber.value.trim(),
      dob: dob.value,
      terms_accepted: termsAccepted.value,
      terms_version: 'v1',
    })
    router.push({ name: 'onboard-business' })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Personal details" subtitle="Step 3 of 5 — tell us a bit about yourself">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="firstName" label="First name" required />
        <AppInput v-model="lastName" label="Last name" required />
      </div>

      <AppInput v-model="idNumber" label="National ID number" required />

      <AppInput v-model="dob" type="date" label="Date of birth" required />

      <label class="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
        <input v-model="termsAccepted" type="checkbox" class="mt-0.5 accent-primary" />
        <span>I agree to the RigePay Terms &amp; Conditions and Privacy Policy.</span>
      </label>

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" block>Continue</AppButton>
    </form>
  </AuthLayout>
</template>
