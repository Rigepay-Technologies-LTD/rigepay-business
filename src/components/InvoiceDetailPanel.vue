<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgInvoiceDetail, markOrgInvoicePaid, cancelOrgInvoice, sendOrgInvoice, downloadOrgInvoicePdf,
  type OrgInvoice,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { ChevronLeftIcon, CopyIcon, CheckIcon, DownloadIcon, SendIcon, BanIcon, CheckCircle2Icon } from 'lucide-vue-next'

const props = defineProps<{
  orgId: string
  branchId?: string
  invoiceId: string
  listRouteName: string
}>()

const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const isBranch = computed(() => !!props.branchId)

const inv = ref<OrgInvoice | null>(null)
const loading = ref(true)
const busy = ref(false)

async function load() {
  loading.value = true
  try {
    inv.value = await fetchOrgInvoiceDetail(props.invoiceId, isBranch.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const listTo = computed(() =>
  props.branchId
    ? { name: props.listRouteName, params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: props.listRouteName, params: { orgId: props.orgId } },
)

function statusClass(s: string) {
  switch (s) {
    case 'PAID': return 'bg-success-muted text-success'
    case 'SENT': return 'bg-primary-muted text-primary'
    case 'CANCELLED': return 'bg-error-muted text-error'
    default: return 'bg-surface-2 text-text-muted'
  }
}

const isOverdue = computed(() => {
  if (!inv.value || ['PAID', 'CANCELLED'].includes(inv.value.status)) return false
  return new Date(inv.value.due_date).getTime() < Date.now()
})

const shareUrl = computed(() => inv.value ? `https://pay.rigepay.co.ke/i/${inv.value.shareable_code}` : '')

const copied = ref('')
function copy(text: string, key: string) {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => { if (copied.value === key) copied.value = '' }, 1500)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtDay(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

async function markPaid() {
  const ok = await confirmAction({ title: 'Mark this invoice as paid?', message: 'Records the invoice as settled. This does not move any money.', confirmLabel: 'Mark paid' })
  if (!ok) return
  busy.value = true
  try { inv.value = await markOrgInvoicePaid(props.invoiceId, isBranch.value); showSuccess('Invoice marked as paid.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}

async function cancel() {
  const ok = await confirmAction({ title: 'Cancel this invoice?', message: 'The customer will no longer be able to pay it.', confirmLabel: 'Cancel invoice', danger: true })
  if (!ok) return
  busy.value = true
  try { inv.value = await cancelOrgInvoice(props.invoiceId, isBranch.value); showSuccess('Invoice cancelled.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}

async function resend() {
  const channels = ['SMS', ...(inv.value?.customer_email ? ['EMAIL'] : [])]
  busy.value = true
  try {
    await sendOrgInvoice(props.invoiceId, channels, isBranch.value)
    showSuccess('Invoice re-sent to the customer.')
    await load()
  } catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}

async function downloadPdf() {
  busy.value = true
  try {
    const blob = await downloadOrgInvoicePdf(props.invoiceId, isBranch.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inv.value?.invoice_number ?? 'invoice'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}

function msgStatusClass(s: string) {
  if (['SENT', 'DELIVERED'].includes(s)) return 'bg-success-muted text-success'
  if (['FAILED', 'REJECTED'].includes(s)) return 'bg-error-muted text-error'
  return 'bg-surface-2 text-text-muted'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink :to="listTo" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Invoices
    </RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading invoice…</p>

    <template v-else-if="inv">
      <!-- header -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Invoice</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ inv.invoice_number }}</h1>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(inv.status)">{{ inv.status }}</span>
            <span v-if="isOverdue" class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-error-muted text-error">Overdue</span>
            <span v-if="inv.is_etims_synced" class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-success-muted text-success">eTIMS synced</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton size="sm" variant="secondary" :loading="busy" @click="downloadPdf">
            <template #icon><DownloadIcon class="w-4 h-4" /></template>PDF
          </AppButton>
          <AppButton v-if="inv.status !== 'CANCELLED' && inv.status !== 'PAID'" size="sm" variant="secondary" :loading="busy" @click="resend">
            <template #icon><SendIcon class="w-4 h-4" /></template>Re-send
          </AppButton>
          <AppButton v-if="inv.status !== 'PAID' && inv.status !== 'CANCELLED'" size="sm" variant="secondary" :loading="busy" @click="markPaid">
            <template #icon><CheckCircle2Icon class="w-4 h-4" /></template>Mark paid
          </AppButton>
          <AppButton v-if="inv.status !== 'PAID' && inv.status !== 'CANCELLED'" size="sm" variant="danger" :loading="busy" @click="cancel">
            <template #icon><BanIcon class="w-4 h-4" /></template>Cancel
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- amounts -->
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Amounts</h2>
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between"><dt class="text-text-muted">Subtotal</dt><dd class="font-medium text-text-primary">{{ inv.currency }} {{ formatMoney(inv.sub_total_cents) }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">Tax</dt><dd class="font-medium text-text-primary">{{ inv.currency }} {{ formatMoney(inv.tax_amount_cents) }}</dd></div>
            <div class="flex justify-between pt-2 border-t border-border"><dt class="font-bold text-text-primary">Total</dt><dd class="text-base font-bold text-text-primary">{{ inv.currency }} {{ formatMoney(inv.total_cents) }}</dd></div>
          </dl>
        </AppCard>

        <!-- customer -->
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Customer</h2>
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Name</dt><dd class="font-medium text-text-primary text-right">{{ inv.customer_name }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Phone</dt><dd class="font-medium text-text-primary text-right">{{ inv.customer_phone }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Email</dt><dd class="font-medium text-text-primary text-right break-all">{{ inv.customer_email || '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">KRA PIN</dt><dd class="font-medium text-text-primary text-right">{{ inv.customer_kra_pin || '—' }}</dd></div>
          </dl>
        </AppCard>

        <!-- dates + link -->
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Details</h2>
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Issued</dt><dd class="font-medium text-text-primary">{{ fmtDay(inv.created_at) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Due</dt><dd class="font-medium" :class="isOverdue ? 'text-error' : 'text-text-primary'">{{ fmtDay(inv.due_date) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Paid</dt><dd class="font-medium text-text-primary">{{ inv.paid_at ? fmtDate(inv.paid_at) : '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-text-muted">Currency</dt><dd class="font-medium text-text-primary">{{ inv.currency }}</dd></div>
          </dl>
          <div class="mt-3 pt-3 border-t border-border">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Pay link</p>
            <div class="flex items-center gap-2">
              <a :href="shareUrl" target="_blank" rel="noopener" class="text-xs font-semibold text-primary underline break-all">{{ shareUrl }}</a>
              <button class="text-text-muted hover:text-primary shrink-0" @click="copy(shareUrl, 'link')">
                <CheckIcon v-if="copied === 'link'" class="w-3.5 h-3.5 text-success" /><CopyIcon v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- line items -->
      <AppCard padding="none">
        <h2 class="text-sm font-bold text-text-primary px-5 pt-5 mb-3">Line items</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Item</th>
                <th class="px-5 py-3">HS code</th>
                <th class="px-5 py-3">Tax category</th>
                <th class="px-5 py-3 text-right">Qty</th>
                <th class="px-5 py-3 text-right">Unit price</th>
                <th class="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in inv.items" :key="it.id" class="border-b border-border last:border-0">
                <td class="px-5 py-3">
                  <p class="font-medium text-text-primary">{{ it.item_name }}</p>
                  <p v-if="it.description" class="text-xs text-text-muted">{{ it.description }}</p>
                </td>
                <td class="px-5 py-3 text-text-muted font-mono text-xs">{{ it.hs_code || '—' }}</td>
                <td class="px-5 py-3 text-text-secondary text-xs">{{ it.tax_category }}</td>
                <td class="px-5 py-3 text-right text-text-secondary">{{ it.quantity }}</td>
                <td class="px-5 py-3 text-right text-text-secondary">{{ formatMoney(it.unit_price_cents) }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary">{{ formatMoney(it.total_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- notes -->
        <AppCard v-if="inv.notes">
          <h2 class="text-sm font-bold text-text-primary mb-2">Notes</h2>
          <p class="text-sm text-text-secondary whitespace-pre-wrap">{{ inv.notes }}</p>
        </AppCard>

        <!-- delivery log -->
        <AppCard :class="inv.notes ? '' : 'lg:col-span-2'" padding="none">
          <h2 class="text-sm font-bold text-text-primary px-5 pt-5 mb-2">Delivery history</h2>
          <p v-if="!inv.messaging_logs?.length" class="text-sm text-text-muted px-5 pb-5">No SMS or email has been sent for this invoice.</p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                  <th class="px-5 py-2.5">Channel</th>
                  <th class="px-5 py-2.5">Recipient</th>
                  <th class="px-5 py-2.5">Status</th>
                  <th class="px-5 py-2.5">Sent</th>
                  <th class="px-5 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in inv.messaging_logs" :key="m.id" class="border-b border-border last:border-0">
                  <td class="px-5 py-2.5 text-text-primary">{{ m.channel }}</td>
                  <td class="px-5 py-2.5 text-text-secondary break-all">{{ m.recipient }}</td>
                  <td class="px-5 py-2.5">
                    <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="msgStatusClass(m.status)">{{ m.status }}</span>
                    <span v-if="m.error_message" class="block text-xs text-error mt-0.5">{{ m.error_message }}</span>
                  </td>
                  <td class="px-5 py-2.5 text-text-muted text-xs">{{ m.sent_at ? fmtDate(m.sent_at) : fmtDate(m.created_at) }}</td>
                  <td class="px-5 py-2.5 text-right text-text-muted">{{ m.charge_amount_cents ? `KES ${formatMoney(m.charge_amount_cents)}` : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>
