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
      'bg-surface rounded-2xl shadow-sm transition-all duration-200',
      border === true ? 'ring-1 ring-border' : '',
      hover ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
      padding === 'none' ? ''
        : padding === 'sm' ? 'p-4'
        : padding === 'lg' ? 'p-8'
        : 'p-6',
    ]"
  >
    <slot />
  </component>
</template>
