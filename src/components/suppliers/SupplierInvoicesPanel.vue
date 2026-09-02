<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchSupplierInvoices, fetchSupplierInvoice, createSupplierInvoice, submitSupplierInvoice,
  voidSupplierInvoice, decideSupplierInvoice, fetchSuppliers, sendSupplierInvoiceEmail,
  type SupplierInvoice, type SupplierLineItem, type Supplier,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import LineItemsEditor from '@/components/suppliers/LineItemsEditor.vue'
import { PlusIcon, ArrowLeftIcon } from 'lucide-vue-next'

const props = defineProps<{ isBranch: boolean; orgId: string; branchId?: string; docId?: string }>()
const router = useRouter()
const auth = useAuthStore()
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const isOwner = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType === 'org_member')

const loading = ref(true)
const invoices = ref<SupplierInvoice[]>([])
const total = ref(0)
const statusFilter = ref('')
const detail = ref<SupplierInvoice | null>(null)
const acting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res = await fetchSupplierInvoices(props.isBranch, { status: statusFilter.value || undefined })
    invoices.value = res.invoices ?? []
    total.value = res.total
  } catch (err) { showError(extractErrorMessage(err)) } finally { loading.value = false }
}
async function loadDetail(id: string) {
  loading.value = true
  try { detail.value = await fetchSupplierInvoice(props.isBranch, id) }
  catch (err) { showError(extractErrorMessage(err)) } finally { loading.value = false }
}

watch(() => props.docId, (id) => { if (id) loadDetail(id); else loadList() })
watch(statusFilter, loadList)
onMounted(() => { if (props.docId) loadDetail(props.docId); else loadList() })

