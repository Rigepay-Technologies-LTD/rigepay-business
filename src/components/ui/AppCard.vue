<script setup lang="ts">
defineProps<{
  padding?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
  as?: string
}>()
</script>

<template>
  <component
    :is="as ?? 'div'"
    :class="[
      'bg-surface rounded-xl border border-border transition-colors duration-150',
      border === true ? 'border-border-strong' : '',
      hover ? 'hover:border-border-strong hover:shadow-sm cursor-pointer' : '',
      padding === 'none' ? ''
        : padding === 'sm' ? 'p-4'
        : padding === 'lg' ? 'p-8'
        : 'p-6',
    ]"
  >
    <slot />
  </component>
</template>
