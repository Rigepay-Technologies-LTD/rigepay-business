<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchOrgPayoutHistory, fetchBranchPayoutHistory,
  type PayoutHistoryList, type PayoutHistoryRow,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { SearchIcon, RefreshCwIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
  isBranch: boolean
  branchOptions?: { value: string; label: string }[]
  reloadKey?: number
}>()

const { showError } = useResponseModal()
const route = useRoute()
const router = useRouter()

function openDetail(p: PayoutHistoryRow) {
  const orgId = route.params.orgId as string
  router.push(props.isBranch
    ? { name: 'branch-payout-detail', params: { orgId, branchId: route.params.branchId as string, payoutId: p.id } }
    : { name: 'org-payout-detail', params: { orgId, payoutId: p.id } })
}

const search = ref('')
const statusFilter = ref('')
const branchFilter = ref('')
const from = ref('')
const to = ref('')
const page = ref(1)
const loading = ref(false)
const data = ref<PayoutHistoryList | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: 20,
      status: statusFilter.value || undefined,
      search: search.value.trim() || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
      branch_id: props.isBranch ? undefined : (branchFilter.value || undefined),
    }
    data.value = props.isBranch ? await fetchBranchPayoutHistory(params) : await fetchOrgPayoutHistory(params)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch([statusFilter, from, to, branchFilter, page], load)
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(() => props.reloadKey, () => { page.value = 1; load() })

const rows = computed(() => data.value?.payouts ?? [])
const totalPages = computed(() => {
  const d = data.value
  if (!d || !d.page_size) return 1
  return Math.max(1, Math.ceil(d.total / d.page_size))
})

function statusVariantKey(s: string) {
  const v = (s || '').toLowerCase()
  if (['completed', 'success', 'successful', 'settled'].includes(v)) return 'success'
  if (['failed', 'cancelled', 'canceled', 'rejected', 'error', 'reversed'].includes(v)) return 'failed'
  return 'pending'
}
function statusClass(s: string) {
  switch (statusVariantKey(s)) {
    case 'success': return 'bg-success-muted text-success'
    case 'failed': return 'bg-error-muted text-error'
    default: return 'bg-warning-muted text-warning'
  }
}
function statusLabel(s: string) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function methodLabel(r: PayoutHistoryRow) {
  switch (r.destination_type) {
    case 'BANK_ACCOUNT': return 'Bank account'
    case 'PAYBILL': return 'Paybill'
    case 'TILL_NUMBER': return 'Till number'
    default: return 'Mobile money'
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const copiedRef = ref<string | null>(null)
function copyRef(r: string) {
  if (!r) return
  navigator.clipboard?.writeText(r)
  copiedRef.value = r
  setTimeout(() => { if (copiedRef.value === r) copiedRef.value = null }, 1500)
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
  branchFilter.value = ''
  from.value = ''
  to.value = ''
  page.value = 1
  load()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <AppCard>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Payouts</p>
        <p class="text-lg font-bold text-text-primary mt-1">{{ data?.total ?? 0 }}</p>
      </AppCard>
      <AppCard>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Value paid out</p>
        <p class="text-lg font-bold text-text-primary mt-1">KES {{ formatMoney(data?.total_paid_cents ?? 0) }}</p>
      </AppCard>
      <AppCard>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Fees</p>
        <p class="text-lg font-bold text-text-primary mt-1">KES {{ formatMoney(data?.total_fees_cents ?? 0) }}</p>
      </AppCard>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="relative flex-1 min-w-56">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search" type="text" placeholder="Search recipient or reference"
          class="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
        />
      </div>
      <AppSelect v-model="statusFilter" :options="statusOptions" class="w-40" />
      <AppSelect
        v-if="!isBranch && branchOptions && branchOptions.length > 1"
        v-model="branchFilter" :options="branchOptions" class="w-52"
      />
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-text-secondary">From</label>
        <input v-model="from" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-text-secondary">To</label>
        <input v-model="to" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
      </div>
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
        <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
        Refresh
      </AppButton>
      <AppButton size="sm" variant="ghost" @click="clearFilters">Clear</AppButton>
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-10 text-center">Loading payouts…</p>
      <p v-else-if="!rows.length" class="text-sm text-text-muted px-5 py-10 text-center">No payouts found.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Reference</th>
              <th class="px-5 py-3">Recipient</th>
              <th class="px-5 py-3">Method</th>
              <th class="px-5 py-3 text-right">Amount</th>
              <th class="px-5 py-3 text-right">Fee</th>
              <th class="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in rows" :key="p.id"
              class="border-b border-border last:border-0 hover:bg-surface-2/60 align-top cursor-pointer"
              @click="openDetail(p)"
            >
              <td class="px-5 py-3 text-text-secondary whitespace-nowrap">{{ fmtDate(p.created_at) }}</td>
              <td class="px-5 py-3">
                <span v-if="p.reference" class="inline-flex items-center gap-1.5 font-mono text-xs text-text-primary">
                  {{ p.reference }}
                  <button class="text-text-muted hover:text-primary" @click.stop="copyRef(p.reference)">
                    <CheckIcon v-if="copiedRef === p.reference" class="w-3.5 h-3.5 text-success" />
                    <CopyIcon v-else class="w-3.5 h-3.5" />
                  </button>
                </span>
                <span v-else class="text-text-muted text-xs">—</span>
              </td>
              <td class="px-5 py-3">
                <span class="block text-text-primary font-medium">{{ p.recipient_name || '—' }}</span>
                <span class="block text-xs text-text-muted">{{ p.recipient_info }}</span>
                <span v-if="p.failure_reason" class="block text-xs text-error mt-0.5">{{ p.failure_reason }}</span>
              </td>
              <td class="px-5 py-3 text-text-secondary text-xs">
                {{ methodLabel(p) }}
                <span v-if="p.provider" class="block text-text-muted">{{ p.provider }}</span>
              </td>
              <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">− KES {{ formatMoney(p.amount_cents) }}</td>
              <td class="px-5 py-3 text-right text-text-muted whitespace-nowrap">{{ p.fee_cents ? `KES ${formatMoney(p.fee_cents)}` : '—' }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="data && rows.length" class="flex items-center justify-between px-5 py-3.5 border-t border-border">
        <p class="text-xs text-text-muted">Page {{ data.page }} of {{ totalPages }} · {{ data.total }} total</p>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--">Previous</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++">Next</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
