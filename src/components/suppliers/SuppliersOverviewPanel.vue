<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchSuppliersOverview, type SuppliersOverview } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import {
  UsersIcon, BadgeCheckIcon, WalletIcon, CalendarClockIcon, AlertTriangleIcon, ShieldQuestionIcon, ChevronRightIcon,
} from 'lucide-vue-next'

const props = defineProps<{ isBranch: boolean; orgId: string; branchId?: string }>()
const { showError } = useResponseModal()

const loading = ref(true)
const data = ref<SuppliersOverview | null>(null)

onMounted(async () => {
  try {
    data.value = await fetchSuppliersOverview(props.isBranch)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
})

function supplierRoute(id: string) {
  return props.branchId
    ? { name: 'branch-supplier-detail', params: { orgId: props.orgId, branchId: props.branchId, supplierId: id } }
    : { name: 'org-supplier-detail', params: { orgId: props.orgId, supplierId: id } }
}
function payablesRoute() {
  return props.branchId
    ? { name: 'branch-supplier-payables', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-supplier-payables', params: { orgId: props.orgId } }
}
function suppliersRoute() {
  return props.branchId
    ? { name: 'branch-suppliers', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-suppliers', params: { orgId: props.orgId } }
}

const tiles = computed(() => {
  if (!data.value) return []
  const p = data.value.payables
  return [
    { label: 'Active suppliers', value: String(data.value.active_suppliers), icon: UsersIcon, tone: 'text-text-primary', bg: 'bg-primary-muted text-primary' },
    { label: 'Payment ready', value: String(data.value.payment_ready), icon: BadgeCheckIcon, tone: 'text-success', bg: 'bg-success-light text-success' },
    { label: 'Outstanding payables', value: `KES ${formatMoney(p.outstanding_cents)}`, icon: WalletIcon, tone: 'text-text-primary', bg: 'bg-surface-2 text-text-secondary' },
    { label: 'Due this week', value: `KES ${formatMoney(p.due_this_week_cents)}`, icon: CalendarClockIcon, tone: 'text-warning', bg: 'bg-warning-light text-warning' },
    { label: 'Overdue', value: `KES ${formatMoney(p.overdue_cents)}`, icon: AlertTriangleIcon, tone: 'text-error', bg: 'bg-error-light text-error' },
    { label: 'Pending verification', value: String(data.value.pending_verification), icon: ShieldQuestionIcon, tone: 'text-text-primary', bg: 'bg-surface-2 text-text-secondary' },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="loading" class="text-sm text-text-muted">Loading overview…</p>

    <template v-else-if="data">
      <section class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <AppCard v-for="t in tiles" :key="t.label" padding="sm" class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{{ t.label }}</p>
            <p class="text-xl font-bold mt-1.5 truncate" :class="t.tone">{{ t.value }}</p>
          </div>
          <span class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="t.bg">
            <component :is="t.icon" class="w-4.5 h-4.5" />
          </span>
        </AppCard>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Attention required -->
        <AppCard>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-text-primary">Attention required</h2>
            <RouterLink :to="suppliersRoute()" class="text-xs font-semibold text-primary hover:underline">All suppliers</RouterLink>
          </div>
          <p v-if="!data.attention.length" class="text-sm text-text-muted py-2">No supplier items need attention.</p>
          <ul v-else class="flex flex-col divide-y divide-border">
            <RouterLink
              v-for="a in data.attention" :key="a.supplier_id"
              :to="supplierRoute(a.supplier_id)"
              class="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary truncate">{{ a.legal_name }}</p>
                <p class="text-xs text-warning">{{ a.reason }}</p>
              </div>
              <ChevronRightIcon class="w-4 h-4 text-text-muted shrink-0" />
            </RouterLink>
          </ul>
        </AppCard>

        <!-- Upcoming payables -->
        <AppCard>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-text-primary">Upcoming payables</h2>
            <RouterLink :to="payablesRoute()" class="text-xs font-semibold text-primary hover:underline">View all</RouterLink>
          </div>
          <p v-if="!data.upcoming_payables.length" class="text-sm text-text-muted py-2">No outstanding invoices.</p>
          <ul v-else class="flex flex-col divide-y divide-border">
            <li v-for="inv in data.upcoming_payables" :key="inv.id" class="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="font-semibold text-text-primary truncate">{{ inv.supplier?.legal_name ?? 'Supplier' }}</p>
                <p class="text-xs text-text-muted">{{ inv.invoice_number }} · due {{ inv.due_date ? formatDate(inv.due_date) : '—' }}</p>
              </div>
              <span class="font-semibold text-text-primary shrink-0">KES {{ formatMoney(inv.total_cents - inv.paid_cents) }}</span>
            </li>
          </ul>
        </AppCard>

        <!-- Recent supplier payments -->
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Recent supplier payments</h2>
          <p v-if="!data.recent_payments.length" class="text-sm text-text-muted py-2">No payments have been made to suppliers.</p>
          <ul v-else class="flex flex-col divide-y divide-border">
            <li v-for="pay in data.recent_payments" :key="pay.id" class="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="font-semibold text-text-primary truncate">{{ pay.supplier?.legal_name ?? pay.reference ?? 'Payment' }}</p>
                <p class="text-xs text-text-muted">{{ pay.status }} · {{ formatDate(pay.created_at) }}</p>
              </div>
              <span class="font-semibold text-text-primary shrink-0">KES {{ formatMoney(pay.amount_cents) }}</span>
            </li>
          </ul>
        </AppCard>

        <!-- Recent suppliers -->
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Recent suppliers</h2>
          <p v-if="!data.recent_suppliers.length" class="text-sm text-text-muted py-2">No suppliers yet.</p>
          <ul v-else class="flex flex-col divide-y divide-border">
            <RouterLink
              v-for="sup in data.recent_suppliers" :key="sup.id"
              :to="supplierRoute(sup.id)"
              class="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary truncate">{{ sup.legal_name }}</p>
                <p class="text-xs text-text-muted font-mono">{{ sup.supplier_code || '—' }}</p>
              </div>
              <ChevronRightIcon class="w-4 h-4 text-text-muted shrink-0" />
            </RouterLink>
          </ul>
        </AppCard>
      </div>
    </template>
  </div>
</template>
