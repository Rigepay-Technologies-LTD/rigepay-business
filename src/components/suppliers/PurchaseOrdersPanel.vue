<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchPurchaseOrders, fetchPurchaseOrder, createPurchaseOrder, poAction, setPOFulfillment,
  decidePurchaseOrder, fetchSuppliers,
  type PurchaseOrder, type SupplierLineItem, type Supplier,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
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

const isOwner = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType === 'org_member')

const loading = ref(true)
const list = ref<PurchaseOrder[]>([])
const statusFilter = ref('')
const detail = ref<PurchaseOrder | null>(null)
const acting = ref(false)

async function loadList() {
  loading.value = true
  try { list.value = (await fetchPurchaseOrders(props.isBranch, { status: statusFilter.value || undefined })).purchase_orders }
  catch (err) { showError(extractErrorMessage(err)) } finally { loading.value = false }
}
async function loadDetail(id: string) {
  loading.value = true
  try { detail.value = await fetchPurchaseOrder(props.isBranch, id) }
  catch (err) { showError(extractErrorMessage(err)) } finally { loading.value = false }
}
watch(() => props.docId, (id) => { if (id) loadDetail(id); else loadList() })
watch(statusFilter, loadList)
onMounted(() => { if (props.docId) loadDetail(props.docId); else loadList() })

