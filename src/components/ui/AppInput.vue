<script setup lang="ts">
import AppTooltip from '@/components/ui/AppTooltip.vue'

defineProps<{
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  tooltip?: string
  list?: string
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
      <div v-if="$slots.icon" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <slot name="icon" />
      </div>

      <input
        :value="modelValue"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :list="list"
        :class="[
          'w-full h-10 rounded-xl border text-sm font-medium text-text-primary placeholder:text-input-placeholder',
          'bg-input-bg outline-none transition-all duration-200',
          'focus:ring-2 focus:ring-primary/20',
          $slots.icon ? 'pl-9 pr-3.5' : 'px-3.5',
          error
            ? 'border-error focus:border-error'
            : 'border-input-border focus:border-input-border-focused',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <div v-if="$slots.trailing" class="absolute right-3 top-1/2 -translate-y-1/2">
        <slot name="trailing" />
      </div>
    </div>

    <p v-if="error" class="text-xs text-error font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>
