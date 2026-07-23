<script setup lang="ts">
defineProps<{ message: string | null }>()
</script>

<template>
  <div
    v-if="message"
    class="flex items-start gap-2 rounded-xl bg-error-light border border-error/20 px-3.5 py-2.5 text-sm font-medium text-error-text animate-shake"
    role="alert"
  >
    <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
    <span>{{ message }}</span>
  </div>
</template>
