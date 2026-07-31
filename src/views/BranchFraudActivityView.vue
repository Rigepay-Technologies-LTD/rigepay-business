<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchFraudActivity, type OrgFraudDecision } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppStat from '@/components/ui/AppStat.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ShieldAlertIcon, ShieldOffIcon, ShieldIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

const loading = ref(true)
const error = ref<string | null>(null)
const openBlocks = ref(0)
const openHolds = ref(0)
const decisions = ref<OrgFraudDecision[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await fetchBranchFraudActivity()
    openBlocks.value = data.open_blocks
    openHolds.value = data.open_holds
    decisions.value = data.decisions
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function actionVariant(action: string): 'error' | 'warning' | 'success' {
  if (action === 'BLOCK') return 'error'
  if (action === 'HOLD') return 'warning'
  return 'success'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Fraud activity">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">
        Fraud gate decisions on this branch's own payouts and collections.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppStat label="Open blocks" :value="openBlocks" icon-color="error">
          <template #icon><ShieldOffIcon class="w-4 h-4" /></template>
        </AppStat>
        <AppStat label="Open holds" :value="openHolds" icon-color="warning">
          <template #icon><ShieldAlertIcon class="w-4 h-4" /></template>
        </AppStat>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Recent decisions</h2>
        <p class="text-xs text-text-muted mb-4">Last 50 fraud gate evaluations for this branch, most recent first.</p>

        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="!decisions.length" class="flex flex-col items-center text-center gap-2 py-10">
          <ShieldIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No fraud gate activity yet</p>
          <p class="text-xs text-text-muted">Blocks, holds, and sanctions hits on this branch's payments will show up here.</p>
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
