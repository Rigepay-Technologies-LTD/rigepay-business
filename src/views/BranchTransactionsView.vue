<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchBranchTransactions,
  type PaginatedTransactions,
  type Transaction,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate, txnReference } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string; branchId: string }>()

const error = ref<string | null>(null)
const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const txnLoading = ref(false)
const txns = ref<PaginatedTransactions | null>(null)
const page = ref(1)

async function loadTransactions() {
  txnLoading.value = true
  try {
    txns.value = await fetchBranchTransactions({
      page: page.value,
      page_size: 20,
      search: searchText.value || undefined,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    })
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

onMounted(loadTransactions)

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
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Transaction history">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard>
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-sm font-bold text-text-primary">Transactions</h2>
        </div>
        <form class="flex flex-col sm:flex-row gap-3 mb-5" @submit.prevent="search">
          <AppInput v-model="searchText" placeholder="Reference, description..." class="flex-1" />
          <AppInput v-model="startDate" type="date" />
          <AppInput v-model="endDate" type="date" />
          <AppButton type="submit" :loading="txnLoading">Search</AppButton>
        </form>

        <AppTable
          :columns="txnColumns"
          :rows="txns?.transactions ?? []"
          :loading="txnLoading"
          empty-message="No transactions found."
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
  </DashboardLayout>
</template>
