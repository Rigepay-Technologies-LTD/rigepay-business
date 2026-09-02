<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgAnalyticsDetail, fetchBranchAnalytics, fetchOrgInvoiceAnalytics,
  type BranchAnalytics, type InvoiceAnalyticsSummary,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AnalyticsWorkbench from '@/components/AnalyticsWorkbench.vue'
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()
const props = defineProps<{ orgId: string }>()

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const period = ref(currentPeriod())
const branchData = ref<BranchAnalytics | null>(null)
const branchLoading = ref(true)
const invoiceSummary = ref<InvoiceAnalyticsSummary | null>(null)
const invoiceLoading = ref(true)

async function loadMonthlySections() {
  branchLoading.value = true
  invoiceLoading.value = true
  try {
    branchData.value = await fetchBranchAnalytics(period.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    branchLoading.value = false
  }
  try {
    const res = await fetchOrgInvoiceAnalytics(period.value)
    invoiceSummary.value = res.summary
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    invoiceLoading.value = false
  }
}
onMounted(loadMonthlySections)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Analytics">
    <div class="flex flex-col gap-8">
      <AnalyticsWorkbench :fetcher="fetchOrgAnalyticsDetail" />

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">Invoices &amp; per-branch breakdown</h2>
          <input v-model="period" type="month" class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" @change="loadMonthlySections" />
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

        <p v-if="branchLoading" class="text-sm text-text-muted">Loading branch breakdown…</p>
        <template v-else-if="branchData">
          <div v-if="branchData.highlights?.length" class="flex flex-col gap-2">
            <div v-for="(h, i) in branchData.highlights" :key="i" class="text-xs text-text-secondary bg-surface-2 rounded-xl px-4 py-2.5">{{ h }}</div>
          </div>

          <AppCard padding="none">
            <h3 class="text-sm font-bold text-text-primary px-5 pt-5 mb-3">Per-branch leaderboard (ranked by collections)</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                    <th class="px-5 py-2">Branch</th>
                    <th class="px-5 py-2 text-right">Collections</th>
                    <th class="px-5 py-2 text-right">Payouts</th>
                    <th class="px-5 py-2 text-right">Net</th>
                    <th class="px-5 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-border bg-surface-2/50">
                    <td class="px-5 py-2.5 font-semibold text-text-primary">{{ branchData.org_wallet.branch_name }}</td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(branchData.org_wallet.collections_cents) }}</td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(branchData.org_wallet.payouts_cents) }}</td>
                    <td class="px-5 py-2.5 text-right font-semibold" :class="branchData.org_wallet.net_cents >= 0 ? 'text-success' : 'text-error'">{{ formatMoney(branchData.org_wallet.net_cents) }}</td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(branchData.org_wallet.current_balance_cents) }}</td>
                  </tr>
                  <tr v-for="(b, i) in branchData.branches" :key="b.branch_id ?? i" class="border-b border-border last:border-0">
                    <td class="px-5 py-2.5 font-medium text-text-primary flex items-center gap-1.5">
                      <span v-if="i === 0" class="text-[10px] font-bold text-primary">#1</span>{{ b.branch_name }}
                    </td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(b.collections_cents) }}</td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(b.payouts_cents) }}</td>
                    <td class="px-5 py-2.5 text-right font-semibold flex items-center justify-end gap-1" :class="b.net_cents >= 0 ? 'text-success' : 'text-error'">
                      <TrendingUpIcon v-if="b.net_cents >= 0" class="w-3.5 h-3.5" />
                      <TrendingDownIcon v-else class="w-3.5 h-3.5" />
                      {{ formatMoney(b.net_cents) }}
                    </td>
                    <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(b.current_balance_cents) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppCard>
        </template>
      </div>
    </div>
  </DashboardLayout>
</template>
