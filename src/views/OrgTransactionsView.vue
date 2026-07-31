<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  fetchOrgBranches, fetchOrgTransactions, fetchOrgTransaction,
  type BranchesResponse, type PaginatedTransactions, type Transaction, type TransactionDetail,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, txnReference } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{ orgId: string }>()
const { showError } = useResponseModal()

const error = ref<string | null>(null)
const overview = ref<BranchesResponse | null>(null)

const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const branchFilter = ref('')
const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)
const page = ref(1)

async function loadOverview() {
  try {
    overview.value = await fetchOrgBranches()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

async function loadTransactions() {
  txnLoading.value = true
  try {
    txns.value = await fetchOrgTransactions({
      page: page.value,
      page_size: 20,
      search: searchText.value || undefined,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
      branch_id: branchFilter.value || undefined,
    })
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    txnLoading.value = false
  }
}

function search() {
  page.value = 1
  loadTransactions()
}

onMounted(() => {
  loadOverview()
  loadTransactions()
})

const txnColumns = [
  { key: 'created_at', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'amountCents', label: 'Amount', class: 'text-right' },
]


const branchOptions = computed(() => [
  { value: '', label: 'Organization (this business)' },
  ...(overview.value?.branches.map((b) => ({ value: b.id, label: b.name })) ?? []),
])

function statusVariant(status: string) {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'error'
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
  <DashboardLayout :org-id="props.orgId" :branches="overview?.branches ?? []" title="Transaction history">
    <div class="flex flex-col gap-6">
      <AppCard>
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-bold text-text-primary">Transactions</h2>
        </div>
        <p class="text-xs text-text-muted mb-4">Every collection, payout, transfer, and fee across the organization and its branches — search by reference or filter by branch.</p>
        <form class="flex flex-col sm:flex-row gap-3 mb-5" @submit.prevent="search">
          <AppInput v-model="searchText" placeholder="Reference, description..." class="flex-1" />
          <AppInput v-model="startDate" type="date" />
          <AppInput v-model="endDate" type="date" />
          <AppSelect v-model="branchFilter" :options="branchOptions" class="sm:w-56" />
          <AppButton type="submit" :loading="txnLoading">Search</AppButton>
        </form>

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

        <div v-if="txns && txns.total_pages > 1" class="flex items-center justify-between mt-4 text-xs text-text-muted">
          <span>Page {{ txns.page }} of {{ txns.total_pages }}</span>
          <div class="flex gap-2">
            <AppButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; loadTransactions()">Previous</AppButton>
            <AppButton variant="secondary" size="sm" :disabled="page >= txns.total_pages" @click="page++; loadTransactions()">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showTxnDetail" title="Transaction detail" size="sm">
      <p v-if="txnDetailLoading" class="text-sm text-text-muted">Loading…</p>
      <dl v-else-if="selectedTxnDetail" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between"><dt class="text-text-muted">Reference</dt><dd class="font-semibold text-text-primary">{{ txnReference(selectedTxnDetail) }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">External Txn Id</dt><dd class="font-semibold text-text-primary">{{ selectedTxnDetail.externalTxnId }}</dd></div>
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
