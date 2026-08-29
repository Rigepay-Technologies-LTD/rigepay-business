<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchApproval, decideApproval, type ApprovalRequest } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ChevronLeftIcon, RefreshCwIcon, CheckIcon, XIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; requestId: string; listRouteName: string }>()
const router = useRouter()
const { showError, showSuccess } = useResponseModal()

const isBranch = computed(() => !!props.branchId)
const loading = ref(true)
const acting = ref<'APPROVE' | 'REJECT' | null>(null)
const note = ref('')
const req = ref<ApprovalRequest | null>(null)

async function load() {
  loading.value = true
  try {
    req.value = await fetchApproval(isBranch.value, props.requestId)
  } catch (err) {
    showError(extractErrorMessage(err))
    req.value = null
  } finally {
    loading.value = false
  }
}
onMounted(load)

function prettyAction(code: string) {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function money(cents?: number | null) {
  return cents === null || cents === undefined ? '—' : `KES ${formatMoney(cents)}`
}
function date(v?: string | null) {
  return v ? formatDate(v) : '—'
}

const isActionable = computed(() => {
  const s = (req.value?.status || '').toUpperCase()
  return s === 'PENDING' || s === 'PARTIALLY_APPROVED'
})

function statusVariant(s: string) {
  const u = (s || '').toUpperCase()
  if (['APPROVED', 'COMPLETED'].includes(u)) return 'success'
  if (['REJECTED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(u)) return 'error'
  return 'warning'
}
function stageVariant(s: string) {
  const u = (s || '').toUpperCase()
  if (u === 'APPROVED') return 'success'
  if (u === 'REJECTED') return 'error'
  if (u === 'SKIPPED') return 'neutral'
  return 'warning'
}

const currentStageIndex = computed(() => req.value?.current_stage_index ?? 0)

const payloadRows = computed(() => {
  const p = req.value?.payload
  if (!p || typeof p !== 'object') return [] as { label: string; value: string }[]
  return Object.entries(p).map(([k, v]) => ({
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    value: typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—'),
  }))
})

async function decide(decision: 'APPROVE' | 'REJECT') {
  acting.value = decision
  try {
    req.value = await decideApproval(isBranch.value, props.requestId, decision, note.value.trim() || undefined)
    showSuccess(decision === 'APPROVE' ? 'Decision recorded.' : 'Request rejected.')
    note.value = ''
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = null
  }
}

function goBack() {
  router.push({
    name: props.listRouteName,
    params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId },
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Back
    </button>

    <p v-if="loading" class="text-sm text-text-muted">Loading approval…</p>

    <AppCard v-else-if="!req" class="py-12 text-center">
      <p class="text-sm text-text-muted">This approval request could not be found.</p>
    </AppCard>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Approval</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ req.title || prettyAction(req.action_type) }}</h1>
          <p v-if="req.description" class="text-sm text-text-muted mt-1 max-w-lg">{{ req.description }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <AppBadge :variant="statusVariant(req.status)" size="sm">{{ req.status }}</AppBadge>
            <span class="inline-flex rounded-lg border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{{ prettyAction(req.action_type) }}</span>
            <span class="inline-flex rounded-lg border border-border px-2 py-0.5 text-[11px] font-mono text-text-muted">{{ req.action_type }}</span>
            <span class="inline-flex rounded-lg border border-border px-2 py-0.5 text-[11px] text-text-muted">Version {{ req.version }}</span>
          </div>
        </div>
        <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
          <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
          Refresh
        </AppButton>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AppCard class="lg:col-span-2">
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <div>
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Amount</dt>
              <dd class="text-base font-bold text-text-primary mt-0.5">{{ money(req.amount_cents) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Maker</dt>
              <dd class="text-sm font-medium text-text-primary mt-0.5">{{ req.maker_label || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Requested</dt>
              <dd class="text-sm font-medium text-text-primary mt-0.5">{{ date(req.created_at) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Expires</dt>
              <dd class="text-sm font-medium text-text-primary mt-0.5">{{ date(req.expires_at) }}</dd>
            </div>
            <div v-if="req.decided_at">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Decided</dt>
              <dd class="text-sm font-medium text-text-primary mt-0.5">{{ date(req.decided_at) }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary">Your decision</h2>
          <p class="text-xs text-text-muted mt-1">Choose an outcome, add context if needed, then confirm.</p>
          <template v-if="isActionable">
            <textarea
              v-model="note" rows="3" placeholder="Add a note (optional)"
              class="mt-3 w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
            />
            <div class="flex gap-2 mt-3">
              <AppButton size="sm" :loading="acting === 'APPROVE'" :disabled="!!acting" @click="decide('APPROVE')">
                <template #icon><CheckIcon class="w-3.5 h-3.5" /></template>
                Approve
              </AppButton>
              <AppButton size="sm" variant="secondary" :loading="acting === 'REJECT'" :disabled="!!acting" @click="decide('REJECT')">
                <template #icon><XIcon class="w-3.5 h-3.5" /></template>
                Reject
              </AppButton>
            </div>
          </template>
          <p v-else class="text-xs text-text-muted mt-3">This approval is not currently actionable.</p>
        </AppCard>
      </div>

      <AppCard v-if="req.stages && req.stages.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Stages</h2>
        <p class="text-xs text-text-muted mb-4">This request moves through each review stage before it is complete.</p>
        <div class="flex flex-col gap-3">
          <div
            v-for="st in req.stages" :key="st.id"
            class="flex items-start justify-between gap-4 rounded-xl border px-4 py-3"
            :class="st.stage_index === currentStageIndex && st.status === 'PENDING' ? 'border-primary/40 bg-primary-muted/30' : 'border-border'"
          >
            <div>
              <p class="text-sm font-semibold text-text-primary">{{ st.name || `Stage ${st.stage_index + 1}` }}</p>
              <p class="text-xs text-text-muted mt-0.5">
                {{ st.rule }} · {{ st.received_approvals }}/{{ st.required_approvals }} approvals
                <span v-if="st.verification_methods"> · Verification: {{ st.verification_methods }}</span>
              </p>
            </div>
            <AppBadge :variant="stageVariant(st.status)" size="sm">{{ st.status }}</AppBadge>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="payloadRows.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Payload</h2>
        <p class="text-xs text-text-muted mb-4">The data submitted with this approval request.</p>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div v-for="r in payloadRows" :key="r.label" class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ r.value }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard v-if="req.events && req.events.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Timeline</h2>
        <p class="text-xs text-text-muted mb-4">A record of the events on this approval.</p>
        <ol class="flex flex-col gap-4">
          <li v-for="(e, i) in req.events" :key="e.id" class="flex gap-3">
            <div class="flex flex-col items-center">
              <span class="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <span v-if="i < req.events.length - 1" class="w-px flex-1 bg-border mt-1" />
            </div>
            <div>
              <p class="text-xs text-text-muted">{{ date(e.created_at) }}</p>
              <p class="text-sm font-medium text-text-primary">{{ e.detail || e.event_type }}</p>
              <p class="text-xs text-text-muted">
                By {{ e.actor_label || 'system' }}<span v-if="e.status_after"> · {{ e.status_after }}</span>
              </p>
            </div>
          </li>
        </ol>
      </AppCard>
    </template>
  </div>
</template>
