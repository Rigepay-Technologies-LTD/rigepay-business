<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBranches, fetchOrgTransactions, fetchOrgProfile, fetchOrgTransaction, fetchOrgCashFlow, fetchBranchAnalytics,
  fetchOrgDashboardKpis, fetchOrgAnalyticsDetail, fetchOrgFinancialAccounts, fetchOrgNextSettlement,
  type NextSettlement,
  type BranchesResponse, type PaginatedTransactions, type ProfileResponse,
  type Transaction, type TransactionDetail, type CashFlowDayPoint, type BranchAnalytics, type DashboardKpis,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, txnReference } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CashFlowChart from '@/components/CashFlowChart.vue'
import BranchLeaderboardChart from '@/components/BranchLeaderboardChart.vue'
import DashboardHero from '@/components/DashboardHero.vue'
import DashboardKpiRow from '@/components/DashboardKpiRow.vue'
import DashboardSecondaryStats from '@/components/DashboardSecondaryStats.vue'
import DashboardApprovalsWidget from '@/components/DashboardApprovalsWidget.vue'
import VerificationRequestBanner from '@/components/VerificationRequestBanner.vue'
import type { QuickAction } from '@/components/QuickActions.vue'
import {
  WalletIcon, BanknoteIcon, LinkIcon, UsersIcon, VaultIcon, ArrowLeftRightIcon,
  ClipboardCheckIcon, SparklesIcon, CheckCircle2Icon,
} from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<BranchesResponse | null>(null)
const profile = ref<ProfileResponse | null>(null)

const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)

const cashFlow = ref<CashFlowDayPoint[]>([])
const cashFlowLoading = ref(true)

const branchAnalytics = ref<BranchAnalytics | null>(null)
const branchAnalyticsLoading = ref(true)

const kpis = ref<DashboardKpis | null>(null)
const kpiLoading = ref(true)
const nextSettlement = ref<NextSettlement | null>(null)
const refreshing = ref(false)

const quickActions = computed<QuickAction[]>(() => [
  { label: 'New collection', icon: WalletIcon, to: { name: 'org-collect', params: { orgId: props.orgId } } },
  { label: 'Send payout', icon: BanknoteIcon, to: { name: 'org-payouts', params: { orgId: props.orgId } } },
  { label: 'Payment link', icon: LinkIcon, to: { name: 'org-payment-links', params: { orgId: props.orgId } } },
  { label: 'Transfer funds', icon: ArrowLeftRightIcon, to: { name: 'org-transfers', params: { orgId: props.orgId } } },
  { label: 'Approvals', icon: ClipboardCheckIcon, to: { name: 'org-approvals', params: { orgId: props.orgId } } },
  { label: 'Invite member', icon: UsersIcon, to: { name: 'org-members', params: { orgId: props.orgId } } },
  { label: 'Vaults', icon: VaultIcon, to: { name: 'org-vaults', params: { orgId: props.orgId } } },
])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const orgStatus = computed(() => {
  const s = profile.value?.organization.status
  if (s === 'approved') return { label: 'Active', variant: 'success' as const }
  if (s === 'suspended') return { label: 'Suspended', variant: 'error' as const }
  if (s) return { label: s.replace(/_/g, ' '), variant: 'warning' as const }
  return undefined
})

const insights = computed<string[]>(() => {
  const out: string[] = []
  if (branchAnalytics.value?.highlights?.length) out.push(...branchAnalytics.value.highlights.slice(0, 2))
  const c = kpis.value?.todays_collections
  if (c && c.delta_dir !== 'flat') {
    out.push(
      `Today's collections are ${c.delta_dir === 'up' ? 'up' : 'down'} ${Math.abs(c.delta_pct) >= 100 ? '100+' : Math.abs(c.delta_pct).toFixed(0)}% versus yesterday.`,
    )
  }
  const due = kpis.value?.settlement_due_cents ?? 0
  if (due > 0) out.push(`KES ${formatMoney(due)} is held on high-risk rails and will settle to your main wallet within 72h.`)
  return out
})

