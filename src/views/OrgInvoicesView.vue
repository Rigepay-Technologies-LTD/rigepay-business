<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  fetchOrgInvoices, createOrgInvoice, sendOrgInvoice, downloadOrgInvoicePdf,
  fetchOrgInvoiceDetail, markOrgInvoicePaid, cancelOrgInvoice,
  type OrgInvoice, type CreateOrgInvoiceItemInput,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, FileTextIcon, DownloadIcon, SendIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const invoices = ref<OrgInvoice[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    invoices.value = await fetchOrgInvoices()
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
const notes = ref('')
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
    await createOrgInvoice({
      customer_name: customerName.value.trim(),
      customer_phone: customerPhone.value.trim(),
      customer_email: customerEmail.value.trim() || undefined,
      currency: 'KES',
      due_date: new Date(dueDate.value).toISOString(),
      notes: notes.value.trim() || undefined,
      items: items.value,
    })
    customerName.value = ''
    customerPhone.value = ''
    customerEmail.value = ''
    dueDate.value = ''
    notes.value = ''
    items.value = [{ item_name: '', quantity: 1, unit_price_cents: 0 }]
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
  if (invoice.customer_email && confirm('Send this invoice by email?')) channels.push('EMAIL')
  if (confirm('Also send by SMS?')) channels.push('SMS')
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

const selectedInvoice = ref<OrgInvoice | null>(null)
const detailLoading = ref(false)
const actionLoading = ref(false)

async function openDetail(invoice: OrgInvoice) {
  selectedInvoice.value = invoice
  detailLoading.value = true
  try {
    selectedInvoice.value = await fetchOrgInvoiceDetail(invoice.id)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  selectedInvoice.value = null
}

async function handleMarkPaid() {
  if (!selectedInvoice.value) return
  if (!confirm('Mark this invoice as paid? This cannot be undone from here.')) return
  actionLoading.value = true
  try {
    selectedInvoice.value = await markOrgInvoicePaid(selectedInvoice.value.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    actionLoading.value = false
  }
}

async function handleCancel() {
  if (!selectedInvoice.value) return
  if (!confirm('Cancel this invoice? The customer will no longer be able to pay it.')) return
  actionLoading.value = true
  try {
    selectedInvoice.value = await cancelOrgInvoice(selectedInvoice.value.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    actionLoading.value = false
  }
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
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New invoice
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New invoice</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-xl" @submit.prevent="submitCreate">
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="customerName" label="Customer name" required />
            <AppInput v-model="customerPhone" label="Customer phone" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="customerEmail" type="email" label="Customer email (optional)" />
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
                class="h-10 rounded-xl border border-input-border bg-input-bg px-2 text-xs font-medium text-text-primary outline-none focus:border-input-border-focused"
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

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create invoice</AppButton>
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

    <!-- Invoice detail modal -->
    <AppModal :model-value="!!selectedInvoice" title="Invoice detail" size="lg" @update:model-value="closeDetail">
      <div v-if="detailLoading" class="py-8 text-center text-sm text-text-muted">Loading…</div>
      <div v-else-if="selectedInvoice" class="flex flex-col gap-5">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <AppBadge :variant="statusVariant(selectedInvoice.status)" size="sm">{{ selectedInvoice.status }}</AppBadge>
              <span class="text-xs font-mono text-text-muted">{{ selectedInvoice.invoice_number }}</span>
            </div>
            <p class="text-base font-bold text-text-primary mt-1">{{ selectedInvoice.customer_name }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ selectedInvoice.customer_phone }}<span v-if="selectedInvoice.customer_email"> · {{ selectedInvoice.customer_email }}</span></p>
          </div>
          <div class="text-right">
            <p class="text-xs text-text-muted">Due {{ formatDate(selectedInvoice.due_date) }}</p>
            <p class="text-xs text-text-muted">Created {{ formatDate(selectedInvoice.created_at) }}</p>
            <p v-if="selectedInvoice.paid_at" class="text-xs text-success-text">Paid {{ formatDate(selectedInvoice.paid_at) }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-border overflow-x-auto">
          <table class="w-full min-w-125 text-sm">
            <thead>
              <tr class="bg-surface-2 text-left text-xs text-text-muted uppercase tracking-wide">
                <th class="px-3 py-2 font-semibold">Item</th>
                <th class="px-3 py-2 font-semibold text-right">Qty</th>
                <th class="px-3 py-2 font-semibold text-right">Unit price</th>
                <th class="px-3 py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedInvoice.items" :key="item.id" class="border-t border-border">
                <td class="px-3 py-2">
                  <p class="font-medium text-text-primary">{{ item.item_name }}</p>
                  <p v-if="item.description" class="text-xs text-text-muted">{{ item.description }}</p>
                </td>
                <td class="px-3 py-2 text-right text-text-secondary">{{ item.quantity }}</td>
                <td class="px-3 py-2 text-right text-text-secondary">KES {{ formatMoney(item.unit_price_cents) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text-primary">KES {{ formatMoney(item.total_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col gap-1 items-end text-sm">
          <div class="flex justify-between w-48"><span class="text-text-muted">Subtotal</span><span>KES {{ formatMoney(selectedInvoice.sub_total_cents) }}</span></div>
          <div v-if="selectedInvoice.tax_amount_cents > 0" class="flex justify-between w-48"><span class="text-text-muted">VAT</span><span>KES {{ formatMoney(selectedInvoice.tax_amount_cents) }}</span></div>
          <div class="flex justify-between w-48 font-bold text-text-primary border-t border-border pt-1"><span>Total</span><span>KES {{ formatMoney(selectedInvoice.total_cents) }}</span></div>
        </div>

        <p v-if="selectedInvoice.notes" class="text-xs text-text-muted bg-surface-2 rounded-lg px-3 py-2">{{ selectedInvoice.notes }}</p>

        <div v-if="selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED'" class="flex gap-2 pt-2 border-t border-border">
          <AppButton size="sm" :loading="actionLoading" @click="handleMarkPaid">Mark as paid</AppButton>
          <AppButton size="sm" variant="ghost" :loading="actionLoading" @click="handleCancel">Cancel invoice</AppButton>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
