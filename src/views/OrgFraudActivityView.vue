<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchOrgFraudActivity, fetchFraudBranchBreakdown, fetchFraudAggregateScore, type OrgFraudDecision, type OrgFraudBranchBreakdownRow, type OrgFraudAggregateScore } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppStat from '@/components/ui/AppStat.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ShieldAlertIcon, ShieldOffIcon, ShieldIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const openBlocks = ref(0)
const openHolds = ref(0)
const decisions = ref<OrgFraudDecision[]>([])

const breakdown = ref<OrgFraudBranchBreakdownRow[]>([])
const breakdownLoading = ref(true)

const aggregateScore = ref<OrgFraudAggregateScore | null>(null)
const aggregateLoading = ref(true)

async function loadAggregateScore() {
  aggregateLoading.value = true
  try {
    aggregateScore.value = await fetchFraudAggregateScore()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    aggregateLoading.value = false
  }
}

function scoreVariant(score: number): 'error' | 'warning' | 'success' {
  if (score >= 60) return 'error'
  if (score >= 30) return 'warning'
  return 'success'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await fetchOrgFraudActivity()
    openBlocks.value = data.open_blocks
    openHolds.value = data.open_holds
    decisions.value = data.decisions ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

async function loadBreakdown() {
  breakdownLoading.value = true
  try {
    breakdown.value = (await fetchFraudBranchBreakdown()) ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    breakdownLoading.value = false
  }
}

onMounted(() => {
  load()
  loadBreakdown()
  loadAggregateScore()
})

function actionVariant(action: string): 'error' | 'warning' | 'success' {
  if (action === 'BLOCK') return 'error'
  if (action === 'HOLD') return 'warning'
  return 'success'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Fraud activity">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">
        Fraud gate decisions across your organization's own wallet and all branch payouts/collections.
      </p>

      <AppCard v-if="aggregateLoading || aggregateScore">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-bold text-text-primary">Cross-branch fraud aggregate score</h2>
          <AppBadge v-if="aggregateScore" :variant="scoreVariant(aggregateScore.score)" size="sm">{{ aggregateScore.score }}/100</AppBadge>
        </div>
        <p class="text-xs text-text-muted mb-3">
          Looks for patterns invisible from any single branch — the same device, IP, or phone number hitting
          multiple branches, or fraud activity spread across many branches at once. Last {{ aggregateScore?.window_days ?? 30 }} days.
        </p>
        <p v-if="aggregateLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="aggregateScore" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="rounded-xl bg-surface-2 px-3 py-2.5">
            <p class="text-lg font-bold text-text-primary">{{ aggregateScore.branches_with_risk_activity }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">Branches w/ risk activity</p>
          </div>
          <div class="rounded-xl bg-surface-2 px-3 py-2.5">
            <p class="text-lg font-bold text-text-primary">{{ aggregateScore.device_overlap_count }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">Devices across branches</p>
          </div>
          <div class="rounded-xl bg-surface-2 px-3 py-2.5">
            <p class="text-lg font-bold text-text-primary">{{ aggregateScore.ip_overlap_count }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">IPs across branches</p>
          </div>
          <div class="rounded-xl bg-surface-2 px-3 py-2.5">
            <p class="text-lg font-bold text-text-primary">{{ aggregateScore.phone_overlap_count }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">Phones across branches</p>
          </div>
        </div>
      </AppCard>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppStat label="Open blocks" :value="openBlocks" icon-color="error">
          <template #icon><ShieldOffIcon class="w-4 h-4" /></template>
        </AppStat>
        <AppStat label="Open holds" :value="openHolds" icon-color="warning">
          <template #icon><ShieldAlertIcon class="w-4 h-4" /></template>
        </AppStat>
      </div>

      <AppCard v-if="breakdownLoading || breakdown.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">By branch</h2>
        <p class="text-xs text-text-muted mb-4">
          Where fraud activity is concentrated — the organization's own wallet plus every branch, ranked by open
          blocks first.
        </p>
        <p v-if="breakdownLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="row in breakdown" :key="row.branch_id"
            class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5"
          >
            <span class="text-sm font-semibold text-text-primary truncate">{{ row.branch_name }}</span>
            <div class="flex items-center gap-2 shrink-0">
              <AppBadge v-if="row.open_blocks" variant="error" size="sm">{{ row.open_blocks }} blocked</AppBadge>
              <AppBadge v-if="row.open_holds" variant="warning" size="sm">{{ row.open_holds }} held</AppBadge>
              <span class="text-xs text-text-muted">{{ row.total_decisions }} total</span>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Recent decisions</h2>
        <p class="text-xs text-text-muted mb-4">Last 50 fraud gate evaluations, most recent first.</p>

        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="!decisions.length" class="flex flex-col items-center text-center gap-2 py-10">
          <ShieldIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No fraud gate activity yet</p>
          <p class="text-xs text-text-muted">Blocks, holds, and sanctions hits on your payments will show up here.</p>
        </div>
        <div v-else class="flex flex-col gap-2">
          <div v-for="d in decisions" :key="d.id" class="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-surface-2 px-4 py-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <AppBadge :variant="actionVariant(d.action)" size="sm">{{ d.action }}</AppBadge>
                <AppBadge v-if="d.severity" variant="neutral" size="sm">{{ d.severity }}</AppBadge>
                <span class="text-sm font-semibold text-text-primary">{{ d.subject_type }}</span>
              </div>
              <p class="text-xs text-text-muted mt-1">
                KES {{ formatMoney(d.amount_cents) }} · score {{ d.score }}
                <span v-if="d.veto_rule"> · {{ d.veto_rule }}</span>
                · {{ formatDate(d.created_at) }}
              </p>
            </div>
            <AppBadge v-if="d.outcome" variant="neutral" size="sm">{{ d.outcome }}</AppBadge>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
