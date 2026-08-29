<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchOrgBranches, fetchStatement, downloadStatementCsv,
  fetchStatementEntries, downloadStatementEntriesCsv,
  type BranchSummary, type Statement, type StatementEntries, type StatementEntryParams,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import StatementSchedulesPanel from '@/components/money/StatementSchedulesPanel.vue'
import { DownloadIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const { showError } = useResponseModal()
const router = useRouter()

function openEntry(id: number) {
  const q: Record<string, string> = {}
  if (scopeSelection.value.startsWith('branch:')) q.branch_id = scopeSelection.value.slice('branch:'.length)
  else q.scope = scopeSelection.value
  router.push({ name: 'org-statement-entry-detail', params: { orgId: props.orgId, entryId: String(id) }, query: q })
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const branches = ref<BranchSummary[]>([])
const period = ref(currentPeriod())
const scopeSelection = ref('consolidated')
const statement = ref<Statement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const downloading = ref(false)

const scopeOptions = computed(() => [
  { value: 'consolidated', label: 'Consolidated (org + all branches)' },
  { value: 'org', label: 'Organization wallet only' },
  ...branches.value.map((b) => ({ value: `branch:${b.id}`, label: `Branch: ${b.name}` })),
])

function currentParams() {
  if (scopeSelection.value.startsWith('branch:')) {
    return { period: period.value, branch_id: scopeSelection.value.slice('branch:'.length) }
  }
  return { period: period.value, scope: scopeSelection.value as 'consolidated' | 'org' }
}

async function loadStatement() {
  loading.value = true
  error.value = null
  try {
    statement.value = await fetchStatement(currentParams())
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

const entries = ref<StatementEntries | null>(null)
const entriesLoading = ref(false)
const entriesDownloading = ref(false)
const direction = ref<'' | 'in' | 'out'>('')
const postingType = ref('')
const search = ref('')
const page = ref(1)

const postingTypeOptions = computed(() => [
  { value: '', label: 'All posting types' },
  ...(entries.value?.posting_types ?? []).map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
])

const directionOptions = [
  { value: '', label: 'All movements' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' },
]

function entryParams(): StatementEntryParams {
  const p: StatementEntryParams = { period: period.value, page: page.value, page_size: 50 }
  if (scopeSelection.value.startsWith('branch:')) p.branch_id = scopeSelection.value.slice('branch:'.length)
  else p.scope = scopeSelection.value as 'consolidated' | 'org'
  if (direction.value) p.direction = direction.value
  if (postingType.value) p.posting_type = postingType.value
  if (search.value.trim()) p.search = search.value.trim()
  return p
}

async function loadEntries() {
  entriesLoading.value = true
  try {
    entries.value = await fetchStatementEntries(entryParams())
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    entriesLoading.value = false
  }
}

function resetAndLoadEntries() {
  page.value = 1
  loadEntries()
}

async function changePage(delta: number) {
  const next = page.value + delta
  if (next < 1) return
  if (entries.value && next > Math.ceil(entries.value.total / entries.value.page_size)) return
  page.value = next
  await loadEntries()
}

async function downloadEntriesCsv() {
  entriesDownloading.value = true
  try {
    const blob = await downloadStatementEntriesCsv({ ...entryParams(), page: undefined, page_size: undefined })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-entries-${period.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    entriesDownloading.value = false
  }
}

const totalPages = computed(() =>
  entries.value ? Math.max(1, Math.ceil(entries.value.total / entries.value.page_size)) : 1,
)

async function loadBranches() {
  try {
    const b = await fetchOrgBranches()
    branches.value = b.branches
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

async function downloadCsv() {
  downloading.value = true
  try {
    const blob = await downloadStatementCsv(currentParams())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-${statement.value?.scope ?? 'report'}-${period.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    downloading.value = false
  }
}

function reload() {
  page.value = 1
  loadStatement()
  loadEntries()
}

onMounted(async () => {
  await loadBranches()
  await loadStatement()
  await loadEntries()
})
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Statements">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">A downloadable record of every wallet movement for a chosen period — useful for reconciliation and audits.</p>
      <AppCard>
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Period</label>
            <input
              v-model="period" type="month"
              class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              @change="reload"
            />
          </div>
          <AppSelect v-model="scopeSelection" label="Scope" :options="scopeOptions" class="min-w-60" @update:modelValue="reload" />
          <AppButton size="sm" variant="secondary" :loading="downloading" @click="downloadCsv">
            <template #icon><DownloadIcon class="w-4 h-4" /></template>
            Download CSV
          </AppButton>
        </div>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading statement…</p>

      <template v-else-if="statement">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Opening balance</p>
            <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(statement.opening_balance_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Closing balance</p>
            <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(statement.closing_balance_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total in</p>
            <p class="text-lg font-bold text-success">KES {{ formatMoney(statement.total_in_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total out</p>
            <p class="text-lg font-bold text-error">KES {{ formatMoney(statement.total_out_cents) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Net</p>
            <p class="text-lg font-bold" :class="statement.net_cents >= 0 ? 'text-success' : 'text-error'">
              KES {{ formatMoney(statement.net_cents) }}
            </p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Transactions</p>
            <p class="text-lg font-bold text-text-primary">{{ statement.transaction_count }}</p>
          </AppCard>
        </div>

        <AppCard v-if="statement.by_type.length" padding="none">
          <h2 class="text-sm font-bold text-text-primary px-5 pt-5 mb-3">Breakdown by type</h2>
          <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2">Type</th>
                <th class="px-5 py-2 text-right">Count</th>
                <th class="px-5 py-2 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in statement.by_type" :key="row.type" class="border-b border-border last:border-0">
                <td class="px-5 py-2.5 font-medium text-text-primary">{{ row.type }}</td>
                <td class="px-5 py-2.5 text-right text-text-muted">{{ row.count }}</td>
                <td class="px-5 py-2.5 text-right font-semibold text-text-primary">{{ formatMoney(row.amount_cents) }}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </AppCard>
        <AppCard v-else>
          <p class="text-sm text-text-muted">No activity in this period for this scope.</p>
        </AppCard>
      </template>

      <AppCard padding="none">
        <div class="flex flex-wrap items-end gap-3 px-5 pt-5">
          <h2 class="text-sm font-bold text-text-primary mr-auto">Statement entries</h2>
          <AppSelect v-model="direction" label="Movement" :options="directionOptions" class="min-w-44" @update:modelValue="resetAndLoadEntries" />
          <AppSelect v-model="postingType" label="Posting type" :options="postingTypeOptions" class="min-w-48" @update:modelValue="resetAndLoadEntries" />
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Search</label>
            <input
              v-model="search" type="text" placeholder="Reference, customer, provider…"
              class="h-10 w-64 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              @keyup.enter="resetAndLoadEntries"
            />
          </div>
          <AppButton size="sm" variant="secondary" @click="resetAndLoadEntries">Apply</AppButton>
          <AppButton size="sm" variant="secondary" :loading="entriesDownloading" @click="downloadEntriesCsv">
            <template #icon><DownloadIcon class="w-4 h-4" /></template>
            Export entries
          </AppButton>
        </div>

        <p v-if="entriesLoading" class="text-sm text-text-muted px-5 py-6">Loading entries…</p>
        <p v-else-if="!entries || !entries.entries.length" class="text-sm text-text-muted px-5 py-6">No statement entries for this selection.</p>
        <div v-else class="overflow-x-auto mt-3">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2">Date</th>
                <th class="px-5 py-2">Reference</th>
                <th class="px-5 py-2">Details</th>
                <th class="px-5 py-2">Provider ref</th>
                <th class="px-5 py-2 text-right">Money in</th>
                <th class="px-5 py-2 text-right">Money out</th>
                <th class="px-5 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in entries.entries" :key="e.id" class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer" @click="openEntry(e.id)">
                <td class="px-5 py-2.5 text-text-muted whitespace-nowrap">{{ new Date(e.created_at).toLocaleString() }}</td>
                <td class="px-5 py-2.5 font-medium text-text-primary">{{ e.reference || '—' }}</td>
                <td class="px-5 py-2.5 text-text-secondary">
                  {{ e.details || e.txn_type || '—' }}
                  <span v-if="e.customer_ref" class="block text-xs text-text-muted">{{ e.customer_ref }}</span>
                </td>
                <td class="px-5 py-2.5 text-text-muted">{{ e.provider_ref || '—' }}</td>
                <td class="px-5 py-2.5 text-right font-semibold" :class="e.money_in_cents ? 'text-success' : 'text-text-muted'">
                  {{ e.money_in_cents ? formatMoney(e.money_in_cents) : '—' }}
                </td>
                <td class="px-5 py-2.5 text-right font-semibold" :class="e.money_out_cents ? 'text-error' : 'text-text-muted'">
                  {{ e.money_out_cents ? formatMoney(e.money_out_cents) : '—' }}
                </td>
                <td class="px-5 py-2.5 text-right font-semibold text-text-primary">{{ formatMoney(e.running_balance_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="entries && entries.total > entries.page_size" class="flex items-center justify-between px-5 py-4 border-t border-border">
          <p class="text-xs text-text-muted">Page {{ entries.page }} of {{ totalPages }} · {{ entries.total }} entries</p>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" :disabled="entries.page <= 1" @click="changePage(-1)">Previous</AppButton>
            <AppButton size="sm" variant="secondary" :disabled="entries.page >= totalPages" @click="changePage(1)">Next</AppButton>
          </div>
        </div>
      </AppCard>

      <StatementSchedulesPanel :branches="branches.map((b) => ({ id: b.id, name: b.name }))" />
    </div>
  </DashboardLayout>
</template>
