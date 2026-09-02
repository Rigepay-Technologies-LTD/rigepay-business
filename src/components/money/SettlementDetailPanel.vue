<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSettlementDetail, type SettlementDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ChevronLeftIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; settlementId: string; listRouteName: string }>()
const router = useRouter()
const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const s = ref<SettlementDetail | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    s.value = await fetchSettlementDetail(props.settlementId, isBranch.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function goBack() {
  router.push({
    name: props.listRouteName,
    params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId },
  })
}

function fmtDateTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString() : '—'
}
function statusVariant(v?: string): 'success' | 'warning' | 'error' | 'neutral' {
  const x = (v || '').toUpperCase()
  if (x === 'COMPLETED' || x === 'SETTLED' || x === 'SUCCESS') return 'success'
  if (x === 'PENDING' || x === 'PROCESSING') return 'warning'
  if (x === 'FAILED' || x === 'REVERSED') return 'error'
  return 'neutral'
}
function itemStatusVariant(v?: string): 'success' | 'warning' | 'error' | 'neutral' {
  const x = (v || '').toUpperCase()
  if (x === 'COMPLETED' || x === 'SUCCESS') return 'success'
  if (x === 'PENDING') return 'warning'
  if (x === 'FAILED') return 'error'
  return 'neutral'
}

const headerRows = computed(() => {
  if (!s.value) return []
  const d = s.value
  return [
    { label: 'Settlement ID', value: d.settlement_id },
    { label: 'Transfer transaction ID', value: d.transaction_id },
    { label: 'Ledger txn ID', value: d.ledger_txn_id },
    { label: 'Reference', value: d.reference || '—' },
    { label: 'Provider reference', value: d.external_txn_id || '—' },
    { label: 'Rail', value: d.rail || '—' },
    { label: 'Source', value: d.source || '—' },
    { label: 'Currency', value: d.currency },
    { label: 'Transfer status', value: d.status || '—' },
    { label: 'Settlement status', value: d.settlement_status || '—' },
    { label: 'Escrow settlement', value: d.is_escrow ? 'Yes' : 'No' },
    { label: 'Scope', value: d.scope },
    { label: 'Destination wallet', value: `${d.wallet_name || d.wallet_id} (${d.wallet_type || '—'})` },
    { label: 'Destination wallet ID', value: d.wallet_id },
    { label: 'Settled at', value: fmtDateTime(d.settled_at) },
    { label: 'Last updated', value: fmtDateTime(d.updated_at) },
    { label: 'Description', value: d.description || '—' },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Settlements
    </button>

    <p v-if="loading" class="text-sm text-text-muted">Loading settlement…</p>

    <template v-else-if="s">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Settlement</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ s.reference || s.settlement_id }}</h1>
          <p class="text-2xl font-bold text-success tracking-tight mt-1">KES {{ formatMoney(s.net_cents) }} <span class="text-sm font-medium text-text-muted">net</span></p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <AppBadge :variant="statusVariant(s.status)" size="sm">{{ s.status || '—' }}</AppBadge>
          <AppBadge :variant="statusVariant(s.settlement_status)" size="sm">{{ s.settlement_status || '—' }}</AppBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Gross</p>
          <p class="text-base font-bold text-text-primary">KES {{ formatMoney(s.gross_cents) }}</p>
        </AppCard>
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Fees</p>
          <p class="text-base font-bold text-error">KES {{ formatMoney(s.fees_cents) }}</p>
        </AppCard>
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Refunds / reversals</p>
          <p class="text-base font-bold text-error">KES {{ formatMoney(s.refunds_cents) }}</p>
        </AppCard>
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Transfer fee</p>
          <p class="text-base font-bold text-text-primary">KES {{ formatMoney(s.transfer_fee_cents) }}</p>
        </AppCard>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-3">Settlement transfer</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          <div v-for="row in headerRows" :key="row.label" class="flex flex-col">
            <dt class="text-[10px] font-bold uppercase tracking-widest text-text-muted">{{ row.label }}</dt>
            <dd class="text-sm text-text-primary break-all">{{ row.value }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard padding="none">
        <div class="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">Settled items</h2>
          <span class="text-xs text-text-muted">{{ s.item_count }} transaction(s)</span>
        </div>
        <p v-if="!s.items?.length" class="text-sm text-text-muted px-5 pb-5">
          No individual transactions are linked to this settlement (older or aggregate settlement).
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-y border-border">
                <th class="px-5 py-2.5">Date</th>
                <th class="px-5 py-2.5">Type</th>
                <th class="px-5 py-2.5">Reference</th>
                <th class="px-5 py-2.5">Provider ref</th>
                <th class="px-5 py-2.5">Rail</th>
                <th class="px-5 py-2.5">Customer</th>
                <th class="px-5 py-2.5">Description</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5">Settlement</th>
                <th class="px-5 py-2.5 text-right">Fee</th>
                <th class="px-5 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in s.items" :key="it.transaction_id" class="border-b border-border last:border-0">
                <td class="px-5 py-2.5 text-text-muted whitespace-nowrap">{{ fmtDateTime(it.created_at) }}</td>
                <td class="px-5 py-2.5 text-text-secondary">{{ it.type }}</td>
                <td class="px-5 py-2.5 text-text-primary">{{ it.reference || '—' }}</td>
                <td class="px-5 py-2.5 text-text-muted">{{ it.external_txn_id || '—' }}</td>
                <td class="px-5 py-2.5 text-text-muted">{{ it.rail || '—' }}</td>
                <td class="px-5 py-2.5 text-text-secondary">{{ it.customer_name || it.customer_phone || it.customer_ref || '—' }}</td>
                <td class="px-5 py-2.5 text-text-muted max-w-40 truncate">{{ it.description || '—' }}</td>
                <td class="px-5 py-2.5"><AppBadge :variant="itemStatusVariant(it.status)" size="sm">{{ it.status || '—' }}</AppBadge></td>
                <td class="px-5 py-2.5 text-text-muted">{{ it.settlement_status || '—' }}</td>
                <td class="px-5 py-2.5 text-right text-text-muted whitespace-nowrap">{{ it.fee_cents ? formatMoney(it.fee_cents) : '—' }}</td>
                <td class="px-5 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">{{ it.currency }} {{ formatMoney(it.amount_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>
  </div>
</template>
