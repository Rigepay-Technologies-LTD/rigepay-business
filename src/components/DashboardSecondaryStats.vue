<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatMoney } from '@/lib/format'
import AppCard from '@/components/ui/AppCard.vue'
import type { AnalyticsDetail, FinancialAccounts } from '@/lib/orgApi'

const props = defineProps<{
  analyticsFetcher: () => Promise<AnalyticsDetail>
  accountsFetcher: () => Promise<FinancialAccounts>
}>()

const analytics = ref<AnalyticsDetail | null>(null)
const accounts = ref<FinancialAccounts | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [a, w] = await Promise.allSettled([props.analyticsFetcher(), props.accountsFetcher()])
    if (a.status === 'fulfilled') analytics.value = a.value
    if (w.status === 'fulfilled') accounts.value = w.value
  } finally {
    loading.value = false
  }
})

function pct(cur: number, prev: number): { v: string; dir: 'up' | 'down' | 'flat' } {
  if (!prev && !cur) return { v: '0%', dir: 'flat' }
  if (!prev) return { v: '+100%', dir: 'up' }
  const d = ((cur - prev) / prev) * 100
  return { v: `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' }
}

const quickStats = computed(() => {
  if (!analytics.value) return []
  const t = analytics.value.totals
  const p = analytics.value.prior_period.totals
  return [
    { label: 'Transactions', value: String(t.txn_count), delta: pct(t.txn_count, p.txn_count) },
    { label: 'Success rate', value: `${t.success_rate.toFixed(1)}%`, delta: pct(t.success_rate, p.success_rate) },
    { label: 'Volume', value: `KES ${formatMoney(t.volume_cents)}`, delta: pct(t.volume_cents, p.volume_cents) },
    { label: 'Fees paid', value: `KES ${formatMoney(t.fees_cents)}`, delta: pct(t.fees_cents, p.fees_cents) },
  ]
})

const WALLET_LABELS: Record<string, string> = {
  MAIN: 'Main wallet',
  ESCROW: 'Escrow wallet',
  CHARGEBACK: 'Chargeback hold',
  MARKETPLACE_ESCROW: 'Marketplace escrow',
}

const walletDistribution = computed(() => {
  if (!accounts.value?.groups?.length) return []
  const total = accounts.value.groups.reduce((s, g) => s + g.balance_cents, 0)
  if (total <= 0) return []
  return accounts.value.groups
    .filter((g) => g.balance_cents > 0)
    .map((g) => ({
      label: WALLET_LABELS[g.type] ?? g.type,
      cents: g.balance_cents,
      share: Math.round((g.balance_cents / total) * 100),
    }))
    .sort((a, b) => b.cents - a.cents)
})
</script>

<template>
  <div v-if="!loading && (quickStats.length || walletDistribution.length)" class="grid gap-4 lg:grid-cols-3">
    <AppCard v-if="quickStats.length" class="lg:col-span-2">
      <h2 class="text-sm font-bold text-text-primary mb-4">Quick stats</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="s in quickStats" :key="s.label">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{{ s.label }}</p>
          <p class="text-lg font-bold text-text-primary">{{ s.value }}</p>
          <p class="text-xs mt-0.5" :class="s.delta.dir === 'up' ? 'text-success' : s.delta.dir === 'down' ? 'text-error' : 'text-text-muted'">
            {{ s.delta.v }} <span class="text-text-muted">vs prev period</span>
          </p>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="walletDistribution.length">
      <h2 class="text-sm font-bold text-text-primary mb-4">Wallet distribution</h2>
      <div class="flex flex-col gap-3">
        <div v-for="w in walletDistribution" :key="w.label">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-medium text-text-primary">{{ w.label }}</span>
            <span class="text-text-muted">{{ w.share }}% · KES {{ formatMoney(w.cents) }}</span>
          </div>
          <div class="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div class="h-full rounded-full bg-primary" :style="{ width: w.share + '%' }" />
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
