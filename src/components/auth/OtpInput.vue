<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    length?: number
    label?: string
    error?: string
    disabled?: boolean
    autofocus?: boolean
  }>(),
  { length: 6 },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'complete', v: string): void
}>()

const inputs = ref<HTMLInputElement[]>([])
const cells = computed<string[]>(() => {
  const arr = props.modelValue.split('').slice(0, props.length)
  while (arr.length < props.length) arr.push('')
  return arr
})

function setRef(el: unknown, i: number) {
  if (el) inputs.value[i] = el as HTMLInputElement
}

function emitValue(next: string) {
  const clean = next.replace(/\D/g, '').slice(0, props.length)
  emit('update:modelValue', clean)
  if (clean.length === props.length) emit('complete', clean)
}

function onInput(i: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  const arr = cells.value.slice()
  if (raw.length > 1) {
    // paste-like input into one cell
    for (let k = 0; k < raw.length && i + k < props.length; k++) arr[i + k] = raw[k]
    emitValue(arr.join(''))
    focusCell(Math.min(i + raw.length, props.length - 1))
    return
  }
  arr[i] = raw
  emitValue(arr.join(''))
  if (raw) focusCell(i + 1)
}

function onKeydown(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    const arr = cells.value.slice()
    if (arr[i]) {
      arr[i] = ''
      emitValue(arr.join(''))
    } else if (i > 0) {
      arr[i - 1] = ''
      emitValue(arr.join(''))
      focusCell(i - 1)
    }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft') {
    focusCell(i - 1)
  } else if (e.key === 'ArrowRight') {
    focusCell(i + 1)
  }
}

function onPaste(e: ClipboardEvent) {
  const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '')
  if (!text) return
  e.preventDefault()
  emitValue(text)
  focusCell(Math.min(text.length, props.length - 1))
}

function focusCell(i: number) {
  const idx = Math.max(0, Math.min(i, props.length - 1))
  nextTick(() => inputs.value[idx]?.focus())
}

watch(
  () => props.autofocus,
  (v) => {
    if (v) focusCell(0)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-[13px] font-medium text-text-secondary">{{ label }}</label>
    <div class="flex gap-2 sm:gap-2.5" @paste="onPaste">
      <input
        v-for="(cell, i) in cells"
        :key="i"
        :ref="(el) => setRef(el, i)"
        :value="cell"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="1"
        :disabled="disabled"
        :class="[
          'flex-1 min-w-0 h-12 sm:h-14 rounded-xl border text-center text-lg font-bold text-text-primary',
          'bg-input-bg outline-none transition-all duration-150',
          'focus:ring-2 focus:ring-primary/20 focus:border-primary',
          error ? 'border-error' : cell ? 'border-input-border-focused' : 'border-input-border',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
        @input="onInput(i, $event)"
        @keydown="onKeydown(i, $event)"
      />
    </div>
    <p v-if="error" class="text-xs text-error font-medium">{{ error }}</p>
  </div>
</template>