function listRoute() {
  return props.branchId
    ? { name: 'branch-supplier-invoices', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-supplier-invoices', params: { orgId: props.orgId } }
}
function detailRoute(id: string) {
  return props.branchId
    ? { name: 'branch-supplier-invoice-detail', params: { orgId: props.orgId, branchId: props.branchId, docId: id } }
    : { name: 'org-supplier-invoice-detail', params: { orgId: props.orgId, docId: id } }
}

function statusVariant(s: string) {
  if (s === 'PAID') return 'success'
  if (s === 'PARTIALLY_PAID') return 'info'
  if (s === 'VOID') return 'error'
  if (s === 'OPEN') return 'warning'
  return 'neutral'
}

const showCreate = ref(false)
const suppliers = ref<Supplier[]>([])
const form = ref<{ supplier_id: string; invoice_date: string; due_date: string; notes: string; lines: SupplierLineItem[] }>({
  supplier_id: '', invoice_date: '', due_date: '', notes: '',
  lines: [{ description: '', quantity_milli: 1000, unit_price_cents: 0, tax_rate_bps: 0, discount_cents: 0 }],
})
async function openCreate() {
  showCreate.value = true
  if (!suppliers.value.length) {
    try { suppliers.value = (await fetchSuppliers(props.isBranch, { status: 'ACTIVE', page_size: 100 })).suppliers }
    catch (err) { showError(extractErrorMessage(err)) }
  }
}
async function submitCreate() {
  if (!form.value.supplier_id) { showError('Select a supplier.'); return }
  acting.value = true
  try {
    const created = await createSupplierInvoice(props.isBranch, {
      supplier_id: form.value.supplier_id,
      invoice_date: form.value.invoice_date || undefined,
      due_date: form.value.due_date || undefined,
      notes: form.value.notes || undefined,
      lines: form.value.lines,
    })
    showCreate.value = false
    showSuccess('Draft invoice created.')

    const supplierName = suppliers.value.find(s => s.id === form.value.supplier_id)?.legal_name ?? 'the supplier'
    const wantsEmail = await confirmAction({
      title: 'Email this invoice?',
      message: `Send ${supplierName} a copy of this invoice by email, with the PDF attached? A KES 1.00 fee applies. Choose No to skip — there is no charge.`,
      confirmLabel: 'Send email (KES 1.00)',
      cancelLabel: 'No, skip',
    })
    if (wantsEmail) {
      try {
        const res = await sendSupplierInvoiceEmail(props.isBranch, created.id)
        showSuccess(`Invoice emailed to ${res.emailed_to}. KES 1.00 charged.`)
      } catch (err) { showError(extractErrorMessage(err)) }
    }

    router.push(detailRoute(created.id))
  } catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}

async function doSubmit() {
  if (!detail.value) return
  acting.value = true
  try { detail.value = await submitSupplierInvoice(props.isBranch, detail.value.id); showSuccess('Invoice submitted.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
async function doVoid() {
  if (!detail.value) return
  if (!(await confirmAction({ title: 'Void invoice', message: 'Void this invoice?', danger: true }))) return
  acting.value = true
  try { detail.value = await voidSupplierInvoice(props.isBranch, detail.value.id) }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
async function decide(action: 'approve' | 'reject') {
  if (!detail.value) return
  acting.value = true
  try { detail.value = await decideSupplierInvoice(detail.value.id, action); showSuccess(action === 'approve' ? 'Approved.' : 'Rejected.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="!docId">
      <div class="flex items-center justify-between">
        <AppSelect v-model="statusFilter" class="w-44" :options="[
          { value: '', label: 'All invoices' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'OPEN', label: 'Open' },
          { value: 'PARTIALLY_PAID', label: 'Partially paid' },
          { value: 'PAID', label: 'Paid' },
          { value: 'VOID', label: 'Void' },
        ]" />
        <AppButton variant="primary" size="md" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Add supplier invoice
        </AppButton>
      </div>

      <AppCard padding="none">
        <div class="overflow-x-auto">
          <table class="w-full min-w-160 text-sm">
            <thead><tr class="bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
              <th class="px-4 py-3">Invoice</th><th class="px-4 py-3">Supplier</th><th class="px-4 py-3">Due</th>
              <th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3 text-right">Outstanding</th>
              <th class="px-4 py-3">Status</th><th class="px-4 py-3">Approval</th>
            </tr></thead>
            <tbody v-if="loading"><tr><td colspan="7" class="px-4 py-10 text-center text-text-muted">Loading…</td></tr></tbody>
            <tbody v-else-if="!invoices.length"><tr><td colspan="7" class="px-4 py-10 text-center text-text-muted">No supplier invoices.</td></tr></tbody>
            <tbody v-else>
              <tr v-for="inv in invoices" :key="inv.id" class="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer" @click="router.push(detailRoute(inv.id))">
                <td class="px-4 py-3.5 font-semibold text-text-primary">{{ inv.invoice_number }}</td>
                <td class="px-4 py-3.5 text-text-secondary">{{ inv.supplier?.legal_name ?? '—' }}</td>
                <td class="px-4 py-3.5 text-text-secondary">{{ inv.due_date ? formatDate(inv.due_date) : '—' }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatMoney(inv.total_cents) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatMoney(inv.total_cents - inv.paid_cents) }}</td>
                <td class="px-4 py-3.5"><AppBadge :variant="statusVariant(inv.status)" size="sm">{{ inv.status }}</AppBadge></td>
                <td class="px-4 py-3.5"><AppBadge v-if="inv.approval_status !== 'NOT_REQUIRED'" :variant="inv.approval_status === 'APPROVED' ? 'success' : inv.approval_status === 'REJECTED' ? 'error' : 'warning'" size="sm">{{ inv.approval_status }}</AppBadge><span v-else class="text-text-muted">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <template v-else-if="detail">
      <RouterLink :to="listRoute()" class="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary">
        <ArrowLeftIcon class="w-4 h-4" /> Supplier invoices
      </RouterLink>

      <div class="rounded-xl bg-surface border border-border shadow-sm p-6 flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary tracking-tight">{{ detail.invoice_number }}</h1>
            <p class="text-sm text-text-muted">{{ detail.supplier?.legal_name }} · {{ detail.currency }}</p>
            <div class="flex items-center gap-2 mt-2">
              <AppBadge :variant="statusVariant(detail.status)" size="sm">{{ detail.status }}</AppBadge>
              <AppBadge v-if="detail.approval_status !== 'NOT_REQUIRED'" :variant="detail.approval_status === 'APPROVED' ? 'success' : detail.approval_status === 'REJECTED' ? 'error' : 'warning'" size="sm">{{ detail.approval_status }}</AppBadge>
            </div>
          </div>
          <div class="flex flex-wrap gap-2.5">
            <AppButton v-if="detail.status === 'DRAFT'" variant="primary" size="sm" :loading="acting" @click="doSubmit">Submit</AppButton>
            <AppButton v-if="detail.paid_cents === 0 && detail.status !== 'VOID'" variant="secondary" size="sm" :loading="acting" @click="doVoid">Void</AppButton>
            <template v-if="isOwner && detail.approval_status === 'PENDING'">
              <AppButton variant="secondary" size="sm" :loading="acting" @click="decide('reject')">Reject</AppButton>
              <AppButton variant="primary" size="sm" :loading="acting" @click="decide('approve')">Approve</AppButton>
            </template>
          </div>
        </div>
      </div>

      <AppCard>
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-4">
          <div><dt class="text-text-muted">Invoice date</dt><dd class="font-semibold">{{ detail.invoice_date ? formatDate(detail.invoice_date) : '—' }}</dd></div>
          <div><dt class="text-text-muted">Due date</dt><dd class="font-semibold">{{ detail.due_date ? formatDate(detail.due_date) : '—' }}</dd></div>
          <div><dt class="text-text-muted">Total</dt><dd class="font-semibold">KES {{ formatMoney(detail.total_cents) }}</dd></div>
          <div><dt class="text-text-muted">Outstanding</dt><dd class="font-semibold">KES {{ formatMoney(detail.total_cents - detail.paid_cents) }}</dd></div>
        </dl>
        <table class="w-full text-sm">
          <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
            <th class="py-2">Description</th><th class="py-2">SKU</th><th class="py-2 text-right">Qty</th><th class="py-2 text-right">Unit</th><th class="py-2 text-right">Line total</th>
          </tr></thead>
          <tbody>
            <tr v-for="l in detail.lines" :key="l.id" class="border-b border-border last:border-0">
              <td class="py-2">{{ l.description }}</td><td class="py-2 text-text-secondary">{{ l.sku }}</td>
              <td class="py-2 text-right">{{ (l.quantity_milli ?? 1000) / 1000 }}</td>
              <td class="py-2 text-right">{{ formatMoney(l.unit_price_cents) }}</td>
              <td class="py-2 text-right font-semibold">{{ formatMoney(l.line_total_cents ?? 0) }}</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>

    <AppModal v-model="showCreate" title="Add supplier invoice" size="xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <AppSelect v-model="form.supplier_id" label="Supplier" :options="[{ value: '', label: 'Select supplier' }, ...suppliers.map(s => ({ value: s.id, label: s.legal_name }))]" />
        <AppInput v-model="form.invoice_date" label="Invoice date" type="date" />
        <AppInput v-model="form.due_date" label="Due date" type="date" />
        <AppInput v-model="form.notes" label="Notes" />
      </div>
      <p class="text-xs text-text-muted mb-3">The invoice number and supplier reference are assigned automatically when the draft is created.</p>
      <LineItemsEditor v-model="form.lines" />
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="ghost" @click="showCreate = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="acting" @click="submitCreate">Create invoice</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
