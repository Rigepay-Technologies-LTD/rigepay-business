<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  estimateBulkInvoices, sendBulkInvoices, fetchInvoiceBatches, fetchInvoiceBatch,
  type BulkInvoiceRecipientInput, type BulkInvoiceEstimateResult, type InvoiceBatch, type InvoiceBatchItem,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, TrashIcon, FileTextIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'
import { useRecipientHistory } from '@/composables/useRecipientHistory'

const props = defineProps<{ isBranch?: boolean; branchId?: string }>()

const { showError, showSuccess } = useResponseModal()
const { recipients: recipientHistory, loadRecipientHistory } = useRecipientHistory(props.isBranch)

const loading = ref(true)
const batches = ref<InvoiceBatch[]>([])

async function load() {
  loading.value = true
  try {
    batches.value = (await fetchInvoiceBatches(props.isBranch)) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const summary = computed(() => {
  const sent = batches.value.reduce((n, b) => n + (b.sent_count || 0), 0)
  const billed = batches.value.reduce((n, b) => n + (b.actual_cost_cents || b.estimated_cost_cents || 0), 0)
  return { batches: batches.value.length, sent, billed }
})

interface EditableRow {
  key: number
  email: string
  phone: string
  name: string
  amount_kes: string
  due_date: string
  description: string
  tax_category: string
}

const TAX_CATEGORY_OPTIONS = [
  { value: 'EXEMPT', label: 'Exempt (no VAT)' },
  { value: 'A', label: 'Taxable (16% VAT)' },
]

let nextRowKey = 1
function blankRow(): EditableRow {
  return { key: nextRowKey++, email: '', phone: '', name: '', amount_kes: '', due_date: '', description: '', tax_category: 'EXEMPT' }
}

const rows = ref<EditableRow[]>([blankRow(), blankRow()])
function addRow() { rows.value.push(blankRow()) }
function removeRow(key: number) { rows.value = rows.value.filter((r) => r.key !== key) }
function resetRows() { nextRowKey = 1; rows.value = [blankRow(), blankRow()] }

function pickRecipient(row: EditableRow) {
  const match = recipientHistory.value.find((r) => r.email === row.email.trim())
  if (match && match.name && !row.name.trim()) row.name = match.name
}

const filledRowCount = computed(() => rows.value.filter((r) => r.email.trim() && Number(r.amount_kes) > 0).length)
const formError = ref<string | null>(null)

function buildRecipients(): BulkInvoiceRecipientInput[] | null {
  const recipients: BulkInvoiceRecipientInput[] = []
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    if (!r.email.trim() && !r.amount_kes) continue
    const amountCents = Math.round(Number(r.amount_kes) * 100)
    if (!amountCents || amountCents < 100) { formError.value = `Row ${i + 1}: enter a valid amount (min KES 1).`; return null }
    if (!r.email.trim()) { formError.value = `Row ${i + 1}: email is required.`; return null }
    if (!r.phone.trim()) { formError.value = `Row ${i + 1}: phone is required.`; return null }
    if (!r.due_date) { formError.value = `Row ${i + 1}: due date is required.`; return null }
    recipients.push({
      email: r.email.trim(),
      phone: r.phone.trim(),
      name: r.name.trim() || undefined,
      amount_cents: amountCents,
      due_date: new Date(`${r.due_date}T23:59:59`).toISOString(),
      description: r.description.trim() || undefined,
      tax_category: r.tax_category,
    })
  }
  return recipients
}

const showCreate = ref(false)
const estimating = ref(false)
const estimate = ref<BulkInvoiceEstimateResult | null>(null)
const sending = ref(false)

function openCreate() {
  resetRows()
  estimate.value = null
  formError.value = null
  showCreate.value = true
  loadRecipientHistory()
}

async function runEstimate() {
  formError.value = null
  estimate.value = null
  const recipients = buildRecipients()
  if (!recipients) return
  if (recipients.length === 0) { formError.value = 'Add at least one recipient.'; return }
  estimating.value = true
  try {
    estimate.value = props.isBranch
      ? await estimateBulkInvoices({ branch_id: props.branchId, recipients }, true)
      : await estimateBulkInvoices({ recipients })
  } catch (err) {
    formError.value = extractErrorMessage(err)
  } finally {
    estimating.value = false
  }
}

async function submitSend() {
  formError.value = null
  const recipients = buildRecipients()
  if (!recipients) return
  if (recipients.length === 0) { formError.value = 'Add at least one recipient.'; return }
  sending.value = true
  try {
    const result = props.isBranch
      ? await sendBulkInvoices({ branch_id: props.branchId, recipients }, true)
      : await sendBulkInvoices({ recipients })
    const count = result.data?.recipient_count ?? recipients.length
    const suppressed = result.data?.suppressed_count ?? 0
    const cost = result.data?.estimated_cost_cents ?? 0
    showSuccess(`Batch escrowed: ${count} invoice(s) queued to send${suppressed ? ` (${suppressed} suppressed and excluded)` : ''} — KES ${formatMoney(cost)} reserved.`)
    showCreate.value = false
    await load()
  } catch (err) {
    formError.value = extractErrorMessage(err)
  } finally {
    sending.value = false
  }
}

const detailOpen = ref(false)
const detailLoading = ref(false)
const batchDetail = ref<{ batch: InvoiceBatch; items: InvoiceBatchItem[] } | null>(null)

async function openDetail(batchId: string) {
  detailOpen.value = true
  detailLoading.value = true
  batchDetail.value = null
  try {
    batchDetail.value = await fetchInvoiceBatch(batchId, props.isBranch)
  } catch (err) {
    showError(extractErrorMessage(err))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function batchStatusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'sent') return 'success'
  if (status === 'partially_sent') return 'warning'
  if (status === 'failed') return 'error'
  return 'neutral'
}
function itemStatusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'sent') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'suppressed') return 'neutral'
  return 'warning'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Billing</p>
        <h1 class="text-lg font-bold text-text-primary mt-0.5">Bulk invoices</h1>
        <p class="text-sm text-text-muted mt-0.5 max-w-xl">
          Add a recipient list — the full batch cost is escrowed
          {{ props.isBranch ? "from this branch's wallet" : 'immediately' }}, then each invoice is generated and
          emailed independently. KES 1 per invoice actually sent; suppressed or failed recipients are not charged.
        </p>
      </div>
      <AppButton size="sm" @click="openCreate">
        <template #icon><PlusIcon class="w-4 h-4" /></template>
        New batch
      </AppButton>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Batches</p>
        <p class="text-lg font-bold text-text-primary">{{ summary.batches }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Invoices sent</p>
        <p class="text-lg font-bold text-success">{{ summary.sent }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total billed</p>
        <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(summary.billed) }}</p>
      </AppCard>
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-6">Loading batches…</p>
      <div v-else-if="!batches.length" class="px-5 py-12 text-center">
        <FileTextIcon class="w-8 h-8 mx-auto text-text-muted/40" />
        <p class="text-sm text-text-muted mt-2">No invoice batches yet.</p>
        <AppButton size="sm" class="mt-4" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New batch
        </AppButton>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-2.5">Created</th>
              <th class="px-5 py-2.5 text-right">Recipients</th>
              <th class="px-5 py-2.5 text-right">Sent</th>
              <th class="px-5 py-2.5 text-right">Failed</th>
              <th class="px-5 py-2.5 text-right">Suppressed</th>
              <th class="px-5 py-2.5 text-right">Billed</th>
              <th class="px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in batches" :key="b.id"
              class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer"
              @click="openDetail(b.id)"
            >
              <td class="px-5 py-2.5 text-text-muted whitespace-nowrap">{{ formatDate(b.created_at) }}</td>
              <td class="px-5 py-2.5 text-right text-text-primary font-medium">{{ b.recipient_count }}</td>
              <td class="px-5 py-2.5 text-right text-success">{{ b.sent_count }}</td>
              <td class="px-5 py-2.5 text-right" :class="b.failed_count ? 'text-error' : 'text-text-muted'">{{ b.failed_count }}</td>
              <td class="px-5 py-2.5 text-right text-text-muted">{{ b.suppressed_count }}</td>
              <td class="px-5 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">KES {{ formatMoney(b.actual_cost_cents || b.estimated_cost_cents) }}</td>
              <td class="px-5 py-2.5"><AppBadge :variant="batchStatusVariant(b.status)" size="sm">{{ b.status }}</AppBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <AppModal v-model="showCreate" title="New invoice batch" size="full">
      <div class="flex flex-col gap-4">
        <p class="text-xs text-text-muted">
          One row per recipient. Recipients already on your suppression list are automatically excluded and never charged.
        </p>
        <div v-if="formError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ formError }}</div>

        <datalist id="bulk-invoice-recipient-history">
          <option v-for="r in recipientHistory" :key="r.email" :value="r.email">{{ r.name || r.email }}</option>
        </datalist>

        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border bg-surface-2/40">
                <th class="px-3 py-2 w-10">#</th>
                <th class="px-3 py-2">Email</th>
                <th class="px-3 py-2">Phone</th>
                <th class="px-3 py-2">Name</th>
                <th class="px-3 py-2 w-28">Amount (KES)</th>
                <th class="px-3 py-2 w-36">Due date</th>
                <th class="px-3 py-2">Description</th>
                <th class="px-3 py-2 w-32">VAT</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.key" class="border-b border-border last:border-0 align-top">
                <td class="px-3 py-2.5 text-text-muted">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 min-w-50"><AppInput v-model="r.email" placeholder="jane@example.com" list="bulk-invoice-recipient-history" @change="pickRecipient(r)" /></td>
                <td class="px-3 py-2.5 min-w-32"><AppInput v-model="r.phone" placeholder="0712345678" /></td>
                <td class="px-3 py-2.5 min-w-35"><AppInput v-model="r.name" placeholder="Optional" /></td>
                <td class="px-3 py-2.5 min-w-27.5"><AppInput v-model="r.amount_kes" type="number" placeholder="0" /></td>
                <td class="px-3 py-2.5 min-w-40"><AppInput v-model="r.due_date" type="date" /></td>
                <td class="px-3 py-2.5 min-w-40"><AppInput v-model="r.description" placeholder="e.g. October rent" /></td>
                <td class="px-3 py-2.5 min-w-32"><AppSelect v-model="r.tax_category" :options="TAX_CATEGORY_OPTIONS" /></td>
                <td class="px-3 py-2.5">
                  <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors" :disabled="rows.length <= 1" @click="removeRow(r.key)">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center gap-3">
          <AppButton type="button" size="sm" variant="secondary" @click="addRow">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Add recipient
          </AppButton>
          <p class="text-xs text-text-muted">{{ filledRowCount }} recipient(s) filled in.</p>
        </div>

        <div v-if="estimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex flex-col gap-1">
          <span>{{ estimate.recipient_count }} will be sent, {{ estimate.suppressed_count }} suppressed and excluded.</span>
          <span>Cost: <span class="font-semibold text-text-primary">KES {{ formatMoney(estimate.estimated_cost_cents) }}</span> (KES {{ formatMoney(estimate.fee_cents_per_invoice) }} each)</span>
          <span>
            {{ props.isBranch ? 'Branch wallet' : 'Wallet' }} balance: KES {{ formatMoney(estimate.wallet_balance_cents) }}
            <span :class="estimate.sufficient_funds ? 'text-success-text' : 'text-error-text'">({{ estimate.sufficient_funds ? 'sufficient' : 'insufficient' }})</span>
          </span>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between gap-2">
          <AppButton type="button" variant="secondary" :loading="estimating" @click="runEstimate">Check cost &amp; suppression</AppButton>
          <div class="flex gap-2">
            <AppButton type="button" variant="ghost" @click="showCreate = false">Cancel</AppButton>
            <AppButton type="button" :loading="sending" @click="submitSend">Escrow &amp; send batch</AppButton>
          </div>
        </div>
      </template>
    </AppModal>

    <AppModal v-model="detailOpen" title="Invoice batch" size="lg">
      <p v-if="detailLoading" class="text-sm text-text-muted">Loading…</p>
      <div v-else-if="batchDetail" class="flex flex-col gap-2">
        <div v-for="it in batchDetail.items" :key="it.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-primary truncate">{{ it.row_number }}. {{ it.recipient_name || it.recipient_email }} — KES {{ formatMoney(it.amount_cents) }}</p>
            <p class="text-xs text-text-muted truncate">{{ it.recipient_email }}<template v-if="it.error_message"> · {{ it.error_message }}</template></p>
          </div>
          <AppBadge :variant="itemStatusVariant(it.send_status)" size="sm">{{ it.send_status }}</AppBadge>
        </div>
      </div>
    </AppModal>
  </div>
</template>
