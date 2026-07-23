<script setup lang="ts">
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
</script>

<template>
  <AuthLayout title="You're all set" subtitle="Your organization account has been created.">
    <div class="flex flex-col items-center gap-5 text-center py-2">
      <div class="w-14 h-14 rounded-full bg-success-light flex items-center justify-center">
        <svg class="w-7 h-7 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-sm text-text-secondary">
        Your first organization member account has been created. Log in with your email and password to
        continue — you'll be asked to set up two-factor authentication on first login.
      </p>
      <AppButton block @click="$router.push({ name: 'login' })">Go to login</AppButton>
    </div>
  </AuthLayout>
</template>
