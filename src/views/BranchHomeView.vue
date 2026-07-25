<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBranchWallets,
  fetchBranchTransactions,
  fetchOrgBranches,
  fetchOrgTransactions,
  fetchBranchProfile,
  fetchBranchCashFlow,
  type WalletBalances,
  type PaginatedTransactions,
  type BranchSummary,
  type BranchProfileDetail,
  type Transaction,
  type CashFlowDayPoint,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, txnReference, riskTier } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import CashFlowChart from '@/components/CashFlowChart.vue'
import QuickActions, { type QuickAction } from '@/components/QuickActions.vue'
import { WalletIcon, BanknoteIcon, LinkIcon, ReceiptIcon, CoinsIcon, ArrowLeftRightIcon, ShieldCheckIcon, AlertOctagonIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()

const auth = useAuthStore()


const isOrgMemberView = computed(() => auth.meta?.memberType === 'org_member')

const loading = ref(true)
const error = ref<string | null>(null)
const wallets = ref<WalletBalances | null>(null)
const branchInfo = ref<BranchSummary | null>(null)
const branchProfile = ref<BranchProfileDetail | null>(null)
const siblingBranches = ref<BranchSummary[]>([])

const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)

const cashFlow = ref<CashFlowDayPoint[]>([])
const cashFlowLoading = ref(true)

async function loadWallets() {
  loading.value = true
  error.value = null
  try {
    if (isOrgMemberView.value) {
      const overview = await fetchOrgBranches()
      siblingBranches.value = overview.branches
      const match = overview.branches.find((b) => b.id === props.branchId)
      if (!match) {
        error.value = 'Branch not found in this organization.'
        return
      }
      branchInfo.value = match
      wallets.value = { main_cents: match.main_cents, escrow_cents: match.escrow_cents, chargeback_cents: match.chargeback_cents }
      branchProfile.value = match
    } else {
      wallets.value = await fetchBranchWallets()
      branchProfile.value = await fetchBranchProfile()
    }
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadTransactions() {
  txnLoading.value = true
  try {
    const params = { page: 1, page_size: 5 }
    txns.value = isOrgMemberView.value
      ? await fetchOrgTransactions({ ...params, branch_id: props.branchId })
      : await fetchBranchTransactions(params)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    txnLoading.value = false
  }
}

async function loadCashFlow() {
  cashFlowLoading.value = true
  try {
    cashFlow.value = await fetchBranchCashFlow(14)
  } catch {
    cashFlow.value = []
  } finally {
    cashFlowLoading.value = false
  }
}

const quickActions = computed<QuickAction[]>(() => {
  const base = { orgId: props.orgId, branchId: props.branchId }
  return [
    { label: 'Collect', icon: WalletIcon, to: { name: 'branch-collect', params: base } },
    {
      label: 'Send payout', icon: BanknoteIcon,
      to: isOrgMemberView.value
        ? { name: 'org-payouts', params: { orgId: props.orgId }, query: { branch: props.branchId } }
        : { name: 'branch-payouts', params: base },
    },
    { label: 'Payment link', icon: LinkIcon, to: { name: 'branch-payment-links', params: base } },
    { label: 'Expenses', icon: ReceiptIcon, to: { name: 'branch-expenses', params: base } },
    { label: 'Petty cash', icon: CoinsIcon, to: { name: 'branch-petty-cash', params: base } },
    {
      label: 'Transfers', icon: ArrowLeftRightIcon,
      to: isOrgMemberView.value
        ? { name: 'org-transfers', params: { orgId: props.orgId } }
        : { name: 'branch-transfers', params: base },
    },
  ]
})

onMounted(() => {
  loadWallets()
  loadTransactions()
  loadCashFlow()
})

const txnColumns = [
  { key: 'created_at', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'amountCents', label: 'Amount', class: 'text-right' },
]

function statusVariant(status: string) {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}
</script>

<template>
  <DashboardLayout
    :org-id="props.orgId"
    :branch-id="props.branchId"
    :branches="isOrgMemberView ? siblingBranches : undefined"
    :title="branchInfo?.name ?? branchProfile?.name ?? 'Branch dashboard'"
  >
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <QuickActions :actions="quickActions" />

      <section class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="rounded-2xl bg-linear-to-br from-primary to-primary/80 text-white p-5 flex flex-col gap-3 shadow-sm sm:col-span-2">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
              <WalletIcon class="w-4 h-4" />Branch main balance
            </span>
            <span v-if="branchProfile?.collection_code" class="text-[10px] font-bold uppercase tracking-wide bg-white/15 rounded-full px-2 py-1">
              Code {{ branchProfile.collection_code }}
            </span>
          </div>
          <p class="text-3xl font-bold tracking-tight">KES {{ formatMoney(wallets?.main_cents) }}</p>
          <AppBadge v-if="branchProfile" :variant="riskTier(branchProfile.risk_score).variant" size="sm" class="self-start">
            {{ riskTier(branchProfile.risk_score).label }}{{ branchProfile.risk_score > 0 ? ` (${branchProfile.risk_score}/100)` : '' }}
          </AppBadge>
        </div>
        <div class="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 shadow-sm">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <ShieldCheckIcon class="w-4 h-4 text-info" />Escrow balance
          </span>
          <p class="text-2xl font-bold text-text-primary tracking-tight">KES {{ formatMoney(wallets?.escrow_cents) }}</p>
        </div>
        <div class="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 shadow-sm">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <AlertOctagonIcon class="w-4 h-4 text-warning" />Chargeback holding
          </span>
          <p class="text-2xl font-bold text-text-primary tracking-tight">KES {{ formatMoney(wallets?.chargeback_cents) }}</p>
        </div>
      </section>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Cash flow — last 14 days</h2>
        <p class="text-xs text-text-muted mb-4">Collections and payouts through this branch's own wallet.</p>
        <p v-if="cashFlowLoading" class="text-sm text-text-muted">Loading chart…</p>
        <p v-else-if="!cashFlow.length" class="text-sm text-text-muted">No activity in the last 14 days.</p>
        <CashFlowChart v-else :points="cashFlow" />
      </AppCard>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Recent transactions</h2>
          <router-link
            :to="{ name: 'branch-transactions', params: { orgId: props.orgId, branchId: props.branchId } }"
            class="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </router-link>
        </div>

        <AppTable :columns="txnColumns" :rows="txns?.transactions ?? []" :loading="txnLoading" empty-message="No transactions found.">
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
          <template #cell-reference="{ row }">{{ txnReference(row as unknown as Transaction) }}</template>
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-amountCents="{ value }">KES {{ formatMoney(value as number) }}</template>
        </AppTable>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
