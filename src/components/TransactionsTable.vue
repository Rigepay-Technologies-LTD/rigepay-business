<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchOrgTransactions, fetchBranchTransactions,
  type PaginatedTransactions, type Transaction,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, txnReference } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { SearchIcon, RefreshCwIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
  isBranch: boolean
  branchOptions?: { value: string; label: string }[]
}>()

const { showError } = useResponseModal()
const route = useRoute()
const router = useRouter()

const search = ref('')
const statusFilter = ref('')
const from = ref('')
const to = ref('')
const branchFilter = ref('')
const page = ref(1)
const loading = ref(false)
const data = ref<PaginatedTransactions | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: 20,
      search: search.value.trim() || undefined,
      start_date: from.value || undefined,
      end_date: to.value || undefined,
      branch_id: props.isBranch ? undefined : (branchFilter.value || undefined),
    }
    data.value = props.isBranch ? await fetchBranchTransactions(params) : await fetchOrgTransactions(params)
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

const rows = computed(() => {
  const all = data.value?.transactions ?? []
  if (!statusFilter.value) return all
  return all.filter((t) => statusVariantKey(t.status) === statusFilter.value)
})
const totalPages = computed(() => data.value?.total_pages ?? 1)

function statusVariantKey(s: string) {
  if (['SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(s)) return 'success'
  if (['FAILED', 'CANCELLED', 'ERROR'].includes(s)) return 'failed'
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'pending'
  return 'neutral'
}
function statusClass(s: string) {
  switch (statusVariantKey(s)) {
    case 'success': return 'bg-success-muted text-success'
    case 'failed': return 'bg-error-muted text-error'
    case 'pending': return 'bg-warning-muted text-warning'
    default: return 'bg-surface-2 text-text-muted'
  }
}
function isInflow(t: Transaction) {
  return /COLLECT|DEPOSIT|CREDIT|REFUND|REVERSAL|SETTLEMENT|FUNDS_SETTLED|INBOUND/i.test(t.type)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const copiedRef = ref<string | null>(null)
function copyRef(r: string) {
  navigator.clipboard?.writeText(r)
  copiedRef.value = r
  setTimeout(() => { if (copiedRef.value === r) copiedRef.value = null }, 1500)
}

function openDetail(t: Transaction) {
  const orgId = route.params.orgId as string
  router.push(props.isBranch
    ? { name: 'branch-transaction-detail', params: { orgId, branchId: route.params.branchId as string, txnId: t.id } }
    : { name: 'org-transaction-detail', params: { orgId, txnId: t.id } })
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'success', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- filter bar -->
    <div class="flex flex-wrap items-end gap-3">
      <div class="relative flex-1 min-w-56">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search" type="text" placeholder="Search reference or description"
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
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-10 text-center">Loading transactions…</p>
      <p v-else-if="!rows.length" class="text-sm text-text-muted px-5 py-10 text-center">No transactions found.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Reference</th>
              <th class="px-5 py-3">Type</th>
              <th class="px-5 py-3 text-right">Amount</th>
              <th class="px-5 py-3 text-right">Fee</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id" class="border-b border-border last:border-0 hover:bg-surface-2/60">
              <td class="px-5 py-3 text-text-secondary whitespace-nowrap">{{ fmtDate(t.created_at) }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex items-center gap-1.5 font-mono text-xs text-text-primary">
                  {{ txnReference(t) }}
                  <button class="text-text-muted hover:text-primary" @click.stop="copyRef(txnReference(t))">
                    <CheckIcon v-if="copiedRef === txnReference(t)" class="w-3.5 h-3.5 text-success" />
                    <CopyIcon v-else class="w-3.5 h-3.5" />
                  </button>
                </span>
              </td>
              <td class="px-5 py-3 text-text-secondary text-xs">{{ t.type }}</td>
              <td class="px-5 py-3 text-right font-semibold" :class="isInflow(t) ? 'text-success' : 'text-text-primary'">
                {{ isInflow(t) ? '+' : '−' }} KES {{ formatMoney(Math.abs(t.amountCents)) }}
              </td>
              <td class="px-5 py-3 text-right text-text-muted">{{ t.feeCents ? `KES ${formatMoney(t.feeCents)}` : '—' }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(t.status)">{{ t.status }}</span>
              </td>
              <td class="px-5 py-3 text-right">
                <button class="text-xs font-semibold text-primary hover:underline" @click="openDetail(t)">View more</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="data && data.total_count > data.page_size" class="flex items-center justify-between px-5 py-3.5 border-t border-border">
        <p class="text-xs text-text-muted">Page {{ data.page }} of {{ totalPages }} · {{ data.total_count }} total</p>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--">Previous</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++">Next</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
