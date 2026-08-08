<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchAnalyticsDetail, fetchBranchInvoiceAnalytics, type AnalyticsDetail, type InvoiceAnalyticsSummary } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AnalyticsDetailPanel from '@/components/AnalyticsDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const period = ref(currentPeriod())
const data = ref<AnalyticsDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const invoiceSummary = ref<InvoiceAnalyticsSummary | null>(null)
const invoiceLoading = ref(true)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await fetchBranchAnalyticsDetail(period.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

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

function loadAll() {
  load()
  loadInvoiceAnalytics()
}
onMounted(loadAll)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Analytics">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">Collections, payouts, and net cash flow for this branch over a chosen month.</p>
      <AppCard padding="sm">
        <div class="flex items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Period</label>
            <input
              v-model="period" type="month"
              class="h-10 rounded-xl border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/20"
              @change="loadAll"
            />
          </div>
        </div>
      </AppCard>

      <AnalyticsDetailPanel :data="data" :loading="loading" />

      <div>
        <h2 class="text-sm font-bold text-text-primary mb-3">Invoices</h2>
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
            <p class="text-xs text-text-muted mt-0.5">{{ invoiceSummary.paid_count }} invoice(s) · {{ invoiceSummary.collection_rate_pct.toFixed(0) }}% collection rate</p>
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
        <p v-else class="text-sm text-text-muted">Couldn't load invoice analytics for this period.</p>
      </div>
    </div>
  </DashboardLayout>
</template>
