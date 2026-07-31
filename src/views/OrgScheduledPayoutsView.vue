<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchScheduledPayouts, createScheduledPayout, confirmScheduledPayout, pauseScheduledPayout, resumeScheduledPayout, cancelScheduledPayout,
  fetchOrgVaults, fetchOrgBankCodes, fetchPayoutFeeEstimate,
  type ScheduledPayout, type OrgVault, type BankCode, type PayoutFeeEstimate,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { PlusIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const { showError } = useResponseModal()

const loading = ref(true)
const error = ref<string | null>(null)
const schedules = ref<ScheduledPayout[]>([])
const vaults = ref<OrgVault[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const [s, v] = await Promise.all([fetchScheduledPayouts(), fetchOrgVaults()])
    schedules.value = s
    vaults.value = v
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}

async function loadBankCodes() {
  try {
    const codes: BankCode[] = await fetchOrgBankCodes(false)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

onMounted(() => {
  load()
  loadBankCodes()
})

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

const amountKes = ref('')
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT'>('PHONE_NUMBER')
const feeEstimate = ref<PayoutFeeEstimate | null>(null)
const feeEstimateLoading = ref(false)
let feeEstimateTimer: ReturnType<typeof setTimeout> | null = null

watch([amountKes, destinationType], () => {
  feeEstimate.value = null
  if (feeEstimateTimer) clearTimeout(feeEstimateTimer)
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100) return
  feeEstimateTimer = setTimeout(async () => {
    feeEstimateLoading.value = true
    try {
      feeEstimate.value = await fetchPayoutFeeEstimate(amountCents, destinationType.value)
    } catch {
      feeEstimate.value = null
    } finally {
      feeEstimateLoading.value = false
    }
  }, 400)
})
const phoneNumber = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const recipientName = ref('')
const remarks = ref('')
const fundingSource = ref<'MAIN' | 'VAULT'>('MAIN')
const vaultId = ref('')
const scheduleType = ref<'ONE_TIME' | 'RECURRING'>('ONE_TIME')
const recurrenceInterval = ref<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY')
const sweepFullBalance = ref(false)

function onToggleSweep(checked: boolean) {
  sweepFullBalance.value = checked
  if (checked) {
    scheduleType.value = 'RECURRING'
  }
}
const startAtDate = ref('')
const startAtTime = ref('09:00')
const endDate = ref('')

const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]
const fundingSourceOptions = computed(() => [
  { value: 'MAIN', label: 'Organization MAIN wallet' },
  ...vaults.value.map((v) => ({ value: `VAULT:${v.id}`, label: `Vault — ${v.name} (KES ${formatMoney(v.balance_cents)})` })),
])
const scheduleTypeOptions = [
  { value: 'ONE_TIME', label: 'One-time (specific date)' },
  { value: 'RECURRING', label: 'Recurring' },
]
const recurrenceOptions = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

const fundingSourceCombined = computed({
  get: () => (fundingSource.value === 'VAULT' ? `VAULT:${vaultId.value}` : 'MAIN'),
  set: (v: string) => {
    if (v === 'MAIN') {
      fundingSource.value = 'MAIN'
      vaultId.value = ''
    } else {
      fundingSource.value = 'VAULT'
      vaultId.value = v.replace('VAULT:', '')
      sweepFullBalance.value = false
    }
  },
})

function resetCreateForm() {
  amountKes.value = ''
  feeEstimate.value = null
  phoneNumber.value = ''
  bankCode.value = ''
  bankAccountNumber.value = ''
  recipientName.value = ''
  remarks.value = ''
  fundingSource.value = 'MAIN'
  vaultId.value = ''
  scheduleType.value = 'ONE_TIME'
  recurrenceInterval.value = 'MONTHLY'
  sweepFullBalance.value = false
  startAtDate.value = ''
  startAtTime.value = '09:00'
  endDate.value = ''
}

async function submitCreate() {
  createError.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (sweepFullBalance.value) {
    if (scheduleType.value !== 'RECURRING' || fundingSource.value !== 'MAIN') {
      createError.value = 'Auto-settlement (sweep full balance) requires a recurring schedule funded from the MAIN wallet.'
      return
    }
  } else if (!amountCents || amountCents < 100) {
    createError.value = 'Enter a valid amount (min KES 1), or turn on "Sweep entire balance" for auto-settlement.'
    return
  }
  if (!recipientName.value.trim() || !remarks.value.trim() || !startAtDate.value) {
    createError.value = 'Recipient name, remarks, and a start date are all required.'
    return
  }
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      createError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (!phoneNumber.value.trim()) {
    createError.value = 'Recipient phone number is required.'
    return
  }
  if (fundingSource.value === 'VAULT' && !vaultId.value) {
    createError.value = 'Select a vault to fund this schedule from.'
    return
  }

  const startAt = new Date(`${startAtDate.value}T${startAtTime.value || '09:00'}:00`)
  if (isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    createError.value = 'Start date/time must be in the future.'
    return
  }

  creating.value = true
  try {
    const result = await createScheduledPayout({
      amount: sweepFullBalance.value ? 0 : amountCents,
      sweep_full_balance: sweepFullBalance.value || undefined,
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      funding_source: fundingSource.value,
      vault_id: fundingSource.value === 'VAULT' ? vaultId.value : undefined,
      schedule_type: scheduleType.value,
      recurrence_interval: scheduleType.value === 'RECURRING' ? recurrenceInterval.value : undefined,
      start_at: startAt.toISOString(),
      end_date: scheduleType.value === 'RECURRING' && endDate.value ? new Date(`${endDate.value}T23:59:59`).toISOString() : undefined,
    })
    if (result.status === 'otp_required') {
      otp.value = ''
      otpError.value = null
      otpStep.value = true
      return
    }
    resetCreateForm()
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const otpStep = ref(false)
const otp = ref('')
const otpError = ref<string | null>(null)
const otpConfirming = ref(false)

async function submitOtp() {
  otpError.value = null
  if (!/^\d{6}$/.test(otp.value)) {
    otpError.value = 'Enter the 6-digit code sent to your phone.'
    return
  }
  otpConfirming.value = true
  try {
    await confirmScheduledPayout(otp.value)
    otpStep.value = false
    resetCreateForm()
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    otpError.value = msg
    showError(msg)
  } finally {
    otpConfirming.value = false
  }
}

function cancelOtp() {
  otpStep.value = false
  otp.value = ''
  otpError.value = null
}

const actionLoading = ref<string | null>(null)
const actionError = ref<Record<string, string>>({})

async function handlePause(id: string) {
  actionLoading.value = id
  actionError.value = { ...actionError.value, [id]: '' }
  try {
    await pauseScheduledPayout(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    actionError.value = { ...actionError.value, [id]: msg }
    showError(msg)
  } finally {
    actionLoading.value = null
  }
}
async function handleResume(id: string) {
  actionLoading.value = id
  actionError.value = { ...actionError.value, [id]: '' }
  try {
    await resumeScheduledPayout(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    actionError.value = { ...actionError.value, [id]: msg }
    showError(msg)
  } finally {
    actionLoading.value = null
  }
}
async function handleCancel(id: string) {
  if (!confirm('Cancel this scheduled payout? This cannot be undone.')) return
  actionLoading.value = id
  actionError.value = { ...actionError.value, [id]: '' }
  try {
    await cancelScheduledPayout(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    actionError.value = { ...actionError.value, [id]: msg }
    showError(msg)
  } finally {
    actionLoading.value = null
  }
}

const scheduleColumns = [
  { key: 'recipient_name', label: 'Recipient' },
  { key: 'amount_cents', label: 'Amount', class: 'text-right' },
  { key: 'funding_source', label: 'Funded from' },
  { key: 'schedule_type', label: 'Type' },
  { key: 'next_run_at', label: 'Next run' },
  { key: 'status', label: 'Status' },
]

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PAUSED') return 'warning'
  if (status === 'CANCELLED') return 'error'
  return 'neutral'
}

function fundingLabel(sp: ScheduledPayout): string {
  if (sp.funding_source === 'MAIN') return 'MAIN wallet'
  const v = vaults.value.find((x) => x.id === sp.vault_id)
  return v ? `Vault — ${v.name}` : 'Vault'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Scheduled payouts">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Pay as you go</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Schedule a one-time future payout or a recurring one. Funds are debited from your MAIN wallet or a vault
            automatically when the run is due.
          </p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New schedule
        </AppButton>
      </div>

      <AppCard v-if="otpStep">
        <h3 class="text-sm font-bold text-text-primary mb-1">Enter confirmation code</h3>
        <p class="text-xs text-text-muted mb-4">
          We sent a 6-digit code by SMS to confirm this scheduled payout. Enter it below to activate the schedule.
        </p>
        <div v-if="otpError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ otpError }}</div>
        <form class="flex flex-col gap-4 max-w-xs" @submit.prevent="submitOtp">
          <AppInput v-model="otp" label="6-digit code" placeholder="000000" maxlength="6" required autofocus />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="otpConfirming" class="self-start">Confirm schedule</AppButton>
            <AppButton type="button" variant="secondary" :disabled="otpConfirming" class="self-start" @click="cancelOtp">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard v-else-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-4">New scheduled payout</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
          <AppSelect v-model="fundingSourceCombined" label="Funded from" :options="fundingSourceOptions" />

          <label
            class="flex items-start gap-2.5 text-sm text-text-secondary rounded-xl bg-surface-2 px-4 py-3"
            :class="fundingSource !== 'MAIN' ? 'opacity-50' : ''"
          >
            <input
              type="checkbox" :checked="sweepFullBalance" :disabled="fundingSource !== 'MAIN'"
              class="w-4 h-4 rounded mt-0.5" @change="onToggleSweep(($event.target as HTMLInputElement).checked)"
            />
            <span>
              <span class="font-semibold text-text-primary">Auto-settlement — sweep entire balance each run</span><br />
              Instead of a fixed amount, moves the full MAIN wallet balance (minus fees) to this destination on a
              recurring cadence. Skips silently if the balance is too small to be worth moving.
              <span v-if="fundingSource !== 'MAIN'" class="block mt-1 text-text-muted">Only available when funded from the MAIN wallet.</span>
              <span v-else-if="sweepFullBalance" class="block mt-1 text-text-muted">Schedule type set to Recurring automatically.</span>
            </span>
          </label>

          <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />
          <div v-if="destinationType === 'PHONE_NUMBER'">
            <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect v-model="bankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
            <AppInput v-model="bankAccountNumber" label="Account number" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-if="!sweepFullBalance" v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="recipientName" label="Recipient name" required />
          </div>
          <p v-if="!sweepFullBalance && feeEstimateLoading" class="text-xs text-text-muted">Estimating fee…</p>
          <div v-else-if="!sweepFullBalance && feeEstimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>Estimated fee per run: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.fee_cents) }}</span></span>
            <span>Total debited per run: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.total_cents) }}</span></span>
          </div>
          <AppInput v-model="remarks" label="Remarks" placeholder="e.g. Monthly office rent" required />

          <div class="border-t border-border pt-4 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Timing</p>
            <AppSelect v-model="scheduleType" label="Schedule type" :options="scheduleTypeOptions" class="max-w-sm" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AppInput v-model="startAtDate" type="date" :label="scheduleType === 'ONE_TIME' ? 'Run on' : 'First run on'" required />
              <AppInput v-model="startAtTime" type="time" label="Time" />
            </div>
            <template v-if="scheduleType === 'RECURRING'">
              <AppSelect v-model="recurrenceInterval" label="Repeats" :options="recurrenceOptions" class="max-w-sm" />
              <AppInput v-model="endDate" type="date" label="End date (optional)" />
            </template>
          </div>

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create schedule</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard padding="none">
        <div class="px-5 pt-5">
          <h2 class="text-sm font-bold text-text-primary mb-4">All schedules</h2>
        </div>
        <AppTable :columns="scheduleColumns" :rows="schedules" :loading="loading" empty-message="No scheduled payouts yet.">
          <template #cell-amount_cents="{ value, row }">
            {{ (row as unknown as ScheduledPayout).sweep_full_balance ? 'Full balance' : `KES ${formatMoney(value as number)}` }}
          </template>
          <template #cell-funding_source="{ row }">{{ fundingLabel(row as unknown as ScheduledPayout) }}</template>
          <template #cell-schedule_type="{ row }">
            {{ row.schedule_type === 'RECURRING' ? `Recurring (${(row as unknown as ScheduledPayout).recurrence_interval?.toLowerCase()})` : 'One-time' }}
          </template>
          <template #cell-next_run_at="{ value, row }">
            {{ row.status === 'COMPLETED' || row.status === 'CANCELLED' ? '—' : formatDate(value as string) }}
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
        </AppTable>
      </AppCard>

      <AppCard v-if="schedules.length">
        <h2 class="text-sm font-bold text-text-primary mb-4">Manage schedules</h2>
        <div class="flex flex-col gap-3">
          <div v-for="sp in schedules" :key="`actions-${sp.id}`" class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary truncate">
                  {{ sp.recipient_name }} — {{ sp.sweep_full_balance ? 'Full balance' : `KES ${formatMoney(sp.amount_cents)}` }}
                </p>
                <p class="text-xs text-text-muted mt-0.5">
                  {{ fundingLabel(sp) }} · {{ sp.schedule_type === 'RECURRING' ? `Recurring (${sp.recurrence_interval?.toLowerCase()})` : 'One-time' }}
                  <template v-if="sp.last_run_status"> · last run: {{ sp.last_run_status }}</template>
                </p>
              </div>
              <div class="flex gap-2 shrink-0">
                <AppButton v-if="sp.status === 'ACTIVE'" size="sm" variant="secondary" :loading="actionLoading === sp.id" @click="handlePause(sp.id)">Pause</AppButton>
                <AppButton v-if="sp.status === 'PAUSED'" size="sm" variant="secondary" :loading="actionLoading === sp.id" @click="handleResume(sp.id)">Resume</AppButton>
                <AppButton v-if="sp.status === 'ACTIVE' || sp.status === 'PAUSED'" size="sm" variant="ghost" :loading="actionLoading === sp.id" @click="handleCancel(sp.id)">Cancel</AppButton>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
