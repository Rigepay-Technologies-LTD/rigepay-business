<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBranchWallets,
  fetchBranchTransactions,
  fetchOrgBranches,
  fetchOrgTransactions,
  fetchBranchProfile,
  type WalletBalances,
  type PaginatedTransactions,
  type BranchSummary,
  type BranchProfileDetail,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, riskTier } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppStat from '@/components/ui/AppStat.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string; branchId: string }>()

const auth = useAuthStore()


const isOrgMemberView = computed(() => auth.meta?.memberType === 'org_member')

const loading = ref(true)
const error = ref<string | null>(null)
const wallets = ref<WalletBalances | null>(null)
const branchInfo = ref<BranchSummary | null>(null)
const branchProfile = ref<BranchProfileDetail | null>(null)
const siblingBranches = ref<BranchSummary[]>([])

const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)
const page = ref(1)

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
    const params = {
      page: page.value,
      page_size: 10,
      search: searchText.value || undefined,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    }
    txns.value = isOrgMemberView.value
      ? await fetchOrgTransactions({ ...params, branch_id: props.branchId })
      : await fetchBranchTransactions(params)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    txnLoading.value = false
  }
}

function search() {
  page.value = 1
  loadTransactions()
}

onMounted(() => {
  loadWallets()
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
    :title="branchInfo?.name ?? 'Branch dashboard'"
  >
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppStat label="Main balance" :value="`KES ${formatMoney(wallets?.main_cents)}`" icon-color="primary" />
        <AppStat label="Escrow balance" :value="`KES ${formatMoney(wallets?.escrow_cents)}`" icon-color="info" />
        <AppStat label="Chargeback balance" :value="`KES ${formatMoney(wallets?.chargeback_cents)}`" icon-color="warning" />
      </section>

      <AppCard v-if="branchProfile">
        <h2 class="text-sm font-bold text-text-primary mb-3">Details</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
          <div>
            <dt class="text-text-muted mb-0.5">Risk score</dt>
            <dd>
              <AppBadge :variant="riskTier(branchProfile.risk_score).variant" size="sm">
                {{ riskTier(branchProfile.risk_score).label }}{{ branchProfile.risk_score > 0 ? ` (${branchProfile.risk_score}/100)` : '' }}
              </AppBadge>
            </dd>
          </div>
          <div><dt class="text-text-muted mb-0.5">Parent org identifier</dt><dd class="font-semibold text-text-primary">{{ branchProfile.parent_organization_identifier ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Branch type</dt><dd class="font-semibold text-text-primary">{{ branchProfile.branch_type ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Settlement mode</dt><dd class="font-semibold text-text-primary">{{ branchProfile.settlement_mode }}</dd></div>
          <div class="sm:col-span-3"><dt class="text-text-muted mb-0.5">Operating address</dt><dd class="font-semibold text-text-primary">{{ branchProfile.operating_address ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Contact person</dt><dd class="font-semibold text-text-primary">{{ branchProfile.contact_person_name ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Contact email</dt><dd class="font-semibold text-text-primary">{{ branchProfile.contact_person_email ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Contact phone</dt><dd class="font-semibold text-text-primary">{{ branchProfile.contact_person_phone ?? '—' }}</dd></div>
          <div v-if="branchProfile.settlement_mode === 'CONSOLIDATED'"><dt class="text-text-muted mb-0.5">Settlement bank</dt><dd class="font-semibold text-text-primary">{{ branchProfile.settlement_bank_name ?? '—' }} ({{ branchProfile.settlement_bank_code ?? '—' }})</dd></div>
          <div v-if="branchProfile.settlement_mode === 'CONSOLIDATED'"><dt class="text-text-muted mb-0.5">Settlement account</dt><dd class="font-semibold text-text-primary">{{ branchProfile.settlement_bank_account_number ?? '—' }}</dd></div>
          <div><dt class="text-text-muted mb-0.5">Tax / license number</dt><dd class="font-semibold text-text-primary">{{ branchProfile.branch_tax_license_number ?? '—' }}</dd></div>
        </dl>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Transactions</h2>
        <form class="flex flex-col sm:flex-row gap-3 mb-4" @submit.prevent="search">
          <AppInput v-model="searchText" placeholder="Reference, description..." class="flex-1" />
          <AppInput v-model="startDate" type="date" />
          <AppInput v-model="endDate" type="date" />
          <AppButton type="submit" :loading="txnLoading">Search</AppButton>
        </form>

        <AppTable :columns="txnColumns" :rows="txns?.transactions ?? []" :loading="txnLoading" empty-message="No transactions found.">
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-amountCents="{ value }">KES {{ formatMoney(value as number) }}</template>
        </AppTable>

        <div v-if="txns && txns.total_pages > 1" class="flex items-center justify-between mt-4 text-xs text-text-muted">
          <span>Page {{ txns.page }} of {{ txns.total_pages }}</span>
          <div class="flex gap-2">
            <AppButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; loadTransactions()">Previous</AppButton>
            <AppButton variant="secondary" size="sm" :disabled="page >= txns.total_pages" @click="page++; loadTransactions()">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
