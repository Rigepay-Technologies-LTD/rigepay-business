<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  fetchSupplierInvoices, fetchPurchaseOrders, fetchSupplierPayments,
  type SupplierInvoice, type PurchaseOrder, type SupplierPayment,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{
  tab: 'invoices' | 'pos' | 'payments' | 'statement'
  isBranch: boolean
  orgId: string
  branchId?: string
  supplierId: string
}>()

const { showError } = useResponseModal()

const invoices = ref<SupplierInvoice[]>([])
const pos = ref<PurchaseOrder[]>([])
const payments = ref<SupplierPayment[]>([])
const loadedInv = ref(false)
const loadedPO = ref(false)
const loadedPay = ref(false)
const busy = ref(false)

async function loadInvoices() {
  if (loadedInv.value) return
  busy.value = true
  try { invoices.value = (await fetchSupplierInvoices(props.isBranch, { supplier_id: props.supplierId })).invoices; loadedInv.value = true }
  catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}
async function loadPOs() {
  if (loadedPO.value) return
  busy.value = true
  try { pos.value = (await fetchPurchaseOrders(props.isBranch, { supplier_id: props.supplierId })).purchase_orders; loadedPO.value = true }
  catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}
async function loadPayments() {
  if (loadedPay.value) return
  busy.value = true
  try { payments.value = (await fetchSupplierPayments(props.isBranch, { supplier_id: props.supplierId })).payments; loadedPay.value = true }
  catch (err) { showError(extractErrorMessage(err)) } finally { busy.value = false }
}

function loadForTab(t: string) {
  if (t === 'invoices') loadInvoices()
  else if (t === 'pos') loadPOs()
  else if (t === 'payments') loadPayments()
  else if (t === 'statement') { loadInvoices(); loadPayments() }
}
watch(() => props.tab, loadForTab)
onMounted(() => loadForTab(props.tab))

function invRoute(id: string) {
  return props.branchId
    ? { name: 'branch-supplier-invoice-detail', params: { orgId: props.orgId, branchId: props.branchId, docId: id } }
    : { name: 'org-supplier-invoice-detail', params: { orgId: props.orgId, docId: id } }
}
function poRoute(id: string) {
  return props.branchId
    ? { name: 'branch-purchase-order-detail', params: { orgId: props.orgId, branchId: props.branchId, docId: id } }
    : { name: 'org-purchase-order-detail', params: { orgId: props.orgId, docId: id } }
}

function invStatusVariant(s: string) {
  if (s === 'PAID') return 'success'
  if (s === 'PARTIALLY_PAID') return 'info'
  if (s === 'VOID') return 'error'
  return 'warning'
}
function poStatusVariant(s: string) {
  if (s === 'ISSUED' || s === 'APPROVED') return 'success'
  if (s === 'CANCELLED') return 'error'
  if (s === 'PENDING_APPROVAL') return 'warning'
  return 'neutral'
}
function payStatusVariant(s: string) {
  if (s === 'PAID') return 'success'
  if (s === 'FAILED' || s === 'CANCELLED') return 'error'
  if (s === 'PENDING_APPROVAL') return 'warning'
  return 'info'
}

const statement = computed(() => {
  type Row = { date: string; kind: 'Invoice' | 'Payment'; ref: string; debit: number; credit: number }
  const rows: Row[] = []
  for (const inv of invoices.value) {
    if (inv.status === 'VOID') continue
    rows.push({ date: inv.invoice_date ?? inv.created_at, kind: 'Invoice', ref: inv.invoice_number, debit: inv.total_cents, credit: 0 })
  }
  for (const p of payments.value) {
    if (p.status !== 'PAID') continue
    rows.push({ date: p.completed_at ?? p.created_at, kind: 'Payment', ref: p.reference || p.id.slice(0, 8), debit: 0, credit: p.amount_cents })
  }
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let balance = 0
  return rows.map((r) => { balance += r.debit - r.credit; return { ...r, balance } })
})
</script>

