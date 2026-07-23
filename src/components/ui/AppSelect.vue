<script setup lang="ts">
import AppTooltip from '@/components/ui/AppTooltip.vue'
import { ChevronDownIcon } from 'lucide-vue-next'

defineProps<{
  modelValue?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  tooltip?: string
  options: { value: string; label: string }[]
  placeholder?: string
}>()

defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-semibold text-text-secondary uppercase tracking-wide inline-flex items-center">
      {{ label }}<span v-if="required" class="text-error ml-0.5">*</span>
      <AppTooltip v-if="tooltip" :text="tooltip" />
    </label>

    <div class="relative">
      <select
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full h-10 rounded-xl border text-sm font-medium text-text-primary appearance-none',
          'bg-input-bg outline-none transition-all duration-200 pl-3.5 pr-9',
          'focus:ring-2 focus:ring-primary/20',
          error
            ? 'border-error focus:border-error'
            : 'border-input-border focus:border-input-border-focused',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <ChevronDownIcon class="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>

    <p v-if="error" class="text-xs text-error font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>
