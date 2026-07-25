<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      size === 'sm' ? 'h-8 px-3 text-xs'
        : size === 'lg' ? 'h-12 px-6 text-base'
        : 'h-10 px-4 text-sm',
      variant === 'secondary'
        ? 'bg-surface-2 text-text-primary hover:bg-border'
        : variant === 'ghost'
        ? 'bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary'
        : variant === 'danger'
        ? 'bg-error text-white hover:bg-error/90 shadow-sm hover:-translate-y-px'
        : 'bg-primary text-white hover:bg-primary-dark shadow-sm hover:-translate-y-px',
      block ? 'w-full' : '',
    ]"
  >
    <svg v-if="loading" class="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
    </svg>

    <slot name="icon" />

    <slot />
  </button>
</template>