function listRoute() {
  return props.branchId
    ? { name: 'branch-purchase-orders', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-purchase-orders', params: { orgId: props.orgId } }
}
function detailRoute(id: string) {
  return props.branchId
    ? { name: 'branch-purchase-order-detail', params: { orgId: props.orgId, branchId: props.branchId, docId: id } }
    : { name: 'org-purchase-order-detail', params: { orgId: props.orgId, docId: id } }
}
function statusVariant(s: string) {
  if (s === 'ISSUED' || s === 'APPROVED') return 'success'
  if (s === 'CANCELLED') return 'error'
  if (s === 'PENDING_APPROVAL') return 'warning'
  if (s === 'CLOSED') return 'info'
  return 'neutral'
}

const showCreate = ref(false)
const suppliers = ref<Supplier[]>([])
const form = ref<{ supplier_id: string; expected_delivery_date: string; issue_date: string; notes: string; lines: SupplierLineItem[] }>({
  supplier_id: '', expected_delivery_date: '', issue_date: '', notes: '',
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
  if (!form.value.supplier_id) { showError('Supplier is required.'); return }
  acting.value = true
  try {
    const created = await createPurchaseOrder(props.isBranch, {
      supplier_id: form.value.supplier_id,
      expected_delivery_date: form.value.expected_delivery_date || undefined,
      issue_date: form.value.issue_date || undefined,
      notes: form.value.notes || undefined,
      lines: form.value.lines,
    })
    showCreate.value = false
    showSuccess('Draft purchase order created.')
    router.push(detailRoute(created.id))
  } catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}

async function act(action: 'submit' | 'issue' | 'cancel') {
  if (!detail.value) return
  acting.value = true
  try { detail.value = await poAction(props.isBranch, detail.value.id, action); showSuccess('Updated.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
async function decide(action: 'approve' | 'reject') {
  if (!detail.value) return
  acting.value = true
  try { detail.value = await decidePurchaseOrder(detail.value.id, action); showSuccess(action === 'approve' ? 'Approved.' : 'Rejected.') }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
async function setFulfil(v: 'NOT_STARTED' | 'PARTIAL' | 'FULFILLED') {
  if (!detail.value) return
  acting.value = true
  try { detail.value = await setPOFulfillment(props.isBranch, detail.value.id, v) }
  catch (err) { showError(extractErrorMessage(err)) } finally { acting.value = false }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="!docId">
      <div class="flex items-center justify-between">
        <AppSelect v-model="statusFilter" class="w-48" :options="[
          { value: '', label: 'All statuses' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'PENDING_APPROVAL', label: 'Pending approval' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'ISSUED', label: 'Issued' },
          { value: 'CANCELLED', label: 'Cancelled' },
          { value: 'CLOSED', label: 'Closed' },
        ]" />
        <AppButton variant="primary" size="md" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Create purchase order
        </AppButton>
      </div>

      <AppCard padding="none">
        <div class="overflow-x-auto">
          <table class="w-full min-w-160 text-sm">
            <thead><tr class="bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
              <th class="px-4 py-3">PO number</th><th class="px-4 py-3">Supplier</th><th class="px-4 py-3">Expected</th>
              <th class="px-4 py-3 text-right">Amount</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Fulfillment</th>
            </tr></thead>
            <tbody v-if="loading"><tr><td colspan="6" class="px-4 py-10 text-center text-text-muted">Loading…</td></tr></tbody>
            <tbody v-else-if="!list.length"><tr><td colspan="6" class="px-4 py-10 text-center text-text-muted">No purchase orders.</td></tr></tbody>
            <tbody v-else>
              <tr v-for="po in list" :key="po.id" class="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer" @click="router.push(detailRoute(po.id))">
                <td class="px-4 py-3.5 font-semibold text-text-primary">{{ po.po_number }}</td>
                <td class="px-4 py-3.5 text-text-secondary">{{ po.supplier?.legal_name ?? '—' }}</td>
                <td class="px-4 py-3.5 text-text-secondary">{{ po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—' }}</td>
                <td class="px-4 py-3.5 text-right">{{ po.currency }} {{ formatMoney(po.total_cents) }}</td>
                <td class="px-4 py-3.5"><AppBadge :variant="statusVariant(po.status)" size="sm">{{ po.status }}</AppBadge></td>
                <td class="px-4 py-3.5 text-text-secondary">{{ po.fulfillment_status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <template v-else-if="detail">
      <RouterLink :to="listRoute()" class="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary">
        <ArrowLeftIcon class="w-4 h-4" /> Purchase orders
      </RouterLink>

      <div class="rounded-xl bg-surface border border-border shadow-sm p-6 flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary tracking-tight">{{ detail.po_number }}</h1>
            <p class="text-sm text-text-muted">{{ detail.supplier?.legal_name }} · {{ detail.currency }} {{ formatMoney(detail.total_cents) }}</p>
            <div class="flex items-center gap-2 mt-2">
              <AppBadge :variant="statusVariant(detail.status)" size="sm">{{ detail.status }}</AppBadge>
              <AppBadge variant="neutral" size="sm">{{ detail.fulfillment_status }}</AppBadge>
            </div>
          </div>
          <div class="flex flex-wrap gap-2.5">
            <AppButton v-if="detail.status === 'DRAFT'" variant="secondary" size="sm" :loading="acting" @click="act('submit')">Submit for approval</AppButton>
            <AppButton v-if="detail.status === 'DRAFT' || detail.status === 'APPROVED'" variant="primary" size="sm" :loading="acting" @click="act('issue')">Issue</AppButton>
            <AppButton v-if="!['CLOSED', 'CANCELLED'].includes(detail.status)" variant="secondary" size="sm" :loading="acting" @click="act('cancel')">Cancel</AppButton>
            <template v-if="isOwner && detail.approval_status === 'PENDING'">
              <AppButton variant="secondary" size="sm" :loading="acting" @click="decide('reject')">Reject</AppButton>
              <AppButton variant="primary" size="sm" :loading="acting" @click="decide('approve')">Approve</AppButton>
            </template>
          </div>
        </div>
        <div v-if="detail.status === 'ISSUED'" class="flex items-center gap-2">
          <span class="text-xs text-text-muted">Fulfillment:</span>
          <button v-for="f in (['NOT_STARTED', 'PARTIAL', 'FULFILLED'] as const)" :key="f"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold"
            :class="detail.fulfillment_status === f ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary'"
            @click="setFulfil(f)">{{ f }}</button>
        </div>
      </div>

      <AppCard>
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

    <AppModal v-model="showCreate" title="Create purchase order" size="xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <AppSelect v-model="form.supplier_id" label="Supplier" :options="[{ value: '', label: 'Select supplier' }, ...suppliers.map(s => ({ value: s.id, label: s.legal_name }))]" />
        <AppInput v-model="form.issue_date" label="Issue date" type="date" />
        <AppInput v-model="form.expected_delivery_date" label="Expected delivery" type="date" />
        <AppInput v-model="form.notes" label="Notes" />
      </div>
      <LineItemsEditor v-model="form.lines" />
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="ghost" @click="showCreate = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="acting" @click="submitCreate">Save draft</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