<template>
  <AppCard>
    <p v-if="busy" class="text-sm text-text-muted">Loading…</p>

    <template v-else-if="tab === 'invoices'">
      <p v-if="!invoices.length" class="text-sm text-text-muted">No invoices from this supplier.</p>
      <table v-else class="w-full text-sm">
        <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
          <th class="py-2">Invoice</th><th class="py-2">Due</th><th class="py-2 text-right">Total</th><th class="py-2 text-right">Outstanding</th><th class="py-2">Status</th>
        </tr></thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id" class="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer" @click="$router.push(invRoute(inv.id))">
            <td class="py-2.5 font-semibold text-text-primary">{{ inv.invoice_number }}</td>
            <td class="py-2.5 text-text-secondary">{{ inv.due_date ? formatDate(inv.due_date) : '—' }}</td>
            <td class="py-2.5 text-right">{{ formatMoney(inv.total_cents) }}</td>
            <td class="py-2.5 text-right">{{ formatMoney(inv.total_cents - inv.paid_cents) }}</td>
            <td class="py-2.5"><AppBadge :variant="invStatusVariant(inv.status)" size="sm">{{ inv.status }}</AppBadge></td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else-if="tab === 'pos'">
      <p v-if="!pos.length" class="text-sm text-text-muted">No purchase orders for this supplier.</p>
      <table v-else class="w-full text-sm">
        <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
          <th class="py-2">PO number</th><th class="py-2">Expected</th><th class="py-2 text-right">Amount</th><th class="py-2">Status</th><th class="py-2">Fulfillment</th>
        </tr></thead>
        <tbody>
          <tr v-for="po in pos" :key="po.id" class="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer" @click="$router.push(poRoute(po.id))">
            <td class="py-2.5 font-semibold text-text-primary">{{ po.po_number }}</td>
            <td class="py-2.5 text-text-secondary">{{ po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—' }}</td>
            <td class="py-2.5 text-right">{{ formatMoney(po.total_cents) }}</td>
            <td class="py-2.5"><AppBadge :variant="poStatusVariant(po.status)" size="sm">{{ po.status }}</AppBadge></td>
            <td class="py-2.5 text-text-secondary">{{ po.fulfillment_status }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else-if="tab === 'payments'">
      <p v-if="!payments.length" class="text-sm text-text-muted">No payments to this supplier yet.</p>
      <table v-else class="w-full text-sm">
        <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
          <th class="py-2">Date</th><th class="py-2">Reference</th><th class="py-2 text-right">Amount</th><th class="py-2">Status</th>
        </tr></thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id" class="border-b border-border last:border-0">
            <td class="py-2.5 text-text-secondary">{{ formatDate(p.completed_at ?? p.created_at) }}</td>
            <td class="py-2.5">{{ p.reference || '—' }}</td>
            <td class="py-2.5 text-right font-semibold">KES {{ formatMoney(p.amount_cents) }}</td>
            <td class="py-2.5"><AppBadge :variant="payStatusVariant(p.status)" size="sm">{{ p.status }}</AppBadge></td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else-if="tab === 'statement'">
      <p v-if="!statement.length" class="text-sm text-text-muted">No transactions with this supplier.</p>
      <table v-else class="w-full text-sm">
        <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
          <th class="py-2">Date</th><th class="py-2">Type</th><th class="py-2">Ref</th>
          <th class="py-2 text-right">Charge</th><th class="py-2 text-right">Payment</th><th class="py-2 text-right">Balance</th>
        </tr></thead>
        <tbody>
          <tr v-for="(r, i) in statement" :key="i" class="border-b border-border last:border-0">
            <td class="py-2.5 text-text-secondary">{{ formatDate(r.date) }}</td>
            <td class="py-2.5">{{ r.kind }}</td>
            <td class="py-2.5 text-text-secondary">{{ r.ref }}</td>
            <td class="py-2.5 text-right">{{ r.debit ? formatMoney(r.debit) : '' }}</td>
            <td class="py-2.5 text-right text-success">{{ r.credit ? formatMoney(r.credit) : '' }}</td>
            <td class="py-2.5 text-right font-semibold" :class="r.balance > 0 ? 'text-text-primary' : 'text-success'">{{ formatMoney(r.balance) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </AppCard>
</template>
