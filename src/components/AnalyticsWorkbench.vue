<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import type { AnalyticsDetail, AnalyticsRangeParams } from '@/lib/orgApi'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppStat from '@/components/ui/AppStat.vue'
import AnalyticsDetailPanel from '@/components/AnalyticsDetailPanel.vue'
import {
  RefreshCwIcon, ArrowDownLeftIcon, ArrowUpRightIcon, ScaleIcon, ActivityIcon,
  HashIcon, PercentIcon, CoinsIcon,
} from 'lucide-vue-next'

const props = defineProps<{
  fetcher: (params: AnalyticsRangeParams) => Promise<AnalyticsDetail>
}>()

const { showError } = useResponseModal()

function isoDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function isoToday() {
  return new Date().toISOString().slice(0, 10)
}
function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const from = ref(monthStart())
const to = ref(isoToday())
const loading = ref(true)
const data = ref<AnalyticsDetail | null>(null)
const chartMode = ref<'in' | 'out' | 'volume'>('in')

const presets: { label: string; apply: () => void }[] = [
  { label: 'Today', apply: () => { from.value = isoToday(); to.value = isoToday() } },
  { label: 'Last 7 days', apply: () => { from.value = isoDaysAgo(6); to.value = isoToday() } },
  { label: 'This month', apply: () => { from.value = monthStart(); to.value = isoToday() } },
  { label: 'Last 90 days', apply: () => { from.value = isoDaysAgo(89); to.value = isoToday() } },
]

async function load() {
  loading.value = true
  try {
    data.value = await props.fetcher({ from: from.value, to: to.value })
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function applyPreset(p: { apply: () => void }) {
  p.apply()
  load()
}

function pctTrend(pct: number | null | undefined): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (pct === null || pct === undefined) return undefined
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, direction }
}

const t = computed(() => data.value?.totals)
const prev = computed(() => data.value?.prior_period?.totals)

function delta(cur?: number, p?: number): number | null {
  if (cur === undefined || p === undefined) return null
  if (p === 0) return cur === 0 ? 0 : 100
  return ((cur - p) / p) * 100
}

const series = computed(() => data.value?.timeseries ?? [])
const chartMax = computed(() => Math.max(1, ...series.value.map((pt) => {
  return chartMode.value === 'in' ? pt.collections_cents : chartMode.value === 'out' ? pt.payouts_cents : pt.volume_cents
})))
function barValue(pt: { collections_cents: number; payouts_cents: number; volume_cents: number }) {
  return chartMode.value === 'in' ? pt.collections_cents : chartMode.value === 'out' ? pt.payouts_cents : pt.volume_cents
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppCard padding="sm">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">From</label>
          <input v-model="from" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">To</label>
          <input v-model="to" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <AppButton variant="primary" size="md" :loading="loading" @click="load">
          <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
          Refresh
        </AppButton>
        <div class="flex items-center gap-1.5 ml-auto">
          <button v-for="p in presets" :key="p.label" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 text-text-secondary hover:bg-border transition-colors" @click="applyPreset(p)">
            {{ p.label }}
          </button>
        </div>
      </div>
    </AppCard>

    <p v-if="loading" class="text-sm text-text-muted">Loading analytics…</p>

    <template v-else-if="t">
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AppStat label="Money in" :value="`KES ${formatMoney(t.collections_cents)}`" :sub="`${t.collections_count} txn`" :trend="pctTrend(delta(t.collections_cents, prev?.collections_cents))" icon-color="success">
          <template #icon><ArrowDownLeftIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Money out" :value="`KES ${formatMoney(t.payouts_cents)}`" :sub="`${t.payouts_count} txn`" :trend="pctTrend(delta(t.payouts_cents, prev?.payouts_cents))" icon-color="warning">
          <template #icon><ArrowUpRightIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Net flow" :value="`KES ${formatMoney(t.net_cents)}`" sub="In minus out" :trend="pctTrend(delta(t.net_cents, prev?.net_cents))" :icon-color="t.net_cents >= 0 ? 'primary' : 'error'">
          <template #icon><ScaleIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Volume" :value="`KES ${formatMoney(t.volume_cents)}`" sub="In + out" :trend="pctTrend(delta(t.volume_cents, prev?.volume_cents))" icon-color="info">
          <template #icon><ActivityIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Avg transaction" :value="`KES ${formatMoney(t.avg_txn_cents)}`" sub="Across all txns" icon-color="primary">
          <template #icon><CoinsIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Transactions" :value="String(t.txn_count)" sub="Completed in + out" :trend="pctTrend(delta(t.txn_count, prev?.txn_count))" icon-color="info">
          <template #icon><HashIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Success rate" :value="`${t.success_rate.toFixed(1)}%`" sub="Settled collections" :trend="pctTrend(delta(t.success_rate, prev?.success_rate))" icon-color="success">
          <template #icon><PercentIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat label="Fees paid" :value="`KES ${formatMoney(t.fees_cents)}`" sub="Platform fees" icon-color="warning">
          <template #icon><CoinsIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
      </section>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Trend</h2>
          <div class="inline-flex rounded-xl bg-surface-2 p-0.5">
            <button v-for="m in (['in', 'out', 'volume'] as const)" :key="m"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              :class="chartMode === m ? 'bg-surface text-primary shadow-sm' : 'text-text-muted'"
              @click="chartMode = m">
              {{ m === 'in' ? 'Money in' : m === 'out' ? 'Money out' : 'Volume' }}
            </button>
          </div>
        </div>
        <p v-if="!series.length" class="text-sm text-text-muted">No activity in this range.</p>
        <div v-else class="flex items-end gap-1 h-48 overflow-x-auto">
          <div v-for="pt in series" :key="pt.date" class="flex flex-col items-center gap-1 min-w-6 flex-1">
            <div class="w-full rounded-t transition-all"
              :class="chartMode === 'out' ? 'bg-warning/70' : chartMode === 'volume' ? 'bg-info/70' : 'bg-success/70'"
              :style="{ height: Math.max(3, (barValue(pt) / chartMax) * 176) + 'px' }"
              :title="`${pt.date}: KES ${formatMoney(barValue(pt))}`" />
            <span class="text-[9px] text-text-muted">{{ pt.date.slice(5) }}</span>
          </div>
        </div>
      </AppCard>

      <AnalyticsDetailPanel :data="data" :loading="false" />
    </template>
  </div>
</template>
