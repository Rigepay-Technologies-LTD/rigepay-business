<script setup lang="ts">
import AppLogo from '@/components/ui/AppLogo.vue'

defineProps<{
  title: string
  subtitle?: string
}>()

const highlights = [
  { title: 'One dashboard, every branch', body: 'Track collections, payouts, and petty cash across your whole organization in real time.' },
  { title: 'Bank-grade money movement', body: 'Every transaction is ledger-backed and CBK-compliant, with role-based approval controls.' },
  { title: 'Built for teams', body: 'Invite owners, managers, and branch staff with the exact permissions they need.' },
]
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- Branding panel — hidden on small screens, left column on lg+ -->
    <div class="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col justify-between p-12 overflow-hidden bg-primary">
      <div
        class="absolute inset-0 opacity-20"
        style="background-image: radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 35%);"
      />

      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center text-white font-bold text-sm shrink-0">
            RB
          </div>
          <span class="font-bold tracking-tight text-white text-base">RigePay Business</span>
        </div>
      </div>

      <div class="relative flex flex-col gap-8">
        <h2 class="text-3xl xl:text-4xl font-bold text-white leading-tight">
          Run your organization's money with confidence.
        </h2>
        <ul class="flex flex-col gap-5">
          <li v-for="h in highlights" :key="h.title" class="flex gap-3">
            <span class="mt-1 w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
            <div>
              <p class="text-sm font-semibold text-white">{{ h.title }}</p>
              <p class="text-sm text-white/70 mt-0.5">{{ h.body }}</p>
            </div>
          </li>
        </ul>
      </div>

      <p class="relative text-xs text-white/50">© {{ new Date().getFullYear() }} RigePay Technologies Ltd</p>
    </div>

    <!-- Form panel -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
      <div class="lg:hidden">
        <AppLogo size="md" />
      </div>

      <div class="w-full max-w-md animate-fade-in">
        <div class="mb-6">
          <h1 class="text-xl font-bold text-text-primary">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-text-secondary mt-1">{{ subtitle }}</p>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
