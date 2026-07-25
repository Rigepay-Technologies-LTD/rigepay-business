<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsDetail } from '@/lib/orgApi'
import { formatMoney } from '@/lib/format'
import AppCard from '@/components/ui/AppCard.vue'
import AppStat from '@/components/ui/AppStat.vue'
import { WalletIcon, BanknoteIcon, ScaleIcon, PercentIcon, TagIcon } from 'lucide-vue-next'

const props = defineProps<{ data: AnalyticsDetail | null; loading: boolean }>()

function pctTrend(pct: number | null): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (pct === null || pct === undefined) return undefined
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, direction }
}

const statusRows = computed(() => {
  const rows = props.data?.status_breakdown ?? []
  return {
    collections: rows.filter((r) => r.direction === 'collection'),
    payouts: rows.filter((r) => r.direction === 'payout'),
  }
})

function statusColor(status: string): string {
  if (status === 'COMPLETED') return 'text-success'
  if (status === 'FAILED') return 'text-error'
  if (status === 'PENDING') return 'text-warning'
  return 'text-text-muted'
}

const maxRailAmount = computed(() => Math.max(1, ...(props.data?.rail_breakdown?.map((r) => r.amount_cents) ?? [1])))
const maxTagAmount = computed(() => Math.max(1, ...(props.data?.tag_breakdown?.map((r) => r.total_cents) ?? [1]), props.data?.untagged_spend?.total_cents ?? 1))
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="loading" class="text-sm text-text-muted">Loading analytics…</p>

    <template v-else-if="data">
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AppStat
          label="Collections" :value="`KES ${formatMoney(data.totals.collections_cents)}`"
          :sub="`${data.totals.collections_count} transaction${data.totals.collections_count === 1 ? '' : 's'}`"
          :trend="pctTrend(data.comparison.collections_change_pct)" icon-color="success"
        >
          <template #icon><WalletIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat
          label="Payouts" :value="`KES ${formatMoney(data.totals.payouts_cents)}`"
          :sub="`${data.totals.payouts_count} transaction${data.totals.payouts_count === 1 ? '' : 's'}`"
          :trend="pctTrend(data.comparison.payouts_change_pct)" icon-color="error"
        >
          <template #icon><BanknoteIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat
          label="Net" :value="`KES ${formatMoney(data.totals.net_cents)}`"
          sub="Collections minus payouts"
          :trend="pctTrend(data.comparison.net_change_pct)" :icon-color="data.totals.net_cents >= 0 ? 'primary' : 'warning'"
        >
          <template #icon><ScaleIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat
          label="Platform fees" :value="`KES ${formatMoney(data.totals.fees_cents)}`"
          sub="Fees on completed collections" icon-color="info"
        >
          <template #icon><PercentIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
      </section>

      <section class="grid grid-cols-2 gap-4">
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Avg. collection size</p>
          <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(data.totals.avg_collection_cents) }}</p>
        </AppCard>
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Avg. payout size</p>
          <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(data.totals.avg_payout_cents) }}</p>
        </AppCard>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AppCard>
          <h3 class="text-sm font-bold text-text-primary mb-1">Collections by rail</h3>
          <p class="text-xs text-text-muted mb-4">Which payment channels brought money in this period.</p>
          <p v-if="!(data.rail_breakdown ?? []).length" class="text-sm text-text-muted">No collections in this period.</p>
          <div v-else class="flex flex-col gap-3">
            <div v-for="r in data.rail_breakdown ?? []" :key="r.rail" class="flex flex-col gap-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-text-primary">{{ r.rail }}</span>
                <span class="text-text-muted">KES {{ formatMoney(r.amount_cents) }} · {{ r.count }} txn{{ r.count === 1 ? '' : 's' }}</span>
              </div>
              <div class="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${(r.amount_cents / maxRailAmount) * 100}%` }" />
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard>
          <h3 class="text-sm font-bold text-text-primary mb-1">Transaction outcomes</h3>
          <p class="text-xs text-text-muted mb-4">Completed vs failed vs pending — not just the successful ones.</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Collections</p>
              <div v-if="!statusRows.collections.length" class="text-xs text-text-muted">None</div>
              <div v-for="s in statusRows.collections" :key="s.status" class="flex items-center justify-between text-xs py-1">
                <span :class="['font-semibold', statusColor(s.status)]">{{ s.status }}</span>
                <span class="text-text-secondary">{{ s.count }} · KES {{ formatMoney(s.amount_cents) }}</span>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Payouts</p>
              <div v-if="!statusRows.payouts.length" class="text-xs text-text-muted">None</div>
              <div v-for="s in statusRows.payouts" :key="s.status" class="flex items-center justify-between text-xs py-1">
                <span :class="['font-semibold', statusColor(s.status)]">{{ s.status }}</span>
                <span class="text-text-secondary">{{ s.count }} · KES {{ formatMoney(s.amount_cents) }}</span>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard v-if="(data.tag_breakdown && data.tag_breakdown.length) || data.untagged_spend.total_cents > 0">
        <div class="flex items-center gap-2 mb-1">
          <TagIcon class="w-4 h-4 text-text-muted" />
          <h3 class="text-sm font-bold text-text-primary">Spend by tag</h3>
        </div>
        <p class="text-xs text-text-muted mb-4">Payouts and expenses tagged in this period.</p>
        <div class="flex flex-col gap-3">
          <div v-for="t in data.tag_breakdown ?? []" :key="t.tag_id" class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-text-primary flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: t.tag_color || '#94a3b8' }" />
                {{ t.tag_name }}
              </span>
              <span class="text-text-muted">KES {{ formatMoney(t.total_cents) }} · {{ t.count }}</span>
            </div>
            <div class="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: `${(t.total_cents / maxTagAmount) * 100}%`, backgroundColor: t.tag_color || '#94a3b8' }" />
            </div>
          </div>
          <div v-if="data.untagged_spend.total_cents > 0" class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-text-muted">Untagged</span>
              <span class="text-text-muted">KES {{ formatMoney(data.untagged_spend.total_cents) }} · {{ data.untagged_spend.count }}</span>
            </div>
            <div class="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full bg-text-muted/50" :style="{ width: `${(data.untagged_spend.total_cents / maxTagAmount) * 100}%` }" />
            </div>
          </div>
        </div>
      </AppCard>
    </template>
  </div>
</template>
