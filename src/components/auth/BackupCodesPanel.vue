<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ codes: string[] }>()
defineEmits<{ (e: 'dismiss'): void }>()

const copied = ref(false)
function copyAll() {
  navigator.clipboard?.writeText(props.codes.join('\n')).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  })
}
</script>

<template>
  <div class="rounded-xl border border-warning/25 bg-warning-light overflow-hidden">
    <div class="flex items-start gap-2.5 px-4 py-3 border-b border-warning/15">
      <svg class="w-4 h-4 mt-0.5 shrink-0 text-warning-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
      </svg>
      <div>
        <p class="text-[13px] font-semibold text-warning-text">Save these backup codes now</p>
        <p class="text-xs text-warning-text/80 mt-0.5">
          They will not be shown again. Each code works once if you lose your authenticator.
        </p>
      </div>
    </div>
    <div class="p-4">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-xs">
        <span
          v-for="code in codes"
          :key="code"
          class="bg-surface border border-border rounded-lg px-2 py-1.5 text-center tracking-wider text-text-primary"
        >{{ code }}</span>
      </div>
      <div class="flex gap-3 mt-3">
        <button
          type="button"
          class="text-xs font-semibold text-primary hover:underline"
          @click="copyAll"
        >{{ copied ? 'Copied ✓' : 'Copy all' }}</button>
        <button
          type="button"
          class="text-xs font-semibold text-text-muted hover:text-text-secondary"
          @click="$emit('dismiss')"
        >Dismiss</button>
      </div>
    </div>
  </div>
</template>
