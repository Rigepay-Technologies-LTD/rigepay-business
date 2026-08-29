<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import { ChevronDownIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
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

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const activeIndex = ref(-1)
const triggerEl = ref<HTMLElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({ position: 'fixed', top: '-9999px', left: '-9999px', opacity: '0' })

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const displayLabel = computed(() => selected.value?.label ?? props.placeholder ?? 'Select…')

function positionMenu() {
  const t = triggerEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const dropUp = spaceBelow < 240 && r.top > spaceBelow
  menuStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    opacity: '1',
    maxHeight: `${Math.min(256, (dropUp ? r.top : spaceBelow) - 12)}px`,
    ...(dropUp ? { bottom: `${window.innerHeight - r.top + 4}px` } : { top: `${r.bottom + 4}px` }),
  }
}

function toggle() {
  if (props.disabled) return
  open.value ? close() : openMenu()
}

function openMenu() {
  open.value = true
  activeIndex.value = Math.max(0, props.options.findIndex((o) => o.value === props.modelValue))
  nextTick(() => {
    positionMenu()
    scrollActiveIntoView()
  })
  window.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', positionMenu, true)
  window.addEventListener('scroll', positionMenu, true)
}

function close() {
  open.value = false
  activeIndex.value = -1
  window.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', positionMenu, true)
  window.removeEventListener('scroll', positionMenu, true)
}

function onOutside(e: PointerEvent) {
  const target = e.target as Node
  if (triggerEl.value?.contains(target) || menuEl.value?.contains(target)) return
  close()
}

function pick(value: string) {
  emit('update:modelValue', value)
  close()
}

function scrollActiveIntoView() {
  const el = menuEl.value?.children?.[activeIndex.value] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openMenu()
    }
    return
  }
  switch (e.key) {
    case 'Escape':
    case 'Tab':
      if (e.key === 'Escape') e.preventDefault()
      close()
      break
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = Math.min(props.options.length - 1, activeIndex.value + 1)
      scrollActiveIntoView()
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = Math.max(0, activeIndex.value - 1)
      scrollActiveIntoView()
      break
    case 'Home':
      e.preventDefault()
      activeIndex.value = 0
      scrollActiveIntoView()
      break
    case 'End':
      e.preventDefault()
      activeIndex.value = props.options.length - 1
      scrollActiveIntoView()
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (props.options[activeIndex.value]) pick(props.options[activeIndex.value].value)
      break
  }
}

watch(() => props.disabled, (d) => { if (d) close() })
onBeforeUnmount(close)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-[13px] font-medium text-text-secondary inline-flex items-center">
      {{ label }}<span v-if="required" class="text-error ml-0.5">*</span>
      <AppTooltip v-if="tooltip" :text="tooltip" />
    </label>

    <div class="relative">
      <button
        ref="triggerEl"
        type="button"
        role="combobox"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :disabled="disabled"
        :class="[
          'w-full h-10 rounded-lg border text-sm text-left pl-3 pr-9 inline-flex items-center',
          'bg-input-bg outline-none transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-primary/20',
          error ? 'border-error' : open ? 'border-input-border-focused ring-2 ring-primary/15' : 'border-input-border hover:border-border-strong',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-2' : 'cursor-pointer',
        ]"
        @click="toggle"
        @keydown="onKeydown"
      >
        <span :class="selected ? 'text-text-primary truncate' : 'text-input-placeholder truncate'">{{ displayLabel }}</span>
      </button>
      <ChevronDownIcon
        class="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
      />
    </div>

    <p v-if="error" class="text-xs text-error font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-text-muted">{{ hint }}</p>
  </div>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out" enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in" leave-to-class="opacity-0 -translate-y-1"
    >
      <ul
        v-if="open"
        ref="menuEl"
        role="listbox"
        :style="menuStyle"
        class="z-9900 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg py-1"
      >
        <li
          v-for="(opt, i) in options"
          :key="opt.value"
          role="option"
          :aria-selected="opt.value === modelValue"
          :class="[
            'flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer select-none',
            i === activeIndex ? 'bg-surface-2' : '',
            opt.value === modelValue ? 'text-primary font-semibold' : 'text-text-primary',
          ]"
          @mouseenter="activeIndex = i"
          @click="pick(opt.value)"
        >
          <span class="truncate">{{ opt.label }}</span>
          <CheckIcon v-if="opt.value === modelValue" class="w-4 h-4 shrink-0 text-primary" />
        </li>
        <li v-if="!options.length" class="px-3 py-2 text-sm text-text-muted">No options</li>
      </ul>
    </Transition>
  </Teleport>
</template>
