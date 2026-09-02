<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchScheduledPayouts, createScheduledPayout, confirmScheduledPayout,
  fetchOrgBankCodes, fetchBranchPayoutFeeEstimate, validateOrgShortcode,
  type ScheduledPayout, type BankCode, type PayoutFeeEstimate,
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
import AppModal from '@/components/ui/AppModal.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import { PlusIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const router = useRouter()
const { showError } = useResponseModal()

function openDetail(id: string) {
  router.push({ name: 'branch-scheduled-payout-detail', params: { orgId: props.orgId, branchId: props.branchId, scheduleId: id } })
}
const summary = computed(() => ({
  active: schedules.value.filter((s) => s.status === 'ACTIVE').length,
  paused: schedules.value.filter((s) => s.status === 'PAUSED').length,
  total: schedules.value.length,
}))

const loading = ref(true)
const error = ref<string | null>(null)
const schedules = ref<ScheduledPayout[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    schedules.value = (await fetchScheduledPayouts(true)) ?? []
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
    const codes: BankCode[] = await fetchOrgBankCodes(true)
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
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'>('PHONE_NUMBER')
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
      feeEstimate.value = await fetchBranchPayoutFeeEstimate(amountCents, destinationType.value)
    } catch {
      feeEstimate.value = null
    } finally {
      feeEstimateLoading.value = false
    }
  }, 400)
})
const phoneNumber = ref('')
const shortcode = ref('')
const accountReference = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const recipientName = ref('')

const validating = ref(false)
const shortcodeValidation = ref<{ ok: boolean; message: string } | null>(null)
async function validateShortcodeRecipient() {
  shortcodeValidation.value = null
  if (!shortcode.value.trim()) {
    shortcodeValidation.value = { ok: false, message: `Enter a ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number first.` }
    return
  }
  validating.value = true
  try {
    const result = await validateOrgShortcode(true, shortcode.value.trim(), destinationType.value === 'PAYBILL' ? 'paybill' : 'till')
    shortcodeValidation.value = { ok: true, message: `Account holder: ${result.account_name}` }
    if (!recipientName.value.trim()) recipientName.value = result.account_name
  } catch (err) {
    shortcodeValidation.value = { ok: false, message: extractErrorMessage(err) }
  } finally {
    validating.value = false
  }
}
const remarks = ref('')
const triggerType = ref<'SCHEDULE' | 'THRESHOLD'>('SCHEDULE')
const thresholdKes = ref('')
const scheduleType = ref<'ONE_TIME' | 'RECURRING'>('ONE_TIME')
const recurrenceInterval = ref<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY')
const recurrenceDayOfWeek = ref<number | null>(null)
const recurrenceTimeOfDay = ref('')
const tagsInput = ref('')
const sweepFullBalance = ref(false)
const confirmPassword = ref('')

function onToggleSweep(checked: boolean) {
  sweepFullBalance.value = checked
  if (checked && triggerType.value === 'SCHEDULE') {
    scheduleType.value = 'RECURRING'
  }
}
const startAtDate = ref('')
const startAtTime = ref('09:00')
const endDate = ref('')

const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL_NUMBER', label: 'Till number' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]
const triggerTypeOptions = [
  { value: 'SCHEDULE', label: 'Schedule (date/recurring)' },
  { value: 'THRESHOLD', label: 'Threshold (balance reaches an amount)' },
]
const scheduleTypeOptions = [
  { value: 'ONE_TIME', label: 'One-time (specific date)' },
  { value: 'RECURRING', label: 'Recurring' },
]
const recurrenceOptions = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]
const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]
const dayOfWeekModel = computed({
  get: () => (recurrenceDayOfWeek.value === null ? '' : String(recurrenceDayOfWeek.value)),
  set: (v: string) => { recurrenceDayOfWeek.value = v === '' ? null : Number(v) },
})

function resetCreateForm() {
  amountKes.value = ''
  feeEstimate.value = null
  phoneNumber.value = ''
  shortcode.value = ''
  accountReference.value = ''
  shortcodeValidation.value = null
  bankCode.value = ''
  bankAccountNumber.value = ''
  recipientName.value = ''
  remarks.value = ''
  triggerType.value = 'SCHEDULE'
  thresholdKes.value = ''
  scheduleType.value = 'ONE_TIME'
  recurrenceInterval.value = 'MONTHLY'
  recurrenceDayOfWeek.value = null
  recurrenceTimeOfDay.value = ''
  tagsInput.value = ''
  sweepFullBalance.value = false
  startAtDate.value = ''
  startAtTime.value = '09:00'
  endDate.value = ''
  confirmPassword.value = ''
}

