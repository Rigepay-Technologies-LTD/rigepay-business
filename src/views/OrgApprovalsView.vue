<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchPendingPayoutApprovals,
  fetchOrgBranches,
  fetchSupplierPayments,
  fetchPurchaseOrders,
  fetchSupplierInvoices,
  fetchOrgApprovals,
  type PayoutApproval, type BranchSummary, type ApprovalRequest,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { SearchIcon, RefreshCwIcon, FilterIcon, InboxIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const router = useRouter()
const { showError } = useResponseModal()

type ApprovalKind = 'native' | 'payout' | 'supplier_payment' | 'purchase_order' | 'supplier_invoice'

interface ApprovalItem {
  id: string
  kind: ApprovalKind
  kindLabel: string
  actionCode: string
  title: string
  subtitle: string
  amountCents: number | null
  status: string
  createdAt: string
  branchId: string | null
}

function prettyAction(code: string) {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const loading = ref(true)
const items = ref<ApprovalItem[]>([])
const branches = ref<BranchSummary[]>([])
const search = ref('')
const searchApplied = ref('')
const statusFilter = ref('READY')
const page = ref(1)
const pageSize = 10

const statusOptions = [
  { value: 'READY', label: 'Ready to act' },
  { value: 'ALL', label: 'All requests' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'EXPIRED', label: 'Expired' },
]

const branchName = (id: string | null) =>
  id ? (branches.value.find((b) => b.id === id)?.name ?? 'Branch') : 'Organization'

function mapPayout(p: PayoutApproval): ApprovalItem {
  return {
    id: p.id,
    kind: 'payout',
    kindLabel: 'Payout',
    actionCode: 'PAYOUT_APPROVAL',
    title: `${p.recipient_name || 'Recipient'} · ${p.phone_number}`,
    subtitle: p.remarks || 'No remarks',
    amountCents: p.amount_cents,
    status: p.status,
    createdAt: p.created_at,
    branchId: p.branch_id,
  }
}

function mapNative(r: ApprovalRequest): ApprovalItem {
  return {
    id: r.id,
    kind: 'native',
    kindLabel: prettyAction(r.action_type),
    actionCode: r.action_type,
    title: r.title || prettyAction(r.action_type),
    subtitle: r.description || '',
    amountCents: r.amount_cents ?? null,
    status: r.status,
    createdAt: r.created_at,
    branchId: r.branch_id ?? null,
  }
}

async function load() {
  loading.value = true
  try {
    const [native, payouts, overview, supPayments, pos, invoices] = await Promise.all([
      fetchOrgApprovals({ status: 'ALL', page_size: 100 }).catch(() => ({ approvals: [] as ApprovalRequest[], total_count: 0, page: 1, page_size: 100, total_pages: 1 })),
      fetchPendingPayoutApprovals().catch(() => [] as PayoutApproval[]),
      fetchOrgBranches().catch(() => ({ branches: [] as BranchSummary[] }) as Awaited<ReturnType<typeof fetchOrgBranches>>),
      fetchSupplierPayments(false, { status: 'PENDING_APPROVAL' }).catch(() => ({ payments: [], total: 0 })),
      fetchPurchaseOrders(false, { status: 'PENDING_APPROVAL' }).catch(() => ({ purchase_orders: [], total: 0 })),
      fetchSupplierInvoices(false, { status: 'OPEN' }).catch(() => ({ invoices: [], total: 0 })),
    ])
    branches.value = overview.branches

    const nativeItems: ApprovalItem[] = native.approvals.map(mapNative)

    const supPaymentItems: ApprovalItem[] = supPayments.payments.map((p) => ({
      id: p.id, kind: 'supplier_payment', kindLabel: 'Supplier payment', actionCode: 'SUPPLIER_PAYMENT_APPROVAL',
      title: p.supplier?.legal_name ?? 'Supplier', subtitle: p.description || p.reference || 'No note',
      amountCents: p.amount_cents, status: 'PENDING', createdAt: p.created_at, branchId: p.branch_id ?? null,
    }))
    const poItems: ApprovalItem[] = pos.purchase_orders
      .filter((po) => !po.approval_request_id)
      .map((po) => ({
        id: po.id, kind: 'purchase_order', kindLabel: 'Purchase order', actionCode: 'PURCHASE_ORDER_APPROVAL',
        title: `${po.po_number} · ${po.supplier?.legal_name ?? 'Supplier'}`, subtitle: po.notes || 'No note',
        amountCents: po.total_cents, status: 'PENDING', createdAt: po.created_at, branchId: po.branch_id ?? null,
      }))
    const invoiceItems: ApprovalItem[] = invoices.invoices
      .filter((i) => i.approval_status === 'PENDING' && !i.approval_request_id)
      .map((i) => ({
        id: i.id, kind: 'supplier_invoice', kindLabel: 'Supplier invoice', actionCode: 'SUPPLIER_INVOICE_APPROVAL',
        title: `${i.invoice_number} · ${i.supplier?.legal_name ?? 'Supplier'}`, subtitle: i.notes || 'No note',
        amountCents: i.total_cents, status: 'PENDING', createdAt: i.created_at, branchId: i.branch_id ?? null,
      }))

    items.value = [...nativeItems, ...payouts.map(mapPayout), ...supPaymentItems, ...poItems, ...invoiceItems]
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const isActionable = (s: string) => ['PENDING', 'PARTIALLY_APPROVED', 'AWAITING_APPROVAL', 'NEW', 'OPEN'].includes(s.toUpperCase())

function applyFilters() {
  searchApplied.value = search.value.trim().toLowerCase()
  page.value = 1
}

const filtered = computed(() =>
  items.value.filter((it) => {
    if (statusFilter.value === 'READY' && !isActionable(it.status)) return false
    if (['APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED'].includes(statusFilter.value) && it.status.toUpperCase() !== statusFilter.value) return false
    const q = searchApplied.value
    if (!q) return true
    return (
      it.title.toLowerCase().includes(q) ||
      it.subtitle.toLowerCase().includes(q) ||
      it.kindLabel.toLowerCase().includes(q) ||
      branchName(it.branchId).toLowerCase().includes(q)
    )
  }),
)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const rangeStart = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * pageSize, filtered.value.length))

function statusVariant(s: string) {
  const u = s.toUpperCase()
  if (['APPROVED', 'COMPLETED', 'PAID'].includes(u)) return 'success'
  if (['REJECTED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(u)) return 'error'
  return 'warning'
}

function openDetail(it: ApprovalItem) {
  router.push({ name: 'org-approval-detail', params: { orgId: props.orgId, kind: it.kind, requestId: it.id } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Approvals">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Maker-checker</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Approvals</h1>
          <p class="text-sm text-text-muted mt-0.5">Review approval requests assigned to your roles and permissions.</p>
        </div>
        <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
          <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
          Refresh
        </AppButton>
      </div>

      <AppCard>
        <div class="flex flex-wrap items-end gap-3">
          <div class="relative flex-1 min-w-56">
            <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              v-model="search" type="text" placeholder="Search approvals"
              class="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              @keydown.enter="applyFilters"
            />
          </div>
          <AppSelect v-model="statusFilter" :options="statusOptions" class="w-48" />
          <AppButton size="md" @click="applyFilters">
            <template #icon><FilterIcon class="w-4 h-4" /></template>
            Apply
          </AppButton>
        </div>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading approval queue…</p>

      <AppCard v-else-if="!filtered.length" class="flex flex-col items-center gap-3 py-16 text-center">
        <div class="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
          <InboxIcon class="w-5 h-5 text-text-muted" />
        </div>
        <p class="text-sm font-medium text-text-muted">
          {{ searchApplied || statusFilter !== 'ALL' ? 'Nothing matches this filter.' : 'No approval requests yet.' }}
        </p>
      </AppCard>

      <AppCard v-else padding="none">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Request</th>
                <th class="px-5 py-3">Action</th>
                <th class="px-5 py-3">Maker scope</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="it in paged" :key="it.id"
                class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer align-top"
                @click="openDetail(it)"
              >
                <td class="px-5 py-3">
                  <span class="block font-medium text-text-primary">{{ it.title }}</span>
                  <span class="block font-mono text-[11px] text-text-muted">{{ it.id }}</span>
                </td>
                <td class="px-5 py-3 font-mono text-xs text-text-secondary">{{ it.actionCode }}</td>
                <td class="px-5 py-3 text-text-secondary">{{ branchName(it.branchId) }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                  {{ it.amountCents !== null ? `KES ${formatMoney(it.amountCents)}` : '—' }}
                </td>
                <td class="px-5 py-3">
                  <AppBadge :variant="statusVariant(it.status)" size="sm">{{ it.status }}</AppBadge>
                </td>
                <td class="px-5 py-3 text-text-muted whitespace-nowrap">{{ formatDate(it.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <p class="text-xs text-text-muted">Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filtered.length }}</p>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--">Previous</AppButton>
            <AppButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
