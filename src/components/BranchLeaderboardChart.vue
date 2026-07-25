<script setup lang="ts">
import { computed } from 'vue'
import type { BranchAnalyticsRow } from '@/lib/orgApi'
import { formatMoney } from '@/lib/format'

const props = defineProps<{ rows: BranchAnalyticsRow[] }>()


const ranked = computed(() =>
  [...props.rows]
    .sort((a, b) => b.collections_cents - a.collections_cents)
    .slice(0, 6),
)

const maxValue = computed(() => Math.max(1, ...ranked.value.map((r) => r.collections_cents)))

function pct(cents: number): number {
  return Math.max(2, Math.round((cents / maxValue.value) * 100))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="r in ranked" :key="r.branch_id ?? r.branch_name" class="flex items-center gap-3">
      <span class="w-24 sm:w-32 shrink-0 text-xs font-medium text-text-secondary truncate" :title="r.branch_name">
        {{ r.branch_name }}
      </span>
      <div class="flex-1 h-5 rounded-md bg-surface-2 overflow-hidden">
        <div
          class="h-full rounded-md bg-primary transition-all duration-500"
          :style="{ width: pct(r.collections_cents) + '%' }"
          :title="`${r.branch_name} — KES ${formatMoney(r.collections_cents)} collected, ${r.collections_count} transaction${r.collections_count === 1 ? '' : 's'}`"
        />
      </div>
      <span class="w-20 sm:w-24 shrink-0 text-right text-xs font-semibold text-text-primary tabular-nums">
        KES {{ formatMoney(r.collections_cents) }}
      </span>
    </div>
    <p v-if="!ranked.length" class="text-sm text-text-muted">No branch activity yet this period.</p>
  </div>
</template>
