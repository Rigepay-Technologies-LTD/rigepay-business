<script setup lang="ts">
import { computed, ref } from 'vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'

const props = defineProps<{
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
  /** show a show/hide toggle for password fields */
  revealable?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const revealed = ref(false)
const resolvedType = computed(() => {
  const base = props.type ?? 'text'
  if (props.revealable && base === 'password') return revealed.value ? 'text' : 'password'
  return base
})
const showToggle = computed(() => props.revealable && (props.type ?? 'text') === 'password')
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-[13px] font-medium text-text-secondary inline-flex items-center">
      {{ label }}<span v-if="required" class="text-error ml-0.5">*</span>
      <AppTooltip v-if="tooltip" :text="tooltip" />
    </label>

    <div class="relative">
      <div v-if="$slots.icon" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <slot name="icon" />
      </div>

      <input
        :value="modelValue"
        :type="resolvedType"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :list="list"
        :class="[
          'w-full h-10 rounded-lg border text-sm text-text-primary placeholder:text-input-placeholder',
          'bg-input-bg outline-none transition-colors duration-150',
          'focus:ring-2 focus:ring-primary/15',
          $slots.icon ? 'pl-9' : 'pl-3',
          $slots.trailing || showToggle ? 'pr-10' : 'pr-3',
          error
            ? 'border-error focus:border-error'
            : 'border-input-border focus:border-input-border-focused',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-2' : '',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <button
        v-if="showToggle"
        type="button"
        tabindex="-1"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        <svg v-if="revealed" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
        </svg>
      </button>

      <div v-else-if="$slots.trailing" class="absolute right-3 top-1/2 -translate-y-1/2">
        <slot name="trailing" />
      </div>
    </div>

    <p v-if="error" class="text-xs text-error font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>
