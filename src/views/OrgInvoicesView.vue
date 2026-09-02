<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchOrgInvoices, createOrgInvoice, sendOrgInvoice, downloadOrgInvoicePdf, fetchCrmCustomers,
  type OrgInvoice, type CreateOrgInvoiceItemInput, type CrmCustomer,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { PlusIcon, FileTextIcon, DownloadIcon, SendIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { useRecipientHistory } from '@/composables/useRecipientHistory'

const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const { recipients: recipientHistory, loadRecipientHistory } = useRecipientHistory()

const props = defineProps<{ orgId: string }>()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const invoices = ref<OrgInvoice[]>([])

function pickRecipient() {
  const match = recipientHistory.value.find((r) => r.email === customerEmail.value.trim())
  if (match && match.name && !customerName.value.trim()) customerName.value = match.name
}

async function load() {
  loading.value = true
  error.value = null
  try {
    invoices.value = (await fetchOrgInvoices()) ?? []
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
const creating = ref(false)
const createError = ref<string | null>(null)

const customerName = ref('')
const customerPhone = ref('')
const customerEmail = ref('')
const dueDate = ref('')
const crmCustomers = ref<CrmCustomer[]>([])
const selectedCustomerId = ref('')

async function loadCrmCustomers() {
  if (crmCustomers.value.length) return
  try {
    const res = await fetchCrmCustomers(false, { status: 'ACTIVE', page_size: 100 })
    crmCustomers.value = res.customers ?? []
  } catch { /* ignore */ }
}

function applyCrmCustomer() {
  const c = crmCustomers.value.find((x) => x.id === selectedCustomerId.value)
  if (!c) return
  customerName.value = c.trading_name || c.legal_name
  customerPhone.value = c.phone || customerPhone.value
  customerEmail.value = c.email || customerEmail.value
}
const notes = ref('')
const sendOnCreate = ref(true)
const items = ref<CreateOrgInvoiceItemInput[]>([{ item_name: '', quantity: 1, unit_price_cents: 0, tax_category: 'EXEMPT' }])

function addItem() {
  items.value.push({ item_name: '', quantity: 1, unit_price_cents: 0, tax_category: 'EXEMPT' })
}
function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

const itemsSubtotalCents = computed(() =>
  items.value.reduce((sum, it) => sum + Math.round((it.quantity || 0) * (it.unit_price_cents || 0)), 0),
)
const itemsTaxCents = computed(() =>
  items.value.reduce((sum, it) => {
    const lineCents = Math.round((it.quantity || 0) * (it.unit_price_cents || 0))
    return sum + (it.tax_category === 'A' ? Math.round(lineCents * 0.16) : 0)
  }, 0),
)
const itemsTotalCents = computed(() => itemsSubtotalCents.value + itemsTaxCents.value)

async function submitCreate() {
  createError.value = null
  if (!customerName.value.trim() || !customerPhone.value.trim() || !dueDate.value) {
    createError.value = 'Customer name, phone, and due date are required.'
    return
  }
  if (!items.value.length || items.value.some((it) => !it.item_name.trim() || it.unit_price_cents <= 0)) {
    createError.value = 'Every line item needs a name and a unit price greater than zero.'
    return
  }
  creating.value = true
  try {
    const result = await createOrgInvoice({
      customer_name: customerName.value.trim(),
      customer_phone: customerPhone.value.trim(),
      customer_email: customerEmail.value.trim() || undefined,
      currency: 'KES',
      due_date: new Date(dueDate.value).toISOString(),
      notes: notes.value.trim() || undefined,
      org_customer_id: selectedCustomerId.value || undefined,
      items: items.value,
    })

    if (sendOnCreate.value && result.data?.id) {
      const channels = ['SMS', ...(customerEmail.value.trim() ? ['EMAIL'] : [])]
      try {
        await sendOrgInvoice(result.data.id, channels)
        showSuccess('Invoice created and sent to the customer.')
      } catch (sendErr) {
        showError(`Invoice created, but sending failed: ${extractErrorMessage(sendErr)}`)
      }
    }

    customerName.value = ''
    customerPhone.value = ''
    customerEmail.value = ''
    selectedCustomerId.value = ''
    dueDate.value = ''
    notes.value = ''
    items.value = [{ item_name: '', quantity: 1, unit_price_cents: 0, tax_category: 'EXEMPT' }]
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const sendingId = ref<string | null>(null)
async function handleSend(invoice: OrgInvoice) {
  const channels: string[] = []
  if (invoice.customer_email) {
    const sendEmail = await confirmAction({ message: 'Send this invoice by email?', confirmLabel: 'Send email', cancelLabel: 'Skip' })
    if (sendEmail) channels.push('EMAIL')
  }
  const sendSms = await confirmAction({ message: 'Also send by SMS?', confirmLabel: 'Send SMS', cancelLabel: 'Skip' })
  if (sendSms) channels.push('SMS')
  if (!channels.length) return
  sendingId.value = invoice.id
  try {
    await sendOrgInvoice(invoice.id, channels)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    sendingId.value = null
  }
}

const downloadingId = ref<string | null>(null)
async function handleDownload(invoice: OrgInvoice) {
  downloadingId.value = invoice.id
  try {
    const blob = await downloadOrgInvoicePdf(invoice.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    downloadingId.value = null
  }
}

function statusVariant(status: string) {
  if (status === 'PAID') return 'success'
  if (status === 'CANCELLED') return 'neutral'
  if (status === 'SENT') return 'warning'
  return 'neutral'
}

function openDetail(invoice: OrgInvoice) {
  router.push({ name: 'org-invoice-detail', params: { orgId: props.orgId, invoiceId: invoice.id } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Invoices">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Invoices</h2>
          <p class="text-xs text-text-muted mt-0.5">Professional invoices with a PDF breakdown and an embedded payment link.</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm; loadRecipientHistory(); loadCrmCustomers()">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New invoice
        </AppButton>
      </div>

      <datalist id="invoice-recipient-history">
        <option v-for="r in recipientHistory" :key="r.email" :value="r.email">{{ r.name || r.email }}</option>
      </datalist>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New invoice</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-xl" @submit.prevent="submitCreate">
          <div v-if="crmCustomers.length" class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Link to a saved customer (optional)</label>
            <select
              v-model="selectedCustomerId"
              class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              @change="applyCrmCustomer"
            >
              <option value="">Not linked</option>
              <option v-for="c in crmCustomers" :key="c.id" :value="c.id">
                {{ c.customer_code }} — {{ c.trading_name || c.legal_name }}
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="customerName" label="Customer name" required />
            <AppInput v-model="customerPhone" label="Customer phone" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AppInput
              v-model="customerEmail" type="email" label="Customer email (optional)"
              list="invoice-recipient-history" hint="Pick from a previous recipient or type a new one"
              @change="pickRecipient"
            />
            <AppInput v-model="dueDate" type="date" label="Due date" required />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-text-primary">Line items</span>
              <button type="button" class="text-xs font-semibold text-primary" @click="addItem">+ Add item</button>
            </div>
            <div v-for="(it, idx) in items" :key="idx" class="grid grid-cols-[1fr_60px_100px_110px_28px] gap-2 items-end">
              <AppInput v-model="it.item_name" placeholder="Item name" />
              <AppInput v-model.number="it.quantity" type="number" placeholder="Qty" />
              <AppInput v-model.number="it.unit_price_cents" type="number" placeholder="Unit price (cents)" />
              <select
                v-model="it.tax_category"
                class="h-10 rounded-lg border border-input-border bg-input-bg px-2 text-xs font-medium text-text-primary outline-none focus:border-input-border-focused"
              >
                <option value="EXEMPT">Exempt (no VAT)</option>
                <option value="A">Taxable (16% VAT)</option>
              </select>
              <button
                v-if="items.length > 1" type="button" class="text-error-text text-sm pb-2"
                @click="removeItem(idx)"
              >✕</button>
            </div>
            <div class="text-xs text-text-muted flex flex-col gap-0.5">
              <span>Subtotal: KES {{ formatMoney(itemsSubtotalCents) }}</span>
              <span v-if="itemsTaxCents > 0">VAT: KES {{ formatMoney(itemsTaxCents) }}</span>
              <span class="font-semibold text-text-primary">Total: KES {{ formatMoney(itemsTotalCents) }}</span>
            </div>
          </div>

          <AppInput v-model="notes" label="Notes (optional)" />

          <label class="flex items-start gap-2 text-sm text-text-primary">
            <input type="checkbox" v-model="sendOnCreate" class="w-4 h-4 rounded mt-0.5" />
            <span>
              Send to the customer now
              <span class="block text-xs text-text-muted">
                Delivers a payment link by SMS{{ customerEmail.trim() ? ' and email' : '' }}. SMS is charged at KES 1 per message.
              </span>
            </span>
          </label>

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">{{ sendOnCreate ? 'Create & send invoice' : 'Create invoice' }}</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading invoices…</p>
      <AppCard v-else-if="!invoices.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <FileTextIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No invoices yet</p>
          <p class="text-xs text-text-muted">Create one to bill a customer with a click-to-pay link.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="invoice in invoices" :key="invoice.id" padding="none">
          <div class="flex items-center justify-between gap-3 px-5 py-3.5">
            <button type="button" class="min-w-0 flex-1 text-left" @click="openDetail(invoice)">
              <div class="flex items-center gap-2">
                <AppBadge :variant="statusVariant(invoice.status)" size="sm">{{ invoice.status }}</AppBadge>
                <span class="text-xs font-mono text-text-muted">{{ invoice.invoice_number }}</span>
              </div>
              <p class="text-sm font-semibold text-text-primary mt-1 truncate hover:text-primary transition-colors">
                {{ invoice.customer_name }} — KES {{ formatMoney(invoice.total_cents) }}
              </p>
              <p class="text-xs text-text-muted mt-0.5">
                Due {{ formatDate(invoice.due_date) }} · created {{ formatDate(invoice.created_at) }}
              </p>
            </button>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button" class="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-muted transition-colors disabled:opacity-50"
                title="Download PDF" :disabled="downloadingId === invoice.id" @click="handleDownload(invoice)"
              ><DownloadIcon class="w-4 h-4" /></button>
              <AppButton
                size="sm" variant="ghost" :loading="sendingId === invoice.id"
                @click="handleSend(invoice)"
              >
                <template #icon><SendIcon class="w-3.5 h-3.5" /></template>
                Send
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
