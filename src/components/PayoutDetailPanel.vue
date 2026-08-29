<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgPayout, fetchBranchPayout, type PayoutDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import { ChevronLeftIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
  orgId: string
  branchId?: string
  payoutId: string
  listRouteName: string
}>()

const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const detail = ref<PayoutDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    detail.value = isBranch.value ? await fetchBranchPayout(props.payoutId) : await fetchOrgPayout(props.payoutId)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
})

const listTo = computed(() =>
  props.branchId
    ? { name: props.listRouteName, params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: props.listRouteName, params: { orgId: props.orgId } },
)

function statusClass(s: string) {
  const v = (s || '').toLowerCase()
  if (['completed', 'success', 'successful', 'settled'].includes(v)) return 'bg-success-muted text-success'
  if (['failed', 'cancelled', 'canceled', 'rejected', 'error', 'reversed'].includes(v)) return 'bg-error-muted text-error'
  return 'bg-warning-muted text-warning'
}
function statusLabel(s: string) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function methodLabel(t?: string) {
  switch (t) {
    case 'BANK_ACCOUNT': return 'Bank account'
    case 'PAYBILL': return 'Paybill'
    case 'TILL_NUMBER': return 'Till number'
    default: return 'Mobile money'
  }
}

const copied = ref(false)
function copyRef() {
  if (!detail.value?.reference) return
  navigator.clipboard?.writeText(detail.value.reference)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const prettyMeta = computed(() => {
  const m = detail.value?.metadata
  if (!m || !Object.keys(m).length) return null
  try { return JSON.stringify(m, null, 2) } catch { return null }
})

const rows = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: 'Amount', value: `KES ${formatMoney(d.amount_cents)}` },
    { label: 'Fee', value: `KES ${formatMoney(d.fee_cents)}` },
    { label: 'Total debited', value: `KES ${formatMoney(d.total_cents)}` },
    { label: 'Currency', value: d.currency || 'KES' },
    { label: 'Method', value: methodLabel(d.destination_type) },
    { label: 'Provider', value: d.provider || '—' },
    { label: 'Attempts', value: String(d.attempts ?? 0) },
    { label: 'M-Pesa transaction', value: d.mpesa_transaction_id || '—' },
    { label: 'Bank reference', value: d.bank_reference_id || '—' },
    { label: 'Requested', value: fmtDate(d.created_at) },
    { label: 'Last updated', value: fmtDate(d.updated_at) },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink :to="listTo" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Payouts
    </RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading payout…</p>

    <template v-else-if="detail">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Payout details</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">− KES {{ formatMoney(detail.amount_cents) }}</h1>
          <div v-if="detail.reference" class="flex items-center gap-2 mt-1.5">
            <span class="font-mono text-sm text-text-secondary">{{ detail.reference }}</span>
            <button class="text-text-muted hover:text-primary" @click="copyRef">
              <CheckIcon v-if="copied" class="w-3.5 h-3.5 text-success" />
              <CopyIcon v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <span class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" :class="statusClass(detail.status)">{{ statusLabel(detail.status) }}</span>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Recipient</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">Name</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ detail.recipient_name || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">Destination</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ detail.recipient_info }}</dd>
          </div>
        </dl>
        <div v-if="detail.failure_reason" class="mt-4 pt-4 border-t border-border">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Failure reason</p>
          <p class="text-sm text-error">{{ detail.failure_reason }}</p>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Overview</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div v-for="r in rows" :key="r.label" class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ r.value }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard v-if="prettyMeta" padding="none">
        <p class="text-sm font-bold text-text-primary px-5 pt-5 mb-2">Metadata</p>
        <pre class="text-xs bg-surface-2 rounded-b-xl px-5 py-4 overflow-x-auto">{{ prettyMeta }}</pre>
      </AppCard>
    </template>
  </div>
</template>
