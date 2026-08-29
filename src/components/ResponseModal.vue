<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useResponseModal } from '@/composables/useResponseModal'
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from 'lucide-vue-next'

const { state, close } = useResponseModal()

const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
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
        v-if="state.visible"
        class="fixed inset-0 z-9999 flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4"
        style="background: var(--color-overlay); backdrop-filter: blur(4px);"
        role="alertdialog"
        aria-modal="true"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-4 sm:translate-y-0 sm:scale-95"
          leave-active-class="transition-all duration-150 ease-in"
          leave-to-class="opacity-0 -translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="state.visible"
            class="relative w-full sm:max-w-md bg-surface shadow-2xl rounded-xl overflow-hidden"
          >
            <div class="flex items-start gap-3 px-6 pt-6 pb-2">
              <div
                :class="[
                  'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                  state.kind === 'error' ? 'bg-error-light text-error-text'
                    : state.kind === 'success' ? 'bg-success-light text-success-text'
                    : 'bg-primary-muted text-primary',
                ]"
              >
                <AlertTriangleIcon v-if="state.kind === 'error'" class="w-5 h-5" />
                <CheckCircle2Icon v-else-if="state.kind === 'success'" class="w-5 h-5" />
                <InfoIcon v-else class="w-5 h-5" />
              </div>
              <div class="min-w-0 pt-1">
                <h2 class="text-sm font-bold text-text-primary">{{ state.title }}</h2>
              </div>
            </div>

            <div class="px-6 pb-6 pt-2">
              <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ state.message }}</p>
            </div>

            <div class="px-6 pb-6">
              <button
                type="button"
                class="w-full px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition"
                @click="close"
              >
                OK
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
