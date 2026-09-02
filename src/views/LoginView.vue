<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { http } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useTwoFactorStore } from '@/stores/twoFactor'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()
const twoFactor = useTwoFactorStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  const prefill = route.query.email
  if (typeof prefill === 'string') email.value = prefill
})

interface TwoFAResponse {
  status: '2fa_setup_required' | '2fa_verify_required'
  message: string
  setup_token: string
  methods?: string[]
  expires_in: string
}

async function submit() {
  error.value = null

  if (!email.value.trim() || !password.value) {
    error.value = 'Email and password are required.'
    return
  }

  loading.value = true
  try {
    const res = await http.post<TwoFAResponse>('/org/v1/auth/login', {
      email: email.value.trim(),
      password: password.value,
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (res.data.status === '2fa_setup_required') {
      twoFactor.setEnrollment(res.data.setup_token)
      twoFactor.setRedirect(redirect)
      router.push({ name: '2fa-enroll' })
    } else {
      twoFactor.setChallenge(res.data.setup_token, res.data.methods ?? [])
      twoFactor.setRedirect(redirect)
      router.push({ name: '2fa-challenge' })
    }
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Welcome back" subtitle="Log in to your organization's RigePay dashboard.">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput v-model="email" type="email" label="Email address" placeholder="you@company.co.ke" required>
        <template #icon>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
          </svg>
        </template>
      </AppInput>

      <div class="flex flex-col gap-1.5">
        <AppInput v-model="password" type="password" label="Password" placeholder="••••••••" required revealable>
          <template #icon>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </template>
        </AppInput>
        <router-link
          :to="{ name: 'org-forgot-password' }"
          class="self-end text-xs text-primary font-semibold hover:underline"
        >
          Forgot your password?
        </router-link>
      </div>

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" size="lg" block>Log in</AppButton>

      <p class="text-sm text-text-secondary text-center pt-1">
        New organization?
        <router-link :to="{ name: 'onboard-email' }" class="text-primary font-semibold hover:underline">
          Create an account
        </router-link>
      </p>
    </form>
  </AuthLayout>
</template>
