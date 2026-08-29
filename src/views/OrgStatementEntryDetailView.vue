<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchStatementEntry, type StatementEntryDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ChevronLeftIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; entryId: string }>()
const route = useRoute()
const router = useRouter()
const { showError } = useResponseModal()

const entry = ref<StatementEntryDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    entry.value = await fetchStatementEntry(props.entryId, {
      scope: (route.query.scope as string) || undefined,
      branch_id: (route.query.branch_id as string) || undefined,
    })
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
})

function statusClass(s?: string) {
  const v = (s || '').toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'SUCCESSFUL', 'SETTLED'].includes(v)) return 'bg-success-muted text-success'
  if (['FAILED', 'CANCELLED', 'ERROR', 'REVERSED'].includes(v)) return 'bg-error-muted text-error'
  return 'bg-warning-muted text-warning'
}

const rows = computed(() => {
  const e = entry.value
  if (!e) return [] as { label: string; value: string; mono?: boolean }[]
  const list: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Direction', value: e.direction === 'IN' ? 'Money in' : 'Money out' },
    { label: 'Amount', value: `KES ${formatMoney(e.amount_cents)}` },
    { label: 'Fee', value: e.fee_cents ? `KES ${formatMoney(e.fee_cents)}` : '—' },
    { label: 'Currency', value: e.currency || 'KES' },
    { label: 'Wallet', value: `${e.wallet_type} · ${e.wallet_name}` },
    { label: 'Ledger entry ID', value: String(e.id), mono: true },
    { label: 'Ledger transaction', value: e.ledger_txn_id, mono: true },
    { label: 'Posted', value: formatDate(e.created_at) },
  ]
  if (e.transaction_id) {
    list.push(
      { label: 'Transaction type', value: e.txn_type || '—' },
      { label: 'Transaction status', value: e.status || '—' },
      { label: 'Rail', value: e.rail || '—' },
      { label: 'Reference', value: e.reference || '—', mono: true },
      { label: 'Provider reference', value: e.provider_ref || '—', mono: true },
      { label: 'Settlement status', value: e.settlement_status || '—' },
      { label: 'Customer', value: e.customer_name || e.customer_phone || '—' },
      { label: 'Transaction ID', value: e.transaction_id, mono: true },
    )
  }
  return list
})

function openTransaction() {
  if (!entry.value?.transaction_id) return
  router.push({ name: 'org-transaction-detail', params: { orgId: props.orgId, txnId: entry.value.transaction_id } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Statement entry">
    <div class="flex flex-col gap-6 max-w-3xl">
      <RouterLink :to="{ name: 'org-statements', params: { orgId: props.orgId } }" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary">
        <ChevronLeftIcon class="w-3.5 h-3.5" /> Statements
      </RouterLink>

      <p v-if="loading" class="text-sm text-text-muted">Loading entry…</p>

      <template v-else-if="entry">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Statement entry</p>
            <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ entry.description || entry.txn_type || 'Ledger movement' }}</h1>
            <p class="text-2xl font-bold tracking-tight mt-1" :class="entry.direction === 'IN' ? 'text-success' : 'text-text-primary'">
              {{ entry.direction === 'IN' ? '+' : '−' }} KES {{ formatMoney(entry.amount_cents) }}
            </p>
          </div>
          <span v-if="entry.status" class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" :class="statusClass(entry.status)">{{ entry.status }}</span>
        </div>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-4">Details</h2>
          <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div v-for="r in rows" :key="r.label" class="flex justify-between gap-4">
              <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
              <dd class="font-medium text-text-primary text-right break-all" :class="r.mono ? 'font-mono text-xs' : ''">{{ r.value }}</dd>
            </div>
          </dl>
          <div v-if="entry.transaction_id" class="mt-4 pt-4 border-t border-border">
            <button type="button" class="text-xs font-semibold text-primary hover:underline" @click="openTransaction">Open full transaction →</button>
          </div>
        </AppCard>
      </template>

      <AppCard v-else class="py-12 text-center">
        <p class="text-sm text-text-muted">This statement entry could not be found.</p>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
