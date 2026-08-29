<script setup lang="ts">
import { computed } from 'vue'
import { WalletIcon, ArrowDownLeftIcon, ArrowUpRightIcon, CalendarClockIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-vue-next'
import { formatMoney } from '@/lib/format'
import type { DashboardKpis, KpiMetric } from '@/lib/orgApi'

const props = defineProps<{
  kpis: DashboardKpis | null
  loading?: boolean
  settlementHint?: string
}>()

function deltaText(m: KpiMetric): string {
  const pct = Math.abs(m.delta_pct)
  return `${pct >= 100 ? '100+' : pct.toFixed(1)}%`
}

const cards = computed(() => {
  const k = props.kpis
  return [
    {
      key: 'balance',
      label: 'Available balance',
      icon: WalletIcon,
      tone: 'primary' as const,
      value: k ? `KES ${formatMoney(k.available_balance_cents)}` : '—',
      delta: null as KpiMetric | null,
      caption: 'Main wallet',
    },
    {
      key: 'collections',
      label: "Today's collections",
      icon: ArrowDownLeftIcon,
      tone: 'success' as const,
      value: k ? `KES ${formatMoney(k.todays_collections.cents)}` : '—',
      delta: k?.todays_collections ?? null,
      caption: 'vs yesterday',
    },
    {
      key: 'payouts',
      label: "Today's payouts",
      icon: ArrowUpRightIcon,
      tone: 'warning' as const,
      value: k ? `KES ${formatMoney(k.todays_payouts.cents)}` : '—',
      delta: k?.todays_payouts ?? null,
      caption: 'vs yesterday',
    },
    {
      key: 'settlement',
      label: 'Settlement due',
      icon: CalendarClockIcon,
      tone: 'info' as const,
      value: k ? `KES ${formatMoney(k.settlement_due_cents)}` : '—',
      delta: null as KpiMetric | null,
      caption: k && k.settlement_due_cents > 0 ? 'Held on high-risk rails' : (props.settlementHint ?? 'Nothing pending'),
    },
  ]
})

const toneClass: Record<string, string> = {
  primary: 'bg-primary-muted text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
}
</script>

<template>
  <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <div
      v-for="card in cards"
      :key="card.key"
      class="rounded-xl bg-surface border border-border shadow-sm p-5 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ card.label }}</span>
        <span :class="['w-9 h-9 rounded-xl flex items-center justify-center', toneClass[card.tone]]">
          <component :is="card.icon" class="w-4.5 h-4.5" />
        </span>
      </div>

      <p
        class="text-2xl font-bold text-text-primary tracking-tight truncate"
        :class="{ 'animate-pulse text-text-muted': loading && !kpis }"
      >
        {{ loading && !kpis ? 'KES •••' : card.value }}
      </p>

      <div class="flex items-center gap-1.5 text-xs">
        <span
          v-if="card.delta && card.delta.delta_dir !== 'flat'"
          :class="[
            'inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-md',
            card.delta.delta_dir === 'up' ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text',
          ]"
        >
          <TrendingUpIcon v-if="card.delta.delta_dir === 'up'" class="w-3 h-3" />
          <TrendingDownIcon v-else class="w-3 h-3" />
          {{ deltaText(card.delta) }}
        </span>
        <span v-else-if="card.delta" class="inline-flex items-center font-semibold px-1.5 py-0.5 rounded-md bg-surface-2 text-text-muted">
          0.0%
        </span>
        <span class="text-text-muted">{{ card.caption }}</span>
      </div>
    </div>
  </section>
</template>