async function loadOverview() {
  loading.value = true
  error.value = null
  try {
    overview.value = await fetchOrgBranches()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

async function loadProfile() {
  try {
    profile.value = await fetchOrgProfile()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

async function loadCashFlow() {
  cashFlowLoading.value = true
  try {
    cashFlow.value = await fetchOrgCashFlow(14)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    cashFlowLoading.value = false
  }
}

async function loadTransactions() {
  txnLoading.value = true
  try {
    txns.value = await fetchOrgTransactions({ page: 1, page_size: 5 })
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    txnLoading.value = false
  }
}

async function loadBranchAnalytics() {
  branchAnalyticsLoading.value = true
  try {
    branchAnalytics.value = await fetchBranchAnalytics()
  } catch {
    branchAnalytics.value = null
  } finally {
    branchAnalyticsLoading.value = false
  }
}

async function loadKpis() {
  kpiLoading.value = true
  try {
    kpis.value = await fetchOrgDashboardKpis()
  } catch {
    kpis.value = null
  } finally {
    kpiLoading.value = false
  }
  try {
    nextSettlement.value = await fetchOrgNextSettlement()
  } catch {
    nextSettlement.value = null
  }
}

async function refreshAll() {
  refreshing.value = true
  await Promise.allSettled([loadOverview(), loadProfile(), loadCashFlow(), loadTransactions(), loadBranchAnalytics(), loadKpis()])
  refreshing.value = false
}

onMounted(() => {
  loadOverview()
  loadProfile()
  loadCashFlow()
  loadTransactions()
  loadBranchAnalytics()
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
  if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'active') return 'success'
  if (status === 'FAILED' || status === 'suspended') return 'error'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}

const selectedTxnDetail = ref<TransactionDetail | null>(null)
const txnDetailLoading = ref(false)
const txnDetailError = ref<string | null>(null)
const showTxnDetail = ref(false)

async function openTxnDetail(row: Record<string, unknown>) {
  const txn = row as unknown as Transaction
  showTxnDetail.value = true
  txnDetailLoading.value = true
  txnDetailError.value = null
  selectedTxnDetail.value = null
  try {
    selectedTxnDetail.value = await fetchOrgTransaction(txn.id)
  } catch (err) {
    const msg = extractErrorMessage(err)
    txnDetailError.value = msg
    showError(msg)
  } finally {
    txnDetailLoading.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branches="overview?.branches ?? []" title="Organization overview">
    <div class="flex flex-col gap-6">
      <VerificationRequestBanner />
      <DashboardHero
        :greeting="greeting"
        :name="profile?.member.first_name"
        :status-label="orgStatus?.label"
        :status-variant="orgStatus?.variant"
        :actions="quickActions"
        :refreshing="refreshing"
        @refresh="refreshAll"
      />

      <DashboardKpiRow :kpis="kpis" :loading="kpiLoading" :next-settlement="nextSettlement" settlement-hint="No settlement scheduled" />

      <DashboardSecondaryStats :analytics-fetcher="() => fetchOrgAnalyticsDetail()" :accounts-fetcher="() => fetchOrgFinancialAccounts()" />

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AppCard class="xl:col-span-2">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-sm font-bold text-text-primary">Cash flow — last 14 days</h2>
            <span class="text-xs text-text-muted">{{ overview?.branch_count ?? 0 }} branch{{ overview?.branch_count === 1 ? '' : 'es' }}</span>
          </div>
          <p class="text-xs text-text-muted mb-4">Collections and payouts across the organization's own wallet and every branch.</p>
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

        <DashboardApprovalsWidget class="xl:col-span-3" :is-branch="false" route-name="org-approvals" />
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AppCard
          v-if="branchAnalyticsLoading || branchAnalytics?.branches?.length"
          class="xl:col-span-1"
        >
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-sm font-bold text-text-primary">Top branches</h2>
            <router-link
              :to="{ name: 'org-analytics', params: { orgId: props.orgId } }"
              class="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </router-link>
          </div>
          <p class="text-xs text-text-muted mb-4">By collections this {{ branchAnalytics?.period ?? 'month' }}.</p>
          <p v-if="branchAnalyticsLoading" class="text-sm text-text-muted">Loading…</p>
          <BranchLeaderboardChart v-else :rows="branchAnalytics?.branches ?? []" />
        </AppCard>

        <AppCard :class="branchAnalytics?.branches.length ? 'xl:col-span-2' : 'xl:col-span-3'">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-sm font-bold text-text-primary">Recent transactions</h2>
            <router-link
              :to="{ name: 'org-transactions', params: { orgId: props.orgId } }"
              class="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </router-link>
          </div>

          <AppTable
            :columns="txnColumns"
            :rows="txns?.transactions ?? []"
            :loading="txnLoading"
            empty-message="No transactions found."
            clickable
            @row-click="openTxnDetail"
          >
            <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
            <template #cell-reference="{ row }">{{ txnReference(row as unknown as Transaction) }}</template>
            <template #cell-status="{ value }">
              <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
            </template>
            <template #cell-amountCents="{ value }">KES {{ formatMoney(value as number) }}</template>
          </AppTable>
        </AppCard>
      </div>
    </div>

    <AppModal v-model="showTxnDetail" title="Transaction detail" size="sm">
      <p v-if="txnDetailLoading" class="text-sm text-text-muted">Loading…</p>
      <p v-else-if="txnDetailError" class="text-sm text-error-text">{{ txnDetailError }}</p>
      <dl v-else-if="selectedTxnDetail" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between"><dt class="text-text-muted">Reference</dt><dd class="font-semibold text-text-primary">{{ txnReference(selectedTxnDetail) }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Type</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.type }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Status</dt><dd><AppBadge :variant="statusVariant(selectedTxnDetail.status)" size="sm">{{ selectedTxnDetail.status }}</AppBadge></dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Rail</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.rail }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Amount</dt><dd class="font-semibold text-text-primary">KES {{ formatMoney(selectedTxnDetail.amountCents) }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Fee</dt><dd class="font-semibold text-text-primary">KES {{ formatMoney(selectedTxnDetail.feeCents) }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Settlement status</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.settlement_status }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Date</dt><dd class="font-semibold text-text-primary">{{ formatDate(selectedTxnDetail.created_at) }}</dd></div>
        <div v-if="selectedTxnDetail.description" class="flex flex-col gap-1"><dt class="text-text-muted">Description</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.description }}</dd></div>
      </dl>
    </AppModal>
  </DashboardLayout>
</template>
