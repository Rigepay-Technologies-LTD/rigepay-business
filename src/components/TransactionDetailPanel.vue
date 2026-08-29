<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgTransaction, fetchBranchTransaction, type TransactionDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, txnReference } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import TagEditor from '@/components/TagEditor.vue'
import { ChevronLeftIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
  orgId: string
  branchId?: string
  txnId: string
  listRouteName: string
  refundsRouteName?: string
  reversalsRouteName?: string
}>()

const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const detail = ref<TransactionDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    detail.value = isBranch.value ? await fetchBranchTransaction(props.txnId) : await fetchOrgTransaction(props.txnId)
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

function scopedRoute(name?: string) {
  if (!name) return undefined
  return props.branchId
    ? { name, params: { orgId: props.orgId, branchId: props.branchId } }
    : { name, params: { orgId: props.orgId } }
}

function statusClass(s: string) {
  if (['SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(s)) return 'bg-success-muted text-success'
  if (['FAILED', 'CANCELLED', 'ERROR'].includes(s)) return 'bg-error-muted text-error'
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'bg-warning-muted text-warning'
  return 'bg-surface-2 text-text-muted'
}

const isInflow = computed(() =>
  detail.value ? /COLLECT|DEPOSIT|CREDIT|REFUND|REVERSAL|SETTLEMENT|FUNDS_SETTLED|INBOUND/i.test(detail.value.type) : false,
)

const copied = ref(false)
function copyRef() {
  if (!detail.value) return
  navigator.clipboard?.writeText(txnReference(detail.value))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const prettyMeta = computed(() => {
  if (!detail.value?.metadata || !Object.keys(detail.value.metadata).length) return null
  try { return JSON.stringify(detail.value.metadata, null, 2) } catch { return null }
})

const rows = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: 'Amount', value: `KES ${formatMoney(Math.abs(d.amountCents))}` },
    { label: 'Direction', value: isInflow.value ? 'Money in' : 'Money out' },
    { label: 'Fee', value: `KES ${formatMoney(d.feeCents)}` },
    { label: 'Rail', value: d.rail || '—' },
    { label: 'Currency', value: d.currency || 'KES' },
    { label: 'Settlement status', value: d.settlement_status || '—' },
    { label: 'Provider reference', value: d.externalTxnId || '—' },
    { label: 'Customer', value: d.customer_name || d.customer_phone || '—' },
    { label: 'Ledger transaction', value: d.ledgerTxnId },
    { label: 'Date', value: fmtDate(d.created_at) },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink :to="listTo" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Activity
    </RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading transaction…</p>

    <template v-else-if="detail">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Payment details</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ detail.type }}</h1>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="font-mono text-sm text-text-secondary">{{ txnReference(detail) }}</span>
            <button class="text-text-muted hover:text-primary" @click="copyRef">
              <CheckIcon v-if="copied" class="w-3.5 h-3.5 text-success" />
              <CopyIcon v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <span class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" :class="statusClass(detail.status)">{{ detail.status }}</span>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Overview</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div v-for="r in rows" :key="r.label" class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ r.value }}</dd>
          </div>
        </dl>
        <div v-if="detail.description" class="mt-4 pt-4 border-t border-border">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Description</p>
          <p class="text-sm text-text-primary">{{ detail.description }}</p>
        </div>
      </AppCard>

      <AppCard>
        <TagEditor subject-type="transaction" :subject-id="props.txnId" :is-branch="isBranch" />
      </AppCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-1">Refunds</h2>
          <p class="text-xs text-text-muted mb-3">Money returned to the customer for this payment.</p>
          <RouterLink v-if="scopedRoute(refundsRouteName)" :to="scopedRoute(refundsRouteName)!" class="text-xs font-semibold text-primary hover:underline">
            View refunds →
          </RouterLink>
          <p v-else class="text-xs text-text-muted">No refunds recorded.</p>
        </AppCard>
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-1">Reversals</h2>
          <p class="text-xs text-text-muted mb-3">Full or partial reversal of the original payment.</p>
          <RouterLink v-if="scopedRoute(reversalsRouteName)" :to="scopedRoute(reversalsRouteName)!" class="text-xs font-semibold text-primary hover:underline">
            View reversals →
          </RouterLink>
          <p v-else class="text-xs text-text-muted">No reversals recorded.</p>
        </AppCard>
      </div>

      <AppCard v-if="prettyMeta" padding="none">
        <p class="text-sm font-bold text-text-primary px-5 pt-5 mb-2">Payment request body</p>
        <pre class="text-xs bg-surface-2 rounded-b-xl px-5 py-4 overflow-x-auto">{{ prettyMeta }}</pre>
      </AppCard>
    </template>
  </div>
</template>
