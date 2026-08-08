<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  estimateBulkInvoices, sendBulkInvoices, fetchInvoiceBatches, fetchInvoiceBatch,
  type BulkInvoiceRecipientInput, type BulkInvoiceEstimateResult, type InvoiceBatch, type InvoiceBatchItem,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'
import { useRecipientHistory } from '@/composables/useRecipientHistory'

const { showError, showSuccess } = useResponseModal()
const { recipients: recipientHistory, loadRecipientHistory } = useRecipientHistory(true)

const props = defineProps<{ orgId: string; branchId: string }>()

const error = ref<string | null>(null)
const loading = ref(true)
const batches = ref<InvoiceBatch[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    batches.value = await fetchInvoiceBatches(true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreateForm = ref(false)

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

function addRow() {
  rows.value.push(blankRow())
}
function removeRow(key: number) {
  rows.value = rows.value.filter((r) => r.key !== key)
}
function resetRows() {
  nextRowKey = 1
  rows.value = [blankRow(), blankRow()]
}

function pickRecipient(row: EditableRow) {
  const match = recipientHistory.value.find((r) => r.email === row.email.trim())
  if (match && match.name && !row.name.trim()) row.name = match.name
}

const filledRowCount = computed(() => rows.value.filter((r) => r.email.trim() && Number(r.amount_kes) > 0).length)

function buildRecipients(): BulkInvoiceRecipientInput[] | null {
  const recipients: BulkInvoiceRecipientInput[] = []
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    const isBlank = !r.email.trim() && !r.amount_kes
    if (isBlank) continue

    const amountCents = Math.round(Number(r.amount_kes) * 100)
    if (!amountCents || amountCents < 100) {
      formError.value = `Row ${i + 1}: enter a valid amount (min KES 1).`
      return null
    }
    if (!r.email.trim()) {
      formError.value = `Row ${i + 1}: email is required.`
      return null
    }
    if (!r.phone.trim()) {
      formError.value = `Row ${i + 1}: phone is required.`
      return null
    }
    if (!r.due_date) {
      formError.value = `Row ${i + 1}: due date is required.`
      return null
    }
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

const formError = ref<string | null>(null)
const estimating = ref(false)
const estimate = ref<BulkInvoiceEstimateResult | null>(null)

async function runEstimate() {
  formError.value = null
  estimate.value = null
  const recipients = buildRecipients()
  if (!recipients) return
  if (recipients.length === 0) {
    formError.value = 'Add at least one recipient.'
    return
  }
  estimating.value = true
  try {
    estimate.value = await estimateBulkInvoices({ branch_id: props.branchId, recipients }, true)
  } catch (err) {
    formError.value = extractErrorMessage(err)
  } finally {
    estimating.value = false
  }
}

const sending = ref(false)

async function submitSend() {
  formError.value = null
  const recipients = buildRecipients()
  if (!recipients) return
  if (recipients.length === 0) {
    formError.value = 'Add at least one recipient.'
    return
  }
  sending.value = true
  try {
    const result = await sendBulkInvoices({ branch_id: props.branchId, recipients }, true)
    const count = result.data?.recipient_count ?? recipients.length
    const suppressed = result.data?.suppressed_count ?? 0
    const cost = result.data?.estimated_cost_cents ?? 0
    const successMsg = `Batch escrowed: ${count} invoice(s) queued to send${suppressed ? ` (${suppressed} suppressed and excluded)` : ''} — KES ${formatMoney(cost)} reserved.`
    showSuccess(successMsg)
    resetRows()
    estimate.value = null
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    formError.value = msg
    showError(msg)
  } finally {
    sending.value = false
  }
}

const expandedBatchId = ref<string | null>(null)
const batchDetail = ref<{ batch: InvoiceBatch; items: InvoiceBatchItem[] } | null>(null)
const detailLoading = ref(false)

async function toggleExpand(batchId: string) {
  if (expandedBatchId.value === batchId) {
    expandedBatchId.value = null
    batchDetail.value = null
    return
  }
  expandedBatchId.value = batchId
  detailLoading.value = true
  try {
    batchDetail.value = await fetchInvoiceBatch(batchId, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
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
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Bulk invoices">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Send invoices in bulk</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Add a list of recipients — the full batch cost is escrowed immediately from this branch's wallet, then
            each invoice is generated and emailed independently. KES 1 per invoice actually sent (suppressed/failed
            recipients aren't charged).
          </p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm; loadRecipientHistory()">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New batch
        </AppButton>
      </div>

      <datalist id="invoice-recipient-history">
        <option v-for="r in recipientHistory" :key="r.email" :value="r.email">{{ r.name || r.email }}</option>
      </datalist>

      <AppCard v-if="showCreateForm" padding="none">
        <div class="px-5 pt-5">
          <h3 class="text-sm font-bold text-text-primary mb-1">New invoice batch</h3>
          <p class="text-xs text-text-muted mb-4">
            Add one row per recipient. Recipients already on your suppression list are automatically excluded and
            never charged.
          </p>
          <div v-if="formError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ formError }}</div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-y border-border">
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
                <td class="px-3 py-2.5 min-w-50">
                  <AppInput v-model="r.email" placeholder="jane@example.com" list="invoice-recipient-history" @change="pickRecipient(r)" />
                </td>
                <td class="px-3 py-2.5 min-w-32">
                  <AppInput v-model="r.phone" placeholder="0712345678" />
                </td>
                <td class="px-3 py-2.5 min-w-35">
                  <AppInput v-model="r.name" placeholder="Optional" />
                </td>
                <td class="px-3 py-2.5 min-w-27.5">
                  <AppInput v-model="r.amount_kes" type="number" placeholder="0" />
                </td>
                <td class="px-3 py-2.5 min-w-40">
                  <AppInput v-model="r.due_date" type="date" />
                </td>
                <td class="px-3 py-2.5 min-w-40">
                  <AppInput v-model="r.description" placeholder="e.g. October rent" />
                </td>
                <td class="px-3 py-2.5 min-w-32">
                  <AppSelect v-model="r.tax_category" :options="TAX_CATEGORY_OPTIONS" />
                </td>
                <td class="px-3 py-2.5">
                  <button
                    type="button" class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors"
                    :disabled="rows.length <= 1" @click="removeRow(r.key)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-5 pb-5 pt-4 flex flex-col gap-4">
          <AppButton type="button" size="sm" variant="secondary" class="self-start" @click="addRow">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Add recipient
          </AppButton>

          <p class="text-xs text-text-muted">{{ filledRowCount }} recipient(s) filled in.</p>

          <div class="flex gap-2">
            <AppButton type="button" variant="secondary" :loading="estimating" @click="runEstimate">Check cost & suppression</AppButton>
          </div>

          <div v-if="estimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex flex-col gap-1">
            <span>{{ estimate.recipient_count }} will be sent, {{ estimate.suppressed_count }} suppressed and excluded.</span>
            <span>Cost: <span class="font-semibold text-text-primary">KES {{ formatMoney(estimate.estimated_cost_cents) }}</span>
              (KES {{ formatMoney(estimate.fee_cents_per_invoice) }} each)</span>
            <span>Branch wallet balance: KES {{ formatMoney(estimate.wallet_balance_cents) }}
              <span :class="estimate.sufficient_funds ? 'text-success-text' : 'text-error-text'">
                ({{ estimate.sufficient_funds ? 'sufficient' : 'insufficient' }})
              </span>
            </span>
          </div>

          <div class="flex gap-2">
            <AppButton type="button" :loading="sending" @click="submitSend">Escrow & send batch</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </div>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading batches…</p>
      <AppCard v-else-if="!batches.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <p class="text-sm font-semibold text-text-primary">No invoice batches yet</p>
          <p class="text-xs text-text-muted">Submit a recipient list above to run your first batch.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-3">
        <AppCard v-for="b in batches" :key="b.id" padding="none">
          <button
            type="button" class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
            @click="toggleExpand(b.id)"
          >
            <span class="text-sm font-semibold text-text-primary flex-1">
              {{ b.recipient_count }} recipients — KES {{ formatMoney(b.actual_cost_cents || b.estimated_cost_cents) }}
              <span class="font-normal text-text-muted">(sent {{ b.sent_count }} · failed {{ b.failed_count }} · suppressed {{ b.suppressed_count }})</span>
            </span>
            <AppBadge :variant="batchStatusVariant(b.status)" size="sm">{{ b.status }}</AppBadge>
            <span class="text-xs text-text-muted">{{ formatDate(b.created_at) }}</span>
            <ChevronUpIcon v-if="expandedBatchId === b.id" class="w-4 h-4 text-text-muted" />
            <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
          </button>

          <div v-if="expandedBatchId === b.id" class="border-t border-border px-5 py-5">
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
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