async function submitCreate() {
  createError.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (sweepFullBalance.value) {
    if (triggerType.value === 'SCHEDULE' && scheduleType.value !== 'RECURRING') {
      createError.value = 'Auto-settlement (sweep full balance) requires a recurring schedule.'
      return
    }
  } else if (!amountCents || amountCents < 100) {
    createError.value = 'Enter a valid amount (min KES 1), or turn on "Sweep entire balance" for auto-settlement.'
    return
  }
  if (!recipientName.value.trim() || !remarks.value.trim()) {
    createError.value = 'Recipient name and remarks are required.'
    return
  }
  if (triggerType.value === 'THRESHOLD') {
    const thresholdCents = Math.round(Number(thresholdKes.value) * 100)
    if (!thresholdCents || thresholdCents <= 0) {
      createError.value = 'Enter the wallet balance (KES) that should trigger this settlement.'
      return
    }
  } else if (!startAtDate.value) {
    createError.value = 'A start date is required for a scheduled rule.'
    return
  }
  const isShortcode = destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER'
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      createError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (isShortcode) {
    if (!shortcode.value.trim()) {
      createError.value = `Enter the ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number.`
      return
    }
  } else if (!phoneNumber.value.trim()) {
    createError.value = 'Recipient phone number is required.'
    return
  }
  if (!confirmPassword.value) {
    createError.value = 'Re-enter your account password to confirm this schedule.'
    return
  }

  let startAtIso: string | undefined
  if (triggerType.value === 'SCHEDULE') {
    const startAt = new Date(`${startAtDate.value}T${startAtTime.value || '09:00'}:00`)
    if (isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      createError.value = 'Start date/time must be in the future.'
      return
    }
    startAtIso = startAt.toISOString()
  }

  const tags = tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean)
  const isWeeklyRecurring = triggerType.value === 'SCHEDULE' && scheduleType.value === 'RECURRING' && recurrenceInterval.value === 'WEEKLY'

  creating.value = true
  try {
    const result = await createScheduledPayout({
      amount: sweepFullBalance.value ? 0 : amountCents,
      sweep_full_balance: sweepFullBalance.value || undefined,
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      shortcode: (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') ? shortcode.value.trim() : undefined,
      account_reference: (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') ? accountReference.value.trim() || undefined : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      funding_source: 'MAIN',
      trigger_type: triggerType.value,
      threshold_cents: triggerType.value === 'THRESHOLD' ? Math.round(Number(thresholdKes.value) * 100) : undefined,
      schedule_type: triggerType.value === 'SCHEDULE' ? scheduleType.value : undefined,
      recurrence_interval: triggerType.value === 'SCHEDULE' && scheduleType.value === 'RECURRING' ? recurrenceInterval.value : undefined,
      recurrence_day_of_week: isWeeklyRecurring && recurrenceDayOfWeek.value !== null ? recurrenceDayOfWeek.value : undefined,
      recurrence_time_of_day: isWeeklyRecurring && recurrenceTimeOfDay.value ? recurrenceTimeOfDay.value : undefined,
      start_at: startAtIso,
      end_date: triggerType.value === 'SCHEDULE' && scheduleType.value === 'RECURRING' && endDate.value ? new Date(`${endDate.value}T23:59:59`).toISOString() : undefined,
      tags: tags.length ? tags : undefined,
      password: confirmPassword.value,
    }, true)
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
  otpConfirming.value = true
  try {
    await confirmScheduledPayout(otp.value, true)
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

const scheduleColumns = [
  { key: 'recipient_name', label: 'Recipient' },
  { key: 'amount_cents', label: 'Amount', class: 'text-right' },
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
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Scheduled payouts">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Automation</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Scheduled payouts</h1>
          <p class="text-sm text-text-muted mt-0.5">
            One-time or recurring payouts, funded from this branch's own MAIN wallet.
          </p>
        </div>
        <AppButton size="sm" @click="showCreateForm = true">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New schedule
        </AppButton>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Active</p><p class="text-lg font-bold text-text-primary mt-1">{{ summary.active }}</p></AppCard>
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Paused</p><p class="text-lg font-bold text-text-primary mt-1">{{ summary.paused }}</p></AppCard>
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total</p><p class="text-lg font-bold text-text-primary mt-1">{{ summary.total }}</p></AppCard>
      </div>

      <AppCard padding="none">
        <div class="px-5 pt-5"><h2 class="text-sm font-bold text-text-primary mb-4">All schedules</h2></div>
        <AppTable :columns="scheduleColumns" :rows="schedules" :loading="loading" empty-message="No scheduled payouts yet." clickable @row-click="(r) => openDetail((r as unknown as ScheduledPayout).id)">
          <template #cell-amount_cents="{ value, row }">
            {{ (row as unknown as ScheduledPayout).sweep_full_balance ? 'Full balance' : `KES ${formatMoney(value as number)}` }}
          </template>
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
    </div>

    <AppModal v-model="otpStep" title="Confirm scheduled payout" size="sm" @update:model-value="(v: boolean) => { if (!v) cancelOtp() }">
      <OtpConfirmCard
        v-model="otp"
        subject="scheduled payout"
        :confirming="otpConfirming"
        :error="otpError"
        @confirm="submitOtp"
        @cancel="cancelOtp"
      />
    </AppModal>

    <AppModal v-model="showCreateForm" title="New scheduled payout" size="lg">
      <div>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
          <label class="flex items-start gap-2.5 text-sm text-text-secondary rounded-xl bg-surface-2 px-4 py-3">
            <input
              type="checkbox" :checked="sweepFullBalance"
              class="w-4 h-4 rounded mt-0.5" @change="onToggleSweep(($event.target as HTMLInputElement).checked)"
            />
            <span>
              <span class="font-semibold text-text-primary">Auto-settlement — sweep entire balance each run</span><br />
              Instead of a fixed amount, moves the full branch MAIN wallet balance (minus fees) to this destination
              on a recurring cadence. Skips silently if the balance is too small to be worth moving.
              <span v-if="sweepFullBalance" class="block mt-1 text-text-muted">Schedule type set to Recurring automatically.</span>
            </span>
          </label>

          <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />
          <div v-if="destinationType === 'PHONE_NUMBER'">
            <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
          </div>
          <div v-else-if="destinationType === 'PAYBILL' || destinationType === 'TILL_NUMBER'" class="flex flex-col gap-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <AppInput
                v-model="shortcode"
                :label="destinationType === 'PAYBILL' ? 'Paybill number' : 'Till number'"
                :placeholder="destinationType === 'PAYBILL' ? 'e.g. 522522' : 'e.g. 123456'"
                required
              />
              <AppButton type="button" variant="secondary" :loading="validating" @click="validateShortcodeRecipient">Verify recipient</AppButton>
            </div>
            <AppInput v-if="destinationType === 'PAYBILL'" v-model="accountReference" label="Account number / reference (optional)" placeholder="e.g. invoice or account number" />
            <div v-if="shortcodeValidation" :class="['text-xs rounded-lg px-3 py-2', shortcodeValidation.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
              {{ shortcodeValidation.message }}
            </div>
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
          <AppInput v-model="remarks" label="Remarks" placeholder="e.g. Monthly branch rent" required />
          <AppInput v-model="tagsInput" label="Tags (optional)" placeholder="comma-separated, e.g. rent, ops" />

          <div class="border-t border-border pt-4 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Trigger</p>
            <AppSelect v-model="triggerType" label="Run this rule based on" :options="triggerTypeOptions" class="max-w-sm" />

            <template v-if="triggerType === 'THRESHOLD'">
              <AppInput
                v-model="thresholdKes" type="number" label="Trigger when wallet balance reaches (KES)"
                placeholder="e.g. 50000" required
              />
              <p class="text-xs text-text-muted -mt-2">
                Fires automatically once this branch's wallet balance reaches this amount, then re-arms only after
                the balance drops back below it and rises again.
              </p>
            </template>

            <template v-else>
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Timing</p>
              <AppSelect v-model="scheduleType" label="Schedule type" :options="scheduleTypeOptions" class="max-w-sm" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AppInput v-model="startAtDate" type="date" :label="scheduleType === 'ONE_TIME' ? 'Run on' : 'First run on'" required />
                <AppInput v-model="startAtTime" type="time" label="Time" />
              </div>
              <template v-if="scheduleType === 'RECURRING'">
                <AppSelect v-model="recurrenceInterval" label="Repeats" :options="recurrenceOptions" class="max-w-sm" />
                <template v-if="recurrenceInterval === 'WEEKLY'">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AppSelect v-model="dayOfWeekModel" label="Day of week (optional)" placeholder="— Same weekday as first run —" :options="dayOfWeekOptions" />
                    <AppInput v-model="recurrenceTimeOfDay" type="time" label="Time of day (optional)" />
                  </div>
                </template>
                <AppInput v-model="endDate" type="date" label="End date (optional)" />
              </template>
            </template>
          </div>

          <ConfirmSecretInput v-model="confirmPassword" :is-pin="false" />

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create schedule</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
