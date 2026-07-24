<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  requestBranchPayout, confirmBranchPayout, fetchBranchPayoutFeeEstimate, fetchOrgBankCodes,
  type BankCode, type PayoutFeeEstimate,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

const props = defineProps<{ orgId: string; branchId: string }>()

const error = ref<string | null>(null)
const bankOptions = ref<{ value: string; label: string }[]>([])

async function loadBankCodes() {
  try {
    const codes: BankCode[] = await fetchOrgBankCodes(true)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
onMounted(loadBankCodes)

const amountKes = ref('')
const recipientName = ref('')
const remarks = ref('')
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT'>('PHONE_NUMBER')
const phoneNumber = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const confirmPassword = ref('')
const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]

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

const requesting = ref(false)
const requestError = ref<string | null>(null)
const requestSuccess = ref<string | null>(null)

const otpStep = ref(false)
const otp = ref('')
const otpError = ref<string | null>(null)
const otpConfirming = ref(false)
const pendingPayoutId = ref<string | null>(null)
const pendingFeeCents = ref<number | undefined>(undefined)

function resetForm() {
  amountKes.value = ''
  recipientName.value = ''
  remarks.value = ''
  phoneNumber.value = ''
  bankAccountNumber.value = ''
  confirmPassword.value = ''
  feeEstimate.value = null
}

async function submitPayout() {
  requestError.value = null
  requestSuccess.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !recipientName.value.trim() || !remarks.value.trim()) {
    requestError.value = 'Amount (min KES 1), recipient name, and remarks are required.'
    return
  }
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      requestError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (!phoneNumber.value.trim()) {
    requestError.value = 'Recipient phone number is required.'
    return
  }
  if (!confirmPassword.value) {
    requestError.value = 'Re-enter your account password to confirm this payout.'
    return
  }

  requesting.value = true
  try {
    const result = await requestBranchPayout({
      amount: amountCents,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      password: confirmPassword.value,
    })
    if (result.status === 'otp_required') {
      pendingPayoutId.value = result.payout_id ?? null
      pendingFeeCents.value = result.fee_cents
      otp.value = ''
      otpError.value = null
      otpStep.value = true
    } else {
      requestSuccess.value = result.message || 'Payout queued for execution.'
      resetForm()
    }
  } catch (err) {
    requestError.value = extractErrorMessage(err)
  } finally {
    requesting.value = false
  }
}

async function submitOtp() {
  otpError.value = null
  if (!/^\d{6}$/.test(otp.value)) {
    otpError.value = 'Enter the 6-digit code sent to your phone.'
    return
  }
  otpConfirming.value = true
  try {
    const result = await confirmBranchPayout(otp.value)
    requestSuccess.value = result.message || 'Payout queued for execution.'
    otpStep.value = false
    resetForm()
  } catch (err) {
    otpError.value = extractErrorMessage(err)
  } finally {
    otpConfirming.value = false
  }
}

function cancelOtp() {
  otpStep.value = false
  otp.value = ''
  otpError.value = null
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Payouts">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard v-if="otpStep">
        <h2 class="text-sm font-bold text-text-primary mb-1">Enter confirmation code</h2>
        <p class="text-xs text-text-muted mb-4">
          We sent a 6-digit code by SMS to confirm this payout<span v-if="pendingFeeCents !== undefined">
            (fee: KES {{ formatMoney(pendingFeeCents) }})</span>. Enter it below to release the payout for execution.
        </p>
        <div v-if="otpError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ otpError }}</div>
        <form class="flex flex-col gap-4 max-w-xs" @submit.prevent="submitOtp">
          <AppInput v-model="otp" label="6-digit code" placeholder="000000" maxlength="6" required autofocus />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="otpConfirming" class="self-start">Confirm payout</AppButton>
            <AppButton type="button" variant="secondary" :disabled="otpConfirming" class="self-start" @click="cancelOtp">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard v-else>
        <h2 class="text-sm font-bold text-text-primary mb-1">Request a payout</h2>
        <p class="text-xs text-text-muted mb-4">
          Paid out from this branch's own wallet. Requires payment-initiation permission on your account.
        </p>
        <div v-if="requestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ requestError }}</div>
        <div v-if="requestSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ requestSuccess }}</div>

        <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitPayout">
          <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />
          <div v-if="destinationType === 'PHONE_NUMBER'">
            <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect v-model="bankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
            <AppInput v-model="bankAccountNumber" label="Account number" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="recipientName" label="Recipient name" required />
          </div>
          <p v-if="feeEstimateLoading" class="text-xs text-text-muted">Estimating fee…</p>
          <div v-else-if="feeEstimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>Estimated fee: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.fee_cents) }}</span></span>
            <span>Total to be debited: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.total_cents) }}</span></span>
          </div>

          <AppInput v-model="remarks" label="Remarks" placeholder="Reason for this payout" required />
          <AppInput v-model="confirmPassword" type="password" label="Confirm your password" required />

          <AppButton type="submit" :loading="requesting" class="self-start">Request payout</AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
