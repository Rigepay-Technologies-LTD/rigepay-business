<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchScheduledPayout, pauseScheduledPayout, resumeScheduledPayout, cancelScheduledPayout,
  fetchOrgVaults, type ScheduledPayout, type OrgVault,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ChevronLeftIcon, PauseIcon, PlayIcon, XCircleIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; scheduleId: string; listRouteName: string }>()
const router = useRouter()
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const isBranch = computed(() => !!props.branchId)

const sp = ref<ScheduledPayout | null>(null)
const vaults = ref<OrgVault[]>([])
const loading = ref(true)
const acting = ref(false)

async function load() {
  loading.value = true
  try {
    const [s, v] = await Promise.all([
      fetchScheduledPayout(props.scheduleId, isBranch.value),
      fetchOrgVaults().catch(() => [] as OrgVault[]),
    ])
    sp.value = s
    vaults.value = v
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function statusVariant(s?: string) {
  if (s === 'ACTIVE') return 'success'
  if (s === 'PAUSED') return 'warning'
  if (s === 'CANCELLED') return 'error'
  return 'neutral'
}
function fundingLabel(s: ScheduledPayout) {
  if (s.funding_source === 'MAIN') return 'MAIN wallet'
  const v = vaults.value.find((x) => x.id === s.vault_id)
  return v ? `Vault — ${v.name}` : 'Vault'
}
function destLabel(t: string) {
  return { BANK_ACCOUNT: 'Bank account', PAYBILL: 'Paybill', TILL_NUMBER: 'Till number' }[t] || 'Mobile money'
}

const rows = computed(() => {
  const s = sp.value
  if (!s) return [] as { label: string; value: string; mono?: boolean }[]
  const list: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Recipient', value: s.recipient_name },
    { label: 'Amount', value: s.sweep_full_balance ? 'Sweep full balance' : `KES ${formatMoney(s.amount_cents)}` },
    { label: 'Funded from', value: fundingLabel(s) },
    { label: 'Pay out via', value: destLabel(s.destination_type) },
    { label: 'Destination', value: s.destination_type === 'BANK_ACCOUNT' ? `${s.bank_code || ''} ${s.bank_account_number || ''}`.trim() : (s.phone_number || '—') },
    { label: 'Remarks', value: s.remarks || '—' },
  ]
  if (s.trigger_type === 'THRESHOLD') {
    list.push(
      { label: 'Trigger', value: `Balance reaches KES ${formatMoney(s.threshold_cents || 0)}` },
      { label: 'Armed', value: s.threshold_armed === false ? 'Waiting to re-arm' : 'Yes' },
    )
  } else {
    list.push(
      { label: 'Schedule', value: s.schedule_type === 'RECURRING' ? `Recurring (${s.recurrence_interval?.toLowerCase()})` : 'One-time' },
      { label: 'Next run', value: ['CANCELLED', 'COMPLETED'].includes(s.status) ? '—' : formatDate(s.next_run_at || '') },
      { label: 'End date', value: s.end_date ? formatDate(s.end_date) : '—' },
    )
  }
  list.push(
    { label: 'Last run', value: s.last_run_at ? `${formatDate(s.last_run_at)}${s.last_run_status ? ` · ${s.last_run_status}` : ''}` : 'Not yet run' },
    { label: 'Tags', value: s.tags?.length ? s.tags.join(', ') : '—' },
    { label: 'Created', value: formatDate(s.created_at) },
    { label: 'Schedule ID', value: s.id, mono: true },
  )
  return list
})

async function doAction(kind: 'pause' | 'resume' | 'cancel') {
  if (!sp.value) return
  if (kind === 'cancel') {
    const ok = await confirmAction({
      title: 'Cancel this scheduled payout?', message: 'This cannot be undone.',
      confirmLabel: 'Cancel payout', cancelLabel: 'Keep it', danger: true,
    })
    if (!ok) return
  }
  acting.value = true
  try {
    if (kind === 'pause') await pauseScheduledPayout(sp.value.id, isBranch.value)
    else if (kind === 'resume') await resumeScheduledPayout(sp.value.id, isBranch.value)
    else await cancelScheduledPayout(sp.value.id, isBranch.value)
    showSuccess(kind === 'pause' ? 'Schedule paused.' : kind === 'resume' ? 'Schedule resumed.' : 'Schedule cancelled.')
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
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
  <div class="flex flex-col gap-6 max-w-3xl">
    <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Scheduled payouts
    </button>

    <p v-if="loading" class="text-sm text-text-muted">Loading schedule…</p>

    <template v-else-if="sp">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Scheduled payout</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ sp.recipient_name }}</h1>
          <p class="text-2xl font-bold text-text-primary tracking-tight mt-1">
            {{ sp.sweep_full_balance ? 'Full balance' : `KES ${formatMoney(sp.amount_cents)}` }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-3">
          <AppBadge :variant="statusVariant(sp.status)" size="sm">{{ sp.status }}</AppBadge>
          <div class="flex gap-2">
            <AppButton v-if="sp.status === 'ACTIVE'" size="sm" variant="secondary" :loading="acting" @click="doAction('pause')">
              <template #icon><PauseIcon class="w-3.5 h-3.5" /></template>Pause
            </AppButton>
            <AppButton v-if="sp.status === 'PAUSED'" size="sm" variant="secondary" :loading="acting" @click="doAction('resume')">
              <template #icon><PlayIcon class="w-3.5 h-3.5" /></template>Resume
            </AppButton>
            <AppButton v-if="sp.status === 'ACTIVE' || sp.status === 'PAUSED'" size="sm" variant="ghost" :loading="acting" @click="doAction('cancel')">
              <template #icon><XCircleIcon class="w-3.5 h-3.5" /></template>Cancel
            </AppButton>
          </div>
        </div>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Details</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div v-for="r in rows" :key="r.label" class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
            <dd class="font-medium text-text-primary text-right break-all" :class="r.mono ? 'font-mono text-xs' : ''">{{ r.value }}</dd>
          </div>
        </dl>
      </AppCard>
    </template>

    <AppCard v-else class="py-12 text-center">
      <p class="text-sm text-text-muted">This scheduled payout could not be found.</p>
    </AppCard>
  </div>
</template>
