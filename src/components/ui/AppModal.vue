<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const close = () => emit('update:modelValue', false)

const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }

// --- Shared scroll lock. This app scrolls on <section class="app-main-scroll">
// (see DashboardLayout), not <body>, so a modal that only Teleports to <body>
// still lets the page behind it scroll/reflow. Lock every scroll surface while
// any modal is open, reference-counted so nested modals behave.
let held = false
function lock() {
  if (held) return
  held = true
  modalOpenCount++
  if (modalOpenCount === 1) document.documentElement.classList.add('modal-open')
}
function unlock() {
  if (!held) return
  held = false
  modalOpenCount = Math.max(0, modalOpenCount - 1)
  if (modalOpenCount === 0) document.documentElement.classList.remove('modal-open')
}

watch(() => props.modelValue, (v) => (v ? lock() : unlock()), { immediate: true })

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
  unlock()
})
</script>

<script lang="ts">
let modalOpenCount = 0
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-9800 flex items-end sm:items-center justify-center sm:p-4"
        style="background: var(--color-overlay); backdrop-filter: blur(4px);"
        @click.self="close"
        role="dialog"
        aria-modal="true"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          leave-active-class="transition-all duration-150 ease-in"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="modelValue"
            :class="[
              'relative w-full bg-surface shadow-2xl flex flex-col border border-border',
              'rounded-t-2xl sm:rounded-xl overflow-hidden',
              size === 'sm'   ? 'sm:max-w-sm'
                : size === 'lg'   ? 'sm:max-w-2xl'
                : size === 'xl'   ? 'sm:max-w-4xl'
                : size === 'full' ? 'sm:max-w-full sm:m-4'
                : 'sm:max-w-lg',
              'max-h-[90vh] sm:max-h-[85vh]',
            ]"
          >
            <div v-if="title || $slots.header" class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
              <slot name="header">
                <h2 class="text-base font-bold text-text-primary">{{ title }}</h2>
              </slot>
              <button
                class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                @click="close"
                aria-label="Close"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              <slot />
            </div>

            <div v-if="$slots.footer" class="shrink-0 px-6 py-4 border-t border-border bg-surface">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
