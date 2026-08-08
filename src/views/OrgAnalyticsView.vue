<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchAnalytics, fetchOrgAnalyticsDetail, fetchOrgInvoiceAnalytics, type BranchAnalytics, type AnalyticsDetail, type InvoiceAnalyticsSummary } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AnalyticsDetailPanel from '@/components/AnalyticsDetailPanel.vue'
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const period = ref(currentPeriod())
const data = ref<BranchAnalytics | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const detail = ref<AnalyticsDetail | null>(null)
const detailLoading = ref(true)

const invoiceSummary = ref<InvoiceAnalyticsSummary | null>(null)
const invoiceLoading = ref(true)

async function loadInvoiceAnalytics() {
  invoiceLoading.value = true
  try {
    const res = await fetchOrgInvoiceAnalytics(period.value)
    invoiceSummary.value = res.summary
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    invoiceLoading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await fetchBranchAnalytics(period.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

async function loadDetail() {
  detailLoading.value = true
  try {
    detail.value = await fetchOrgAnalyticsDetail(period.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    detailLoading.value = false
  }
}

function loadAll() {
  load()
  loadDetail()
  loadInvoiceAnalytics()
}
onMounted(loadAll)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Analytics">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">Collections, payouts, and net cash flow for a chosen month — organization-wide, plus a per-branch breakdown below.</p>
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

      <div>
        <h2 class="text-sm font-bold text-text-primary mb-3">Organization-wide</h2>
        <AnalyticsDetailPanel :data="detail" :loading="detailLoading" />
      </div>

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

      <p v-if="loading" class="text-sm text-text-muted">Loading branch breakdown…</p>

      <template v-else-if="data">
        <h2 class="text-sm font-bold text-text-primary -mb-2">Per-branch breakdown</h2>
        <div v-if="data.highlights.length" class="flex flex-col gap-2">
          <div v-for="(h, i) in data.highlights" :key="i" class="text-xs text-text-secondary bg-surface-2 rounded-xl px-4 py-2.5">
            {{ h }}
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total collections</p>
            <p class="text-lg font-bold text-success">KES {{ formatMoney(data.org_totals.collections_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total payouts</p>
            <p class="text-lg font-bold text-error">KES {{ formatMoney(data.org_totals.payouts_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Net</p>
            <p class="text-lg font-bold" :class="data.org_totals.net_cents >= 0 ? 'text-success' : 'text-error'">
              KES {{ formatMoney(data.org_totals.net_cents) }}
            </p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Current balance (all)</p>
            <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(data.org_totals.current_balance_cents) }}</p>
          </AppCard>
        </div>

        <AppCard padding="none">
          <h2 class="text-sm font-bold text-text-primary px-5 pt-5 mb-3">Per-branch leaderboard (ranked by collections)</h2>
          <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border">
                <th class="px-5 py-2">Branch</th>
                <th class="px-5 py-2 text-right">Collections</th>
                <th class="px-5 py-2 text-right">Payouts</th>
                <th class="px-5 py-2 text-right">Net</th>
                <th class="px-5 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border bg-surface-2/50">
                <td class="px-5 py-2.5 font-semibold text-text-primary">{{ data.org_wallet.branch_name }}</td>
                <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(data.org_wallet.collections_cents) }}</td>
                <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(data.org_wallet.payouts_cents) }}</td>
                <td class="px-5 py-2.5 text-right font-semibold" :class="data.org_wallet.net_cents >= 0 ? 'text-success' : 'text-error'">
                  {{ formatMoney(data.org_wallet.net_cents) }}
                </td>
                <td class="px-5 py-2.5 text-right text-text-primary">{{ formatMoney(data.org_wallet.current_balance_cents) }}</td>
              </tr>
              <tr v-for="(b, i) in data.branches" :key="b.branch_id ?? i" class="border-b border-border last:border-0">
                <td class="px-5 py-2.5 font-medium text-text-primary flex items-center gap-1.5">
                  <span v-if="i === 0" class="text-[10px] font-bold text-primary">#1</span>
                  {{ b.branch_name }}
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
  </DashboardLayout>
</template>
