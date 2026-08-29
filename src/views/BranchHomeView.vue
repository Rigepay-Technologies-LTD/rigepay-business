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
  fetchOrgDashboardKpis,
  fetchBranchDashboardKpis,
  fetchBranchAnalyticsDetail,
  fetchBranchFinancialAccounts,
  type WalletBalances,
  type PaginatedTransactions,
  type BranchSummary,
  type BranchProfileDetail,
  type Transaction,
  type CashFlowDayPoint,
  type DashboardKpis,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, txnReference } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import CashFlowChart from '@/components/CashFlowChart.vue'
import DashboardHero from '@/components/DashboardHero.vue'
import DashboardKpiRow from '@/components/DashboardKpiRow.vue'
import DashboardSecondaryStats from '@/components/DashboardSecondaryStats.vue'
import type { QuickAction } from '@/components/QuickActions.vue'
import {
  WalletIcon, BanknoteIcon, LinkIcon, ReceiptIcon, CoinsIcon, ArrowLeftRightIcon,
  SparklesIcon, CheckCircle2Icon,
} from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()

const auth = useAuthStore()
const { showError } = useResponseModal()

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

const kpis = ref<DashboardKpis | null>(null)
const kpiLoading = ref(true)
const refreshing = ref(false)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const branchStatus = computed(() => {
  const s = branchProfile.value?.status ?? branchInfo.value?.status
  if (s === 'active') return { label: 'Active', variant: 'success' as const }
  if (s === 'suspended') return { label: 'Suspended', variant: 'error' as const }
  if (s) return { label: s.replace(/_/g, ' '), variant: 'warning' as const }
  return undefined
})

const insights = computed<string[]>(() => {
  const out: string[] = []
  const c = kpis.value?.todays_collections
  if (c && c.delta_dir !== 'flat') {
    out.push(
      `Today's collections are ${c.delta_dir === 'up' ? 'up' : 'down'} ${Math.abs(c.delta_pct) >= 100 ? '100+' : Math.abs(c.delta_pct).toFixed(0)}% versus yesterday.`,
    )
  }
  const due = kpis.value?.settlement_due_cents ?? 0
  if (due > 0) out.push(`KES ${formatMoney(due)} is held on high-risk rails and will settle to this branch's main wallet within 72h.`)
  return out
})

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
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
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
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
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

async function loadKpis() {
  kpiLoading.value = true
  try {
    kpis.value = isOrgMemberView.value
      ? await fetchOrgDashboardKpis(props.branchId)
      : await fetchBranchDashboardKpis()
  } catch {
    kpis.value = null
  } finally {
    kpiLoading.value = false
  }
}

async function refreshAll() {
  refreshing.value = true
  await Promise.allSettled([loadWallets(), loadTransactions(), loadCashFlow(), loadKpis()])
  refreshing.value = false
}

const quickActions = computed<QuickAction[]>(() => {
  const base = { orgId: props.orgId, branchId: props.branchId }
  return [
    { label: 'New collection', icon: WalletIcon, to: { name: 'branch-collect', params: base } },
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
  loadKpis()
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

      <DashboardHero
        :greeting="greeting"
        :name="branchInfo?.name ?? branchProfile?.name"
        subtitle="Here's this branch's summary for today."
        :status-label="branchStatus?.label"
        :status-variant="branchStatus?.variant"
        :actions="quickActions"
        :refreshing="refreshing"
        @refresh="refreshAll"
      />

      <DashboardKpiRow :kpis="kpis" :loading="kpiLoading" settlement-hint="No settlement scheduled" />

      <DashboardSecondaryStats :analytics-fetcher="() => fetchBranchAnalyticsDetail()" :accounts-fetcher="() => fetchBranchFinancialAccounts()" />

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AppCard class="xl:col-span-2">
          <h2 class="text-sm font-bold text-text-primary mb-1">Cash flow — last 14 days</h2>
          <p class="text-xs text-text-muted mb-4">Collections and payouts through this branch's own wallet.</p>
          <p v-if="cashFlowLoading" class="text-sm text-text-muted">Loading chart…</p>
          <p v-else-if="!cashFlow.length" class="text-sm text-text-muted">No activity in the last 14 days.</p>
          <CashFlowChart v-else :points="cashFlow" />
        </AppCard>

        <AppCard>
          <div class="flex items-center gap-2 mb-3">
            <span class="w-8 h-8 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
              <SparklesIcon class="w-4 h-4" />
            </span>
            <h2 class="text-sm font-bold text-text-primary">Insights</h2>
          </div>
          <div v-if="insights.length" class="flex flex-col gap-2">
            <p v-for="(line, i) in insights" :key="i" class="text-[13px] text-text-secondary bg-surface-2 rounded-xl px-3.5 py-2.5 leading-snug">
              {{ line }}
            </p>
          </div>
          <div v-else class="flex flex-col items-start gap-2 rounded-xl bg-success-light px-3.5 py-4">
            <CheckCircle2Icon class="w-6 h-6 text-success" />
            <p class="text-sm font-semibold text-text-primary">You're all caught up</p>
            <p class="text-xs text-text-muted">There are no urgent updates requiring your attention.</p>
          </div>
        </AppCard>
      </div>

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
