<script setup lang="ts">
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
</script>

<template>
  <AuthLayout title="You're all set" subtitle="Your organization account has been created.">
    <div class="flex flex-col items-center gap-5 text-center py-2">
      <div class="relative">
        <span class="absolute inset-0 rounded-full bg-success/20 animate-ping" />
        <div class="relative w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
          <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <p class="text-sm text-text-secondary leading-relaxed">
        Your first organization member account is ready. Log in with your email and password to continue —
        you'll be prompted to set up two-factor authentication on your first sign-in.
      </p>

      <ul class="w-full flex flex-col gap-2 text-left">
        <li
          v-for="tip in [
            'Add your branches and invite managers',
            'Configure payout approval thresholds',
            'Upload your KYB documents for verification',
          ]"
          :key="tip"
          class="flex items-start gap-2.5 text-[13px] text-text-secondary"
        >
          <svg class="w-4 h-4 text-primary mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{{ tip }}</span>
        </li>
      </ul>

      <AppButton size="lg" block @click="$router.push({ name: 'login' })">Go to login</AppButton>
    </div>
  </AuthLayout>
</template>
