<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      :class="[
        'rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-md shrink-0',
        size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm',
      ]"
    >
      RB
    </div>
    <span
      :class="[
        'font-bold tracking-tight text-text-primary',
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base',
      ]"
    >
      RigePay Business
    </span>
  </div>
</template>
