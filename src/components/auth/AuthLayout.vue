<script setup lang="ts">
import AppLogo from '@/components/ui/AppLogo.vue'
import AppCard from '@/components/ui/AppCard.vue'

defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-8">
    <AppLogo size="md" />

    <AppCard class="w-full max-w-md animate-fade-in" padding="lg">
      <div class="mb-6">
        <h1 class="text-lg font-bold text-text-primary">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-text-secondary mt-1">{{ subtitle }}</p>
      </div>
      <slot />
    </AppCard>
  </div>
</template>
