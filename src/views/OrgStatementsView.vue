<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBranches, fetchStatement, downloadStatementCsv,
  type BranchSummary, type Statement,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { DownloadIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const { showError } = useResponseModal()

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

onMounted(async () => {
  await loadBranches()
  await loadStatement()
})
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Statements">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">A downloadable record of every wallet movement for a chosen period — useful for reconciliation and audits.</p>
      <AppCard>
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Period</label>
            <input
              v-model="period" type="month"
              class="h-10 rounded-xl border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/20"
              @change="loadStatement"
            />
          </div>
          <AppSelect v-model="scopeSelection" label="Scope" :options="scopeOptions" class="min-w-60" @update:modelValue="loadStatement" />
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
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border">
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
    </div>
  </DashboardLayout>
</template>
