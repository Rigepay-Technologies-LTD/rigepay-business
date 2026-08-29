<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchPendingPayoutApprovals, approvePayoutRequest, rejectPayoutRequest,
  fetchSupplierPayment, decideSupplierPayment,
  fetchPurchaseOrder, decidePurchaseOrder,
  fetchSupplierInvoice, decideSupplierInvoice,
  fetchOrgBranches, fetchOrgMembers,
  type BranchSummary, type OrgMember,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import NativeApprovalPanel from '@/components/NativeApprovalPanel.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ChevronLeftIcon, RefreshCwIcon, CheckIcon, XIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; kind: string; requestId: string }>()
const router = useRouter()
const { showError, showSuccess } = useResponseModal()
const isNative = computed(() => props.kind === 'native')

type PayloadRow = { label: string; value: string }

const loading = ref(true)
const acting = ref<'approve' | 'reject' | null>(null)
const note = ref('')
const branches = ref<BranchSummary[]>([])
const members = ref<OrgMember[]>([])

const kindLabel = computed(() => {
  switch (props.kind) {
    case 'payout': return 'Payout'
    case 'supplier_payment': return 'Supplier payment'
    case 'purchase_order': return 'Purchase order'
    case 'supplier_invoice': return 'Supplier invoice'
    default: return 'Approval'
  }
})
const actionCode = computed(() => `${props.kind.toUpperCase()}_APPROVAL`)

const detail = ref<{
  title: string
  status: string
  amountCents: number | null
  maker: string
  branchId: string | null
  createdAt: string
  updatedAt: string | null
  payload: PayloadRow[]
} | null>(null)

const isActionable = computed(() => {
  const s = (detail.value?.status || '').toUpperCase()
  return ['PENDING', 'PENDING_APPROVAL', 'AWAITING_APPROVAL', 'NEW', 'OPEN'].includes(s)
})

const branchName = computed(() =>
  detail.value?.branchId
    ? (branches.value.find((b) => b.id === detail.value!.branchId)?.name ?? 'Branch')
    : 'Organization',
)

function memberName(id: string) {
  const m = members.value.find((x) => x.id === id)
  if (!m) return id || '—'
  return `${m.first_name} ${m.last_name}`.trim() || m.email
}

function money(cents?: number | null) {
  return cents === null || cents === undefined ? '—' : `KES ${formatMoney(cents)}`
}
function date(v?: string | null) {
  return v ? formatDate(v) : '—'
}

