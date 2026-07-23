<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'
  size?: 'sm' | 'md'
  dot?: boolean
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      variant === 'success' ? 'bg-success-light text-success-text'
        : variant === 'error'   ? 'bg-error-light text-error-text'
        : variant === 'warning' ? 'bg-warning-light text-warning-text'
        : variant === 'info'    ? 'bg-info-light text-info-text'
        : variant === 'primary' ? 'bg-primary-muted text-primary'
        : 'bg-surface-2 text-text-muted',
    ]"
  >
    <span
      v-if="dot"
      class="w-1.5 h-1.5 rounded-full shrink-0"
      :class="
        variant === 'success' ? 'bg-success'
        : variant === 'error'   ? 'bg-error'
        : variant === 'warning' ? 'bg-warning'
        : variant === 'info'    ? 'bg-info'
        : variant === 'primary' ? 'bg-primary'
        : 'bg-text-muted'
      "
    />
    <slot />
  </span>
</template>
