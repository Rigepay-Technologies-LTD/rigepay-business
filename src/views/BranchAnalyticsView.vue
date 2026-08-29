<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchAnalyticsDetail, fetchBranchInvoiceAnalytics, type InvoiceAnalyticsSummary } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AnalyticsWorkbench from '@/components/AnalyticsWorkbench.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const period = ref(currentPeriod())
const invoiceSummary = ref<InvoiceAnalyticsSummary | null>(null)
const invoiceLoading = ref(true)

async function loadInvoiceAnalytics() {
  invoiceLoading.value = true
  try {
    const res = await fetchBranchInvoiceAnalytics(period.value)
    invoiceSummary.value = res.summary
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    invoiceLoading.value = false
  }
}
onMounted(loadInvoiceAnalytics)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Analytics">
    <div class="flex flex-col gap-8">
      <AnalyticsWorkbench :fetcher="fetchBranchAnalyticsDetail" />

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">Invoices</h2>
          <input v-model="period" type="month" class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" @change="loadInvoiceAnalytics" />
        </div>
        <p v-if="invoiceLoading" class="text-sm text-text-muted">Loading invoice analytics…</p>
        <div v-else-if="invoiceSummary" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total invoiced</p>
            <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(invoiceSummary.total_cents) }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ invoiceSummary.total_count }} invoice(s)</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Paid</p>
            <p class="text-lg font-bold text-success">KES {{ formatMoney(invoiceSummary.paid_cents) }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ invoiceSummary.paid_count }} · {{ invoiceSummary.collection_rate_pct.toFixed(0) }}% collection rate</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Unpaid</p>
            <p class="text-lg font-bold text-warning">KES {{ formatMoney(invoiceSummary.unpaid_cents) }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ invoiceSummary.unpaid_count }} invoice(s)</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Overdue</p>
            <p class="text-lg font-bold text-error">KES {{ formatMoney(invoiceSummary.overdue_cents) }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ invoiceSummary.overdue_count }} invoice(s)</p>
          </AppCard>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
