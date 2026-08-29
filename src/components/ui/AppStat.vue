<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info'
}>()
</script>

<template>
  <div class="bg-surface rounded-xl border border-border p-5 flex flex-col gap-3 min-w-0">
    <div class="flex items-start justify-between gap-2">
      <p class="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-none">{{ label }}</p>
      <div
        v-if="$slots.icon"
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          iconColor === 'success' ? 'bg-success-light text-success'
            : iconColor === 'warning' ? 'bg-warning-light text-warning'
            : iconColor === 'error'   ? 'bg-error-light text-error'
            : iconColor === 'info'    ? 'bg-info-light text-info'
            : 'bg-primary-muted text-primary',
        ]"
      >
        <slot name="icon" />
      </div>
    </div>

    <div class="space-y-1">
      <p class="text-2xl font-bold text-text-primary leading-tight tracking-tight break-words">{{ value }}</p>
      <p v-if="sub" class="text-xs text-text-muted">{{ sub }}</p>
    </div>

    <div v-if="trend" class="flex items-center gap-1.5">
      <span
        :class="[
          'inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md',
          trend.direction === 'up'   ? 'bg-success-light text-success-text'
            : trend.direction === 'down' ? 'bg-error-light text-error-text'
            : 'bg-surface-2 text-text-muted',
        ]"
      >
        <svg v-if="trend.direction === 'up'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
        <svg v-else-if="trend.direction === 'down'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
        {{ trend.value }}
      </span>
      <span class="text-xs text-text-muted">vs last period</span>
    </div>
  </div>
</template>
