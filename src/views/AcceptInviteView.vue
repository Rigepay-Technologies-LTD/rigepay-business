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
  <AuthLayout title="Accept invite" subtitle="Set your password to join the organization">
    <div v-if="done" class="flex flex-col gap-4 text-center">
      <p class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3">
        You're all set. You can now log in with your email and the password you just created.
      </p>
      <AppButton block @click="router.push({ name: 'login' })">Go to login</AppButton>
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="firstName" label="First name" required />
        <AppInput v-model="lastName" label="Last name" required />
      </div>
      <AppInput v-model="password" type="password" label="Password" hint="At least 8 characters" required />
      <AppInput v-model="confirmPassword" type="password" label="Confirm password" required />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="phone" label="Phone number" placeholder="+254712345678" />
        <AppInput v-model="nationalIdNumber" label="National ID / passport number" />
      </div>
      <AppInput v-model="taxIdNumber" label="Tax ID number (KRA PIN)" />

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" block>Accept invite & set password</AppButton>
    </form>
  </AuthLayout>
</template>
