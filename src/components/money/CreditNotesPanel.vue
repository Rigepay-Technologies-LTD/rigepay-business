<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { createOrgRefund, type CreditNoteList, type CreditNoteQuery } from '@/lib/orgApi'
import { PlusIcon, RotateCcwIcon } from 'lucide-vue-next'

const props = defineProps<{
  kind: 'refunds' | 'reversals'
  fetcher: (params: CreditNoteQuery) => Promise<CreditNoteList>
  isBranch?: boolean
}>()

const { showError, showSuccess } = useResponseModal()

function monthStart(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

const from = ref(monthStart(-2))
const to = ref(new Date().toISOString().slice(0, 10))
const search = ref('')
const status = ref('')
const page = ref(1)
const list = ref<CreditNoteList | null>(null)
const loading = ref(false)

const noun = computed(() => (props.kind === 'refunds' ? 'refund' : 'reversal'))
const canCreate = computed(() => props.kind === 'refunds')

function params(): CreditNoteQuery {
  const p: CreditNoteQuery = { from: from.value, to: to.value, page: page.value, page_size: 50 }
  if (search.value.trim()) p.search = search.value.trim()
  if (status.value) p.status = status.value
  return p
}

async function load() {
  loading.value = true
  try {
    list.value = await props.fetcher(params())
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

function apply() {
  page.value = 1
  load()
}

const totalPages = computed(() => (list.value ? Math.max(1, Math.ceil(list.value.total / list.value.page_size)) : 1))

async function changePage(delta: number) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  await load()
}

onMounted(load)

const showCreate = ref(false)
const cTxnId = ref('')
const cAmountKes = ref('')
const cReason = ref('')
const creating = ref(false)
const createError = ref<string | null>(null)

function openCreate() {
  cTxnId.value = ''
  cAmountKes.value = ''
  cReason.value = ''
  createError.value = null
  showCreate.value = true
}

async function submitRefund() {
  createError.value = null
  if (!cTxnId.value.trim()) { createError.value = 'Enter the original transaction ID.'; return }
  if (!cReason.value.trim()) { createError.value = 'A refund reason is required.'; return }
  const amountCents = cAmountKes.value.trim() ? Math.round(Number(cAmountKes.value) * 100) : undefined
  if (amountCents !== undefined && (!Number.isFinite(amountCents) || amountCents <= 0)) {
    createError.value = 'Enter a valid amount, or leave blank to refund in full.'
    return
  }
  creating.value = true
  try {
    await createOrgRefund(
      { transaction_id: cTxnId.value.trim(), amount_cents: amountCents, reason: cReason.value.trim() },
      props.isBranch,
    )
    showSuccess('Refund initiated. It will move to Completed once the provider confirms the reversal.')
    showCreate.value = false
    page.value = 1
    await load()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

function statusVariant(s: string): 'success' | 'error' | 'warning' | 'neutral' {
  if (s === 'COMPLETED') return 'success'
  if (s === 'FAILED') return 'error'
  if (s === 'PENDING') return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <AppCard>
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">From</label>
          <input v-model="from" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">To</label>
          <input v-model="to" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Status</label>
          <select v-model="status" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Search</label>
          <input v-model="search" type="text" placeholder="Reference, customer…" class="h-10 w-56 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" @keyup.enter="apply" />
        </div>
        <AppButton size="sm" variant="secondary" :loading="loading" @click="apply">Apply</AppButton>
        <div class="flex-1" />
        <AppButton v-if="canCreate" size="sm" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New refund
        </AppButton>
      </div>
    </AppCard>

    <div v-if="list" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{{ noun }}s</p>
        <p class="text-lg font-bold text-text-primary">{{ list.total }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total value</p>
        <p class="text-lg font-bold text-error">KES {{ formatMoney(list.total_amount_cents) }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Period</p>
        <p class="text-sm font-semibold text-text-secondary">{{ list.from.slice(0, 10) }} → {{ list.to.slice(0, 10) }}</p>
      </AppCard>
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-6">Loading {{ noun }}s…</p>
      <div v-else-if="!list || !list.rows.length" class="px-5 py-12 text-center">
        <RotateCcwIcon class="w-8 h-8 mx-auto text-text-muted/40" />
        <p class="text-sm text-text-muted mt-2">No {{ noun }}s in this period.</p>
        <AppButton v-if="canCreate" size="sm" class="mt-4" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New refund
        </AppButton>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-2.5">Date</th>
              <th class="px-5 py-2.5">Reference</th>
              <th class="px-5 py-2.5">Original</th>
              <th class="px-5 py-2.5">Rail</th>
              <th class="px-5 py-2.5">Customer</th>
              <th class="px-5 py-2.5">Status</th>
              <th class="px-5 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list.rows" :key="r.transaction_id" class="border-b border-border last:border-0">
              <td class="px-5 py-2.5 text-text-muted whitespace-nowrap">{{ new Date(r.created_at).toLocaleString() }}</td>
              <td class="px-5 py-2.5 font-medium text-text-primary">{{ r.reference || '—' }}</td>
              <td class="px-5 py-2.5 text-text-muted">{{ r.original_reference || '—' }}</td>
              <td class="px-5 py-2.5 text-text-muted">{{ r.rail || '—' }}</td>
              <td class="px-5 py-2.5 text-text-secondary">{{ r.customer_ref || '—' }}</td>
              <td class="px-5 py-2.5">
                <AppBadge :variant="statusVariant(r.status)" size="sm">{{ r.status || '—' }}</AppBadge>
              </td>
              <td class="px-5 py-2.5 text-right font-semibold text-error whitespace-nowrap">KES {{ formatMoney(r.amount_cents) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="list && list.total > list.page_size" class="flex items-center justify-between px-5 py-4 border-t border-border">
        <p class="text-xs text-text-muted">Page {{ list.page }} of {{ totalPages }} · {{ list.total }} {{ noun }}s</p>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="list.page <= 1" @click="changePage(-1)">Previous</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="list.page >= totalPages" @click="changePage(1)">Next</AppButton>
        </div>
      </div>
    </AppCard>

    <AppModal v-if="canCreate" v-model="showCreate" title="New refund" size="md">
      <div class="flex flex-col gap-4">
        <p class="text-xs text-text-muted">
          Refunds the customer on the original payment rail (M-Pesa). Only completed M-Pesa collections within
          24 hours can be refunded. Leave the amount blank to refund in full.
        </p>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</div>
        <AppInput v-model="cTxnId" label="Original transaction ID" placeholder="UUID of the collection" required />
        <AppInput v-model="cAmountKes" type="number" label="Amount (KES) — blank for full refund" placeholder="Full amount" />
        <AppInput v-model="cReason" label="Reason" placeholder="Why is this being refunded?" required />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="showCreate = false">Cancel</AppButton>
          <AppButton :loading="creating" @click="submitRefund">Initiate refund</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
