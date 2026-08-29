<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { AlertTriangleIcon, HelpCircleIcon } from 'lucide-vue-next'

const { state, handleConfirm, handleCancel } = useConfirmModal()

const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel() }
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
        @click.self="handleCancel"
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
                  state.danger ? 'bg-error-light text-error-text' : 'bg-primary-muted text-primary',
                ]"
              >
                <AlertTriangleIcon v-if="state.danger" class="w-5 h-5" />
                <HelpCircleIcon v-else class="w-5 h-5" />
              </div>
              <div class="min-w-0 pt-1">
                <h2 class="text-sm font-bold text-text-primary">{{ state.title }}</h2>
              </div>
            </div>

            <div class="px-6 pb-6 pt-2">
              <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ state.message }}</p>
            </div>

            <div class="px-6 pb-6 flex gap-3">
              <button
                type="button"
                class="flex-1 px-5 py-2.5 bg-surface-2 text-text-secondary text-sm font-bold rounded-xl hover:bg-border transition"
                @click="handleCancel"
              >
                {{ state.cancelLabel }}
              </button>
              <button
                type="button"
                :class="[
                  'flex-1 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition',
                  state.danger ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-dark',
                ]"
                @click="handleConfirm"
              >
                {{ state.confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