function statusVariant(s: string) {
  const u = (s || '').toUpperCase()
  if (['APPROVED', 'COMPLETED', 'PAID', 'ISSUED'].includes(u)) return 'success'
  if (['REJECTED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(u)) return 'error'
  return 'warning'
}

async function load() {
  if (isNative.value) { loading.value = false; return }
  loading.value = true
  try {
    const [ov, mem] = await Promise.all([
      fetchOrgBranches().catch(() => ({ branches: [] as BranchSummary[] })),
      fetchOrgMembers().catch(() => [] as OrgMember[]),
    ])
    branches.value = ov.branches
    members.value = mem

    if (props.kind === 'payout') {
      const list = await fetchPendingPayoutApprovals()
      const p = list.find((x) => x.id === props.requestId)
      if (!p) {
        detail.value = null
      } else {
        detail.value = {
          title: `${p.recipient_name || 'Recipient'} · ${p.phone_number}`,
          status: p.status,
          amountCents: p.amount_cents,
          maker: memberName(p.initiator_org_member_id),
          branchId: p.branch_id,
          createdAt: p.created_at,
          updatedAt: null,
          payload: [
            { label: 'Recipient name', value: p.recipient_name || '—' },
            { label: 'Phone number', value: p.phone_number },
            { label: 'Amount', value: money(p.amount_cents) },
            { label: 'Fee', value: money(p.fee_cents) },
            { label: 'Remarks', value: p.remarks || '—' },
          ],
        }
      }
    } else if (props.kind === 'supplier_payment') {
      const p = await fetchSupplierPayment(false, props.requestId)
      detail.value = {
        title: p.supplier?.legal_name ?? 'Supplier payment',
        status: p.status,
        amountCents: p.amount_cents,
        maker: '—',
        branchId: p.branch_id ?? null,
        createdAt: p.created_at,
        updatedAt: p.completed_at ?? null,
        payload: [
          { label: 'Supplier', value: p.supplier?.legal_name ?? p.supplier_id },
          { label: 'Amount', value: money(p.amount_cents) },
          { label: 'Fee', value: money(p.fee_cents) },
          { label: 'Currency', value: p.currency },
          { label: 'Reference', value: p.reference || '—' },
          { label: 'Description', value: p.description || '—' },
          { label: 'Provider', value: p.provider || '—' },
          { label: 'Allocations', value: String(p.allocations?.length ?? 0) },
        ],
      }
    } else if (props.kind === 'purchase_order') {
      const po = await fetchPurchaseOrder(false, props.requestId)
      detail.value = {
        title: `${po.po_number} · ${po.supplier?.legal_name ?? 'Supplier'}`,
        status: po.approval_status || po.status,
        amountCents: po.total_cents,
        maker: '—',
        branchId: po.branch_id ?? null,
        createdAt: po.created_at,
        updatedAt: null,
        payload: [
          { label: 'PO number', value: po.po_number },
          { label: 'Supplier', value: po.supplier?.legal_name ?? po.supplier_id },
          { label: 'Issue date', value: date(po.issue_date) },
          { label: 'Expected delivery', value: date(po.expected_delivery_date) },
          { label: 'Currency', value: po.currency },
          { label: 'Subtotal', value: money(po.subtotal_cents) },
          { label: 'Tax', value: money(po.tax_cents) },
          { label: 'Discount', value: money(po.discount_cents) },
          { label: 'Total', value: money(po.total_cents) },
          { label: 'Line items', value: String(po.lines?.length ?? 0) },
          { label: 'Notes', value: po.notes || '—' },
        ],
      }
    } else if (props.kind === 'supplier_invoice') {
      const inv = await fetchSupplierInvoice(false, props.requestId)
      detail.value = {
        title: `${inv.invoice_number} · ${inv.supplier?.legal_name ?? 'Supplier'}`,
        status: inv.approval_status || inv.status,
        amountCents: inv.total_cents,
        maker: '—',
        branchId: inv.branch_id ?? null,
        createdAt: inv.created_at,
        updatedAt: null,
        payload: [
          { label: 'Invoice number', value: inv.invoice_number },
          { label: 'Supplier', value: inv.supplier?.legal_name ?? inv.supplier_id },
          { label: 'Supplier reference', value: inv.supplier_reference || '—' },
          { label: 'Invoice date', value: date(inv.invoice_date) },
          { label: 'Due date', value: date(inv.due_date) },
          { label: 'Currency', value: inv.currency },
          { label: 'Subtotal', value: money(inv.subtotal_cents) },
          { label: 'Tax', value: money(inv.tax_cents) },
          { label: 'Discount', value: money(inv.discount_cents) },
          { label: 'Total', value: money(inv.total_cents) },
          { label: 'Line items', value: String(inv.lines?.length ?? 0) },
          { label: 'Notes', value: inv.notes || '—' },
        ],
      }
    }
  } catch (err) {
    showError(extractErrorMessage(err))
    detail.value = null
  } finally {
    loading.value = false
  }
}
onMounted(load)

const timeline = computed(() => {
  const d = detail.value
  if (!d) return [] as { at: string; label: string; by: string }[]
  const rows = [{ at: d.createdAt, label: 'Approval request created', by: d.maker !== '—' ? `By ${d.maker}` : 'By the initiator' }]
  if (d.updatedAt) rows.push({ at: d.updatedAt, label: `Marked ${d.status}`, by: 'By the system' })
  return rows
})

async function decide(action: 'approve' | 'reject') {
  acting.value = action
  try {
    const reason = note.value.trim() || undefined
    if (props.kind === 'payout') {
      if (action === 'approve') await approvePayoutRequest(props.requestId)
      else await rejectPayoutRequest(props.requestId, reason)
    } else if (props.kind === 'supplier_payment') {
      await decideSupplierPayment(props.requestId, action, reason)
    } else if (props.kind === 'purchase_order') {
      await decidePurchaseOrder(props.requestId, action, reason)
    } else if (props.kind === 'supplier_invoice') {
      await decideSupplierInvoice(props.requestId, action, reason)
    }
    showSuccess(action === 'approve' ? 'Request approved.' : 'Request rejected.')
    note.value = ''
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = null
  }
}

function goBack() {
  router.push({ name: 'org-approvals', params: { orgId: props.orgId } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Approval">
    <NativeApprovalPanel v-if="isNative" :org-id="props.orgId" :request-id="props.requestId" list-route-name="org-approvals" />

    <div v-else class="flex flex-col gap-6 max-w-4xl">
      <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
        <ChevronLeftIcon class="w-3.5 h-3.5" /> Back
      </button>

      <p v-if="loading" class="text-sm text-text-muted">Loading approval…</p>

      <AppCard v-else-if="!detail" class="py-12 text-center">
        <p class="text-sm text-text-muted">This approval request could not be found, or it is no longer pending.</p>
      </AppCard>

      <template v-else>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Approval</p>
            <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ detail.title }}</h1>
            <p class="text-sm text-text-muted mt-1 max-w-lg">
              Review the submitted details, then record your decision. Verification may be required before this
              request can move forward.
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <AppBadge :variant="statusVariant(detail.status)" size="sm">{{ detail.status }}</AppBadge>
              <span class="inline-flex rounded-lg border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{{ kindLabel }}</span>
              <span class="inline-flex rounded-lg border border-border px-2 py-0.5 text-[11px] font-mono text-text-muted">{{ actionCode }}</span>
            </div>
          </div>
          <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
            <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
            Refresh
          </AppButton>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AppCard class="lg:col-span-2">
            <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Amount</dt>
                <dd class="text-base font-bold text-text-primary mt-0.5">{{ money(detail.amountCents) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Maker</dt>
                <dd class="text-sm font-medium text-text-primary mt-0.5">{{ detail.maker }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Scope</dt>
                <dd class="text-sm font-medium text-text-primary mt-0.5">{{ branchName }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Requested</dt>
                <dd class="text-sm font-medium text-text-primary mt-0.5">{{ date(detail.createdAt) }}</dd>
              </div>
            </dl>
          </AppCard>

          <AppCard>
            <h2 class="text-sm font-bold text-text-primary">Your decision</h2>
            <p class="text-xs text-text-muted mt-1">Choose an outcome, add context if needed, then confirm.</p>
            <template v-if="isActionable">
              <textarea
                v-model="note" rows="3" placeholder="Add a note (optional)"
                class="mt-3 w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              />
              <div class="flex gap-2 mt-3">
                <AppButton size="sm" :loading="acting === 'approve'" :disabled="!!acting" @click="decide('approve')">
                  <template #icon><CheckIcon class="w-3.5 h-3.5" /></template>
                  Approve
                </AppButton>
                <AppButton size="sm" variant="secondary" :loading="acting === 'reject'" :disabled="!!acting" @click="decide('reject')">
                  <template #icon><XIcon class="w-3.5 h-3.5" /></template>
                  Reject
                </AppButton>
              </div>
            </template>
            <p v-else class="text-xs text-text-muted mt-3">This approval is not currently actionable.</p>
          </AppCard>
        </div>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-1">Payload</h2>
          <p class="text-xs text-text-muted mb-4">The data submitted with this approval request.</p>
          <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div v-for="r in detail.payload" :key="r.label" class="flex justify-between gap-4">
              <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
              <dd class="font-medium text-text-primary text-right break-all">{{ r.value }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-1">Timeline</h2>
          <p class="text-xs text-text-muted mb-4">A record of the events on this approval.</p>
          <ol class="flex flex-col gap-4">
            <li v-for="(t, i) in timeline" :key="i" class="flex gap-3">
              <div class="flex flex-col items-center">
                <span class="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <span v-if="i < timeline.length - 1" class="w-px flex-1 bg-border mt-1" />
              </div>
              <div>
                <p class="text-xs text-text-muted">{{ date(t.at) }}</p>
                <p class="text-sm font-medium text-text-primary">{{ t.label }}</p>
                <p class="text-xs text-text-muted">{{ t.by }}</p>
              </div>
            </li>
          </ol>
        </AppCard>
      </template>
    </div>
  </DashboardLayout>
</template>
