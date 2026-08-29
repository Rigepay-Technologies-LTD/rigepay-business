<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MoreHorizontalIcon, RefreshCwIcon } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { QuickAction } from '@/components/QuickActions.vue'

const props = withDefaults(defineProps<{
  greeting: string
  name?: string | null
  subtitle?: string
  statusLabel?: string
  statusVariant?: 'success' | 'warning' | 'error' | 'neutral'
  actions: QuickAction[]
  inlineCount?: number
  refreshing?: boolean
}>(), { inlineCount: 3, statusVariant: 'success' })

const emit = defineEmits<{ (e: 'refresh'): void }>()

const router = useRouter()
const menuOpen = ref(false)

const inlineActions = computed(() => props.actions.slice(0, props.inlineCount))
const overflowActions = computed(() => props.actions.slice(props.inlineCount))

function go(a: QuickAction) {
  menuOpen.value = false
  router.push(a.to)
}
</script>

<template>
  <div class="rounded-xl bg-surface border border-border shadow-sm p-6">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
      <div class="min-w-0">
        <AppBadge v-if="statusLabel" :variant="statusVariant" size="sm" class="mb-2">{{ statusLabel }}</AppBadge>
        <h1 class="text-2xl font-bold text-text-primary tracking-tight">
          {{ greeting }}<template v-if="name">, {{ name }}</template>
        </h1>
        <p class="text-sm text-text-muted mt-1">{{ subtitle ?? "Here's your business summary for today." }}</p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          v-for="(a, i) in inlineActions"
          :key="a.label"
          type="button"
          class="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
          :class="i === 0
            ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
            : 'bg-surface-2 text-text-primary hover:bg-border'"
          @click="go(a)"
        >
          <component :is="a.icon" class="w-4 h-4" />
          {{ a.label }}
        </button>

        <div v-if="overflowActions.length" class="relative">
          <button
            type="button"
            class="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-surface-2 text-text-secondary hover:bg-border transition-colors"
            @click="menuOpen = !menuOpen"
          >
            <MoreHorizontalIcon class="w-4.5 h-4.5" />
          </button>
          <div v-if="menuOpen" class="fixed inset-0 z-10" @click="menuOpen = false" />
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-md ring-1 ring-border z-20 py-2"
          >
            <button
              v-for="a in overflowActions"
              :key="a.label"
              type="button"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              @click="go(a)"
            >
              <component :is="a.icon" class="w-4 h-4 text-text-muted" />
              {{ a.label }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center h-10 w-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          title="Refresh"
          @click="emit('refresh')"
        >
          <RefreshCwIcon class="w-4 h-4" :class="{ 'animate-spin': refreshing }" />
        </button>
      </div>
    </div>
  </div>
</template>
