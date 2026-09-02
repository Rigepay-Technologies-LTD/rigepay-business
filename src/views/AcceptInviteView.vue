<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { acceptOrgInvite } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()

const token = ref('')
const firstName = ref('')
const lastName = ref('')
const password = ref('')
const confirmPassword = ref('')
const phone = ref('')
const nationalIdNumber = ref('')
const taxIdNumber = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

onMounted(() => {
  const t = route.query.token
  if (typeof t === 'string') token.value = t
})

async function submit() {
  error.value = null
  if (!token.value) {
    error.value = 'This invite link is missing its token. Please use the link from your invite email.'
    return
  }
  if (!firstName.value.trim() || !lastName.value.trim() || !password.value) {
    error.value = 'First name, last name, and password are required.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await acceptOrgInvite({
      token: token.value,
      password: password.value,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      phone: phone.value.trim() || undefined,
      national_id_number: nationalIdNumber.value.trim() || undefined,
      tax_id_number: taxIdNumber.value.trim() || undefined,
    })
    done.value = true
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="You've been invited"
    subtitle="Set your name and password to join the organization on RigePay."
  >
    <div v-if="done" class="flex flex-col items-center gap-5 text-center py-2">
      <div class="relative">
        <span class="absolute inset-0 rounded-full bg-success/20 animate-ping" />
        <div class="relative w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
          <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </div>
      <p class="text-sm text-text-secondary leading-relaxed">
        You're all set. Log in with your email and the password you just created — you'll set up two-factor
        authentication on your first sign-in.
      </p>
      <AppButton size="lg" block @click="router.push({ name: 'login' })">Go to login</AppButton>
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="firstName" label="First name" required />
        <AppInput v-model="lastName" label="Last name" required />
      </div>
      <AppInput v-model="password" type="password" label="Password" hint="At least 8 characters" required revealable />
      <AppInput v-model="confirmPassword" type="password" label="Confirm password" required revealable />

      <details class="group rounded-xl border border-border bg-surface-2/40">
        <summary
          class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden"
        >
          <div>
            <p class="text-[13px] font-semibold text-text-primary">Identity details</p>
            <p class="text-xs text-text-muted mt-0.5">Optional now — your organization may require these for verification.</p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div class="flex flex-col gap-3 px-4 pb-4 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="phone" label="Phone number" placeholder="+254712345678" />
            <AppInput v-model="nationalIdNumber" label="National ID / passport" />
          </div>
          <AppInput v-model="taxIdNumber" label="Tax ID number (KRA PIN)" />
        </div>
      </details>

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" size="lg" block>Accept invite &amp; set password</AppButton>
    </form>
  </AuthLayout>
</template>
