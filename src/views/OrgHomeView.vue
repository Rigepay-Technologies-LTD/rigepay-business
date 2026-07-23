<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBranches, fetchOrgTransactions, fetchOrgProfile, fetchOrgTransaction, fetchOrgCashFlow,
  type BranchesResponse, type PaginatedTransactions, type ProfileResponse,
  type Transaction, type TransactionDetail, type CashFlowDayPoint,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, riskTier } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CashFlowChart from '@/components/CashFlowChart.vue'
import { WalletIcon, ShieldCheckIcon, AlertOctagonIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<BranchesResponse | null>(null)
const profile = ref<ProfileResponse | null>(null)

const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)

const cashFlow = ref<CashFlowDayPoint[]>([])
const cashFlowLoading = ref(true)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

async function loadOverview() {
  loading.value = true
  error.value = null
  try {
    overview.value = await fetchOrgBranches()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadProfile() {
  try {
    profile.value = await fetchOrgProfile()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function loadCashFlow() {
  cashFlowLoading.value = true
  try {
    cashFlow.value = await fetchOrgCashFlow(14)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    cashFlowLoading.value = false
  }
}


async function loadTransactions() {
  txnLoading.value = true
  try {
    txns.value = await fetchOrgTransactions({ page: 1, page_size: 5 })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    txnLoading.value = false
  }
}

onMounted(() => {
  loadOverview()
  loadProfile()
  loadCashFlow()
  loadTransactions()
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
    txnDetailError.value = extractErrorMessage(err)
  } finally {
    txnDetailLoading.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branches="overview?.branches ?? []" title="Organization overview">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div v-if="profile">
        <h1 class="text-xl font-bold text-text-primary">{{ greeting }}, {{ profile.member.first_name }}!</h1>
        <p class="text-xs text-text-muted mt-1">
          {{ new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
        </p>
      </div>

   
      <section class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="rounded-2xl bg-linear-to-br from-primary to-primary/80 text-white p-5 flex flex-col gap-3 shadow-sm sm:col-span-2">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
              <WalletIcon class="w-4 h-4" />Organization main balance
            </span>
            <span v-if="profile?.organization.collection_code" class="text-[10px] font-bold uppercase tracking-wide bg-white/15 rounded-full px-2 py-1">
              Code {{ profile.organization.collection_code }}
            </span>
          </div>
          <p class="text-3xl font-bold tracking-tight">KES {{ formatMoney(profile?.organization.wallet.main_cents) }}</p>
          <AppBadge v-if="profile" :variant="riskTier(profile.organization.risk_score).variant" size="sm" class="self-start">
            {{ riskTier(profile.organization.risk_score).label }}{{ profile.organization.risk_score > 0 ? ` (${profile.organization.risk_score}/100)` : '' }}
          </AppBadge>
        </div>
        <div class="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 shadow-sm">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <ShieldCheckIcon class="w-4 h-4 text-info" />Escrow balance
          </span>
          <p class="text-2xl font-bold text-text-primary tracking-tight">KES {{ formatMoney(profile?.organization.wallet.escrow_cents) }}</p>
        </div>
        <div class="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 shadow-sm">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <AlertOctagonIcon class="w-4 h-4 text-warning" />Chargeback holding
          </span>
          <p class="text-2xl font-bold text-text-primary tracking-tight">KES {{ formatMoney(profile?.organization.wallet.chargeback_cents) }}</p>
        </div>
      </section>

      <AppCard>
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
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-amountCents="{ value }">KES {{ formatMoney(value as number) }}</template>
        </AppTable>
      </AppCard>
    </div>

    <AppModal v-model="showTxnDetail" title="Transaction detail" size="sm">
      <p v-if="txnDetailLoading" class="text-sm text-text-muted">Loading…</p>
      <p v-else-if="txnDetailError" class="text-sm text-error-text">{{ txnDetailError }}</p>
      <dl v-else-if="selectedTxnDetail" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between"><dt class="text-text-muted">Reference</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.reference }}</dd></div>
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
