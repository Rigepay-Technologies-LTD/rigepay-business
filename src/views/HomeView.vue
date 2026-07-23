<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/ui/AppLogo.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
    <AppLogo size="md" />

    <AppCard class="w-full max-w-md text-center" padding="lg">
      <h1 class="text-lg font-bold text-text-primary mb-2">You're in</h1>
      <p class="text-sm text-text-secondary mb-1">
        Signed in as <span class="font-semibold">{{ auth.meta?.memberType === 'branch_member' ? 'Branch Member' : 'Organization Member' }}</span>
      </p>
      <p class="text-xs text-text-muted mb-6">Role: {{ auth.meta?.role }}</p>
      <p class="text-xs text-text-muted mb-6">
        The full dashboard (branch management, members, payout approvals) ships in the next round.
      </p>
      <AppButton variant="secondary" block @click="logout">Log out</AppButton>
    </AppCard>
  </div>
</template>
