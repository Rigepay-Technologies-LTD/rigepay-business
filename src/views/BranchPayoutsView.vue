<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  requestBranchPayout, confirmBranchPayout, fetchBranchPayoutFeeEstimate,
  requestOrgPayoutAsMember, confirmOrgPayoutAsMember, fetchPayoutFeeEstimate,
  fetchOrgBankCodes, fetchOrgBeneficiaries, createOrgBeneficiary, deleteOrgBeneficiary, fetchRecentSettlements,
  validateOrgScreenName, validateOrgShortcode, validateOrgBankAccount, validateOrgMobileMoney,
  type BankCode, type PayoutFeeEstimate, type Beneficiary, type RecentSettlement, type ScreenNameMatch,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import { RepeatIcon, XIcon, AlertTriangleIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const auth = useAuthStore()
const { showError, showSuccess } = useResponseModal()


const isOrgMemberView = computed(() => auth.meta?.memberType === 'org_member')
const isOwner = computed(() => auth.meta?.role === 'owner')

const error = ref<string | null>(null)
const bankOptions = ref<{ value: string; label: string }[]>([])

async function loadBankCodes() {
  try {
    const codes: BankCode[] = await fetchOrgBankCodes(!isOrgMemberView.value)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const beneficiaries = ref<Beneficiary[]>([])
const beneficiariesLoading = ref(false)
const beneficiaryError = ref<string | null>(null)
const selectedBeneficiaryId = ref('')
const saveAsBeneficiary = ref(false)
const beneficiaryNickname = ref('')
const removingBeneficiaryId = ref<string | null>(null)

const beneficiaryOptions = computed(() => [
  { value: '', label: '— Pick a saved payee (optional) —' },
  ...beneficiaries.value.map((b) => ({
    value: b.id,
    label: `${b.nickname} — ${b.recipient_name} (${b.destination_type === 'BANK_ACCOUNT' ? b.bank_account_number : b.phone_number})`,
  })),
])

async function loadBeneficiaries() {
  beneficiariesLoading.value = true
  try {
    beneficiaries.value = await fetchOrgBeneficiaries(true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    beneficiaryError.value = msg
    showError(msg)
  } finally {
    beneficiariesLoading.value = false
  }
}

function applyBeneficiary(id: string) {
  const b = beneficiaries.value.find((x) => x.id === id)
  if (!b) return
  destinationType.value = b.destination_type
  recipientName.value = b.recipient_name
  if (b.destination_type === 'BANK_ACCOUNT') {
    bankCode.value = b.bank_code ?? ''
    bankAccountNumber.value = b.bank_account_number ?? ''
    phoneNumber.value = ''
  } else {
    phoneNumber.value = b.phone_number ?? ''
    bankCode.value = ''
    bankAccountNumber.value = ''
  }
  shortcode.value = ''
  accountReference.value = ''
  shortcodeValidation.value = null
}

async function removeBeneficiary(id: string) {
  removingBeneficiaryId.value = id
  try {
    await deleteOrgBeneficiary(id, true)
    beneficiaries.value = beneficiaries.value.filter((b) => b.id !== id)
    if (selectedBeneficiaryId.value === id) selectedBeneficiaryId.value = ''
  } catch (err) {
    const msg = extractErrorMessage(err)
    beneficiaryError.value = msg
    showError(msg)
  } finally {
    removingBeneficiaryId.value = null
  }
}

const recentSettlements = ref<RecentSettlement[]>([])
const recentSettlementsLoading = ref(false)

async function loadRecentSettlements() {
  recentSettlementsLoading.value = true
  try {
    recentSettlements.value = await fetchRecentSettlements(true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    recentSettlementsLoading.value = false
  }
}

function repeatSettlement(s: RecentSettlement) {
  destinationType.value = s.destination_type
  recipientName.value = s.recipient_name
  amountKes.value = String(s.amount_cents / 100)
  if (s.destination_type === 'BANK_ACCOUNT') {
    bankCode.value = s.bank_code ?? ''
    bankAccountNumber.value = s.bank_account_number ?? ''
    phoneNumber.value = ''
  } else {
    phoneNumber.value = s.phone_number ?? ''
    bankCode.value = ''
    bankAccountNumber.value = ''
  }
  shortcode.value = ''
  accountReference.value = ''
  shortcodeValidation.value = null
}

onMounted(() => {
  loadBankCodes()
  loadBeneficiaries()
  loadRecentSettlements()
})

const amountKes = ref('')
const recipientName = ref('')
const remarks = ref('')
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'>('PHONE_NUMBER')
const phoneNumber = ref('')
const shortcode = ref('')
const accountReference = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const confirmSecret = ref('')
const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL_NUMBER', label: 'Till number' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]

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
    const result = await validateOrgShortcode(!isOrgMemberView.value, shortcode.value.trim(), destinationType.value === 'PAYBILL' ? 'paybill' : 'till')
    shortcodeValidation.value = { ok: true, message: `Account holder: ${result.account_name}` }
    if (!recipientName.value.trim()) recipientName.value = result.account_name
  } catch (err) {
    shortcodeValidation.value = { ok: false, message: extractErrorMessage(err) }
  } finally {
    validating.value = false
  }
}


const recipientValidation = ref<{ ok: boolean; message: string } | null>(null)

async function validateRecipient() {
  recipientValidation.value = null
  validating.value = true
  try {
    if (destinationType.value === 'BANK_ACCOUNT') {
      if (!bankAccountNumber.value.trim() || !bankCode.value) {
        recipientValidation.value = { ok: false, message: 'Enter a bank and account number first.' }
        return
      }
      const result = await validateOrgBankAccount(bankAccountNumber.value.trim(), bankCode.value, !isOrgMemberView.value)
      recipientValidation.value = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!recipientName.value.trim()) recipientName.value = result.account_name
    } else {
      if (!phoneNumber.value.trim()) {
        recipientValidation.value = { ok: false, message: 'Enter a phone number first.' }
        return
      }
      const result = await validateOrgMobileMoney(phoneNumber.value.trim(), undefined, !isOrgMemberView.value)
      recipientValidation.value = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!recipientName.value.trim()) recipientName.value = result.account_name
    }
  } catch (err) {
    recipientValidation.value = { ok: false, message: extractErrorMessage(err) }
  } finally {
    validating.value = false
  }
}

const screening = ref<{ isMatch: boolean; matches: ScreenNameMatch[] } | null>(null)

async function screenRecipientName() {
  screening.value = null
  if (!recipientName.value.trim()) return
  try {
    const result = await validateOrgScreenName(recipientName.value.trim(), !isOrgMemberView.value)
    if (result.is_match) {
      screening.value = { isMatch: true, matches: result.matches }
    }
  } catch {
    console.log('Failed to screen')
  }
}

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
      feeEstimate.value = isOrgMemberView.value
        ? await fetchPayoutFeeEstimate(amountCents, destinationType.value)
        : await fetchBranchPayoutFeeEstimate(amountCents, destinationType.value)
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
  shortcode.value = ''
  accountReference.value = ''
  bankAccountNumber.value = ''
  confirmSecret.value = ''
  feeEstimate.value = null
  selectedBeneficiaryId.value = ''
  saveAsBeneficiary.value = false
  beneficiaryNickname.value = ''
  screening.value = null
  shortcodeValidation.value = null
}

async function submitPayout() {
  requestError.value = null
  requestSuccess.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !recipientName.value.trim() || !remarks.value.trim()) {
    requestError.value = 'Amount (min KES 1), recipient name, and remarks are required.'
    return
  }
  const isShortcode = destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER'
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      requestError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (isShortcode) {
    if (!shortcode.value.trim()) {
      requestError.value = `Enter the ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number.`
      return
    }
  } else if (!phoneNumber.value.trim()) {
    requestError.value = 'Recipient phone number is required.'
    return
  }
  const isPin = isOrgMemberView.value && isOwner.value
  if (isPin ? !/^\d{4}$/.test(confirmSecret.value) : !confirmSecret.value) {
    requestError.value = isPin ? 'Enter your 4-digit transaction PIN.' : 'Re-enter your account password to confirm this payout.'
    return
  }

  requesting.value = true
  try {
    const basePayload = {
      amount: amountCents,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      shortcode: isShortcode ? shortcode.value.trim() : undefined,
      account_reference: isShortcode ? accountReference.value.trim() || undefined : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
    }
    const result = isOrgMemberView.value
      ? await requestOrgPayoutAsMember({
          ...basePayload,
          branch_id: props.branchId,
          ...(isOwner.value ? { pin: confirmSecret.value } : { password: confirmSecret.value }),
        })
      : await requestBranchPayout({ ...basePayload, password: confirmSecret.value })

    if (saveAsBeneficiary.value && beneficiaryNickname.value.trim() && !isShortcode) {
      try {
        const b = await createOrgBeneficiary({
          nickname: beneficiaryNickname.value.trim(),
          recipient_name: recipientName.value.trim(),
          destination_type: destinationType.value as 'PHONE_NUMBER' | 'BANK_ACCOUNT',
          phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
          bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
          bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
        }, true)
        beneficiaries.value.unshift(b)
      } catch (err) {
        const msg = extractErrorMessage(err)
        beneficiaryError.value = msg
        showError(msg)
      }
    }

    if (result.status === 'otp_required') {
      pendingPayoutId.value = result.payout_id ?? null
      pendingFeeCents.value = result.fee_cents
      otp.value = ''
      otpError.value = null
      otpStep.value = true
    } else if (result.status === 'approval_required') {
      const msg = result.message || 'This payout requires an owner\'s approval before it executes.'
      requestSuccess.value = msg
      showSuccess(msg)
      resetForm()
      await loadRecentSettlements()
    } else {
      const msg = result.message || 'Payout queued for execution.'
      requestSuccess.value = msg
      showSuccess(msg)
      resetForm()
      await loadRecentSettlements()
    }
  } catch (err) {
    const msg = extractErrorMessage(err)
    requestError.value = msg
    showError(msg)
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
    const result = isOrgMemberView.value
      ? await confirmOrgPayoutAsMember(otp.value)
      : await confirmBranchPayout(otp.value)
    const msg = result.message || 'Payout queued for execution.'
    requestSuccess.value = msg
    showSuccess(msg)
    otpStep.value = false
    resetForm()
    await loadRecentSettlements()
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
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Payouts">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">Send money out via M-Pesa or bank transfer, straight from this branch's own wallet.</p>
      <AppCard v-if="recentSettlements.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Recent settlements</h2>
        <p class="text-xs text-text-muted mb-4">Click one to repeat it — prefills the form below.</p>
        <p v-if="recentSettlementsLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="(s, i) in recentSettlements"
            :key="i"
            type="button"
            class="flex items-center gap-2 rounded-xl bg-surface-2 hover:bg-surface-3 px-3 py-2 text-left transition-colors"
            @click="repeatSettlement(s)"
          >
            <RepeatIcon class="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span>
              <span class="text-sm font-semibold text-text-primary block">{{ s.recipient_name || s.recipient_info }}</span>
              <span class="text-xs text-text-muted">KES {{ formatMoney(s.amount_cents) }} · {{ formatDate(s.last_paid_at) }}</span>
            </span>
          </button>
        </div>
      </AppCard>

      <AppCard v-if="beneficiaries.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Saved payees</h2>
        <p class="text-xs text-text-muted mb-4">Manage your saved beneficiaries — pick one below to autofill the payout form.</p>
        <p v-if="beneficiariesLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="b in beneficiaries" :key="b.id" class="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-2.5">
            <div class="min-w-0">
              <span class="text-sm font-semibold text-text-primary">{{ b.nickname }}</span>
              <span class="text-xs text-text-muted ml-2">
                {{ b.recipient_name }} — {{ b.destination_type === 'BANK_ACCOUNT' ? b.bank_account_number : b.phone_number }}
              </span>
            </div>
            <button
              type="button"
              class="text-text-muted hover:text-error-text shrink-0"
              :disabled="removingBeneficiaryId === b.id"
              @click="removeBeneficiary(b.id)"
            >
              <XIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </AppCard>

      <OtpConfirmCard
        v-if="otpStep"
        v-model="otp"
        subject="payout"
        :fee-cents="pendingFeeCents"
        :confirming="otpConfirming"
        :error="otpError"
        @confirm="submitOtp"
        @cancel="cancelOtp"
      />

      <AppCard v-else>
        <h2 class="text-sm font-bold text-text-primary mb-1">Request a payout</h2>
        <p class="text-xs text-text-muted mb-4">
          Paid out from this branch's own wallet. Requires payment-initiation permission on your account.
        </p>
        <div v-if="requestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ requestError }}</div>
        <div v-if="requestSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ requestSuccess }}</div>

        <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitPayout">
          <AppSelect
            v-if="beneficiaries.length"
            v-model="selectedBeneficiaryId"
            label="Pay a saved payee"
            :options="beneficiaryOptions"
            @update:modelValue="(v: string) => v && applyBeneficiary(v)"
          />

          <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />
          <div v-if="destinationType === 'PHONE_NUMBER'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
            <AppButton type="button" variant="secondary" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
          </div>
          <p v-if="destinationType === 'PHONE_NUMBER'" class="text-[11px] text-text-muted -mt-2">
            M-Pesa numbers can't be pre-verified — the payout itself confirms the recipient. Verification is only available for Airtel/Telkom.
          </p>
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
          <div v-else class="flex flex-col gap-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AppSelect v-model="bankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
              <AppInput v-model="bankAccountNumber" label="Account number" required />
            </div>
            <AppButton type="button" variant="secondary" class="self-start" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
          </div>
          <div v-if="recipientValidation" :class="['text-xs rounded-lg px-3 py-2', recipientValidation.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
            {{ recipientValidation.message }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="recipientName" label="Recipient name" required @blur="screenRecipientName" />
          </div>
          <p v-if="feeEstimateLoading" class="text-xs text-text-muted">Estimating fee…</p>
          <div v-else-if="feeEstimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>Estimated fee: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.fee_cents) }}</span></span>
            <span>Total to be debited: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.total_cents) }}</span></span>
          </div>
          <div v-if="screening?.isMatch" class="text-xs bg-warning-light text-warning-text rounded-lg px-3 py-2.5 flex flex-col gap-2">
            <div class="flex items-center gap-2 font-semibold">
              <AlertTriangleIcon class="w-3.5 h-3.5 shrink-0" />
              Possible sanctions/PEP watchlist match — this payout will be held for compliance review if you continue.
            </div>
            <div class="flex flex-col gap-1.5 pl-5.5">
              <div v-for="(m, idx) in screening.matches" :key="idx" class="border-l-2 border-warning/40 pl-2">
                <p>Match confidence: <span class="font-semibold">{{ Math.round(m.score * 100) }}%</span> on {{ m.matched_field }}</p>
                <p v-if="m.list_names?.length">Watchlist: {{ m.list_names.join(', ') }}</p>
                <p v-if="m.entity_type || m.country">
                  <span v-if="m.entity_type">{{ m.entity_type }}</span><span v-if="m.entity_type && m.country"> · </span><span v-if="m.country">{{ m.country }}</span>
                </p>
              </div>
            </div>
          </div>

          <AppInput v-model="remarks" label="Remarks" placeholder="Reason for this payout" required />

          <div v-if="destinationType !== 'PAYBILL' && destinationType !== 'TILL_NUMBER'" class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer">
              <input v-model="saveAsBeneficiary" type="checkbox" class="rounded border-input-border" />
              Save this recipient as a beneficiary for next time
            </label>
            <AppInput v-if="saveAsBeneficiary" v-model="beneficiaryNickname" label="Beneficiary nickname" placeholder="e.g. Weekly supplier" required />
          </div>

          <ConfirmSecretInput v-model="confirmSecret" :is-pin="isOrgMemberView && isOwner" />

          <AppButton type="submit" :loading="requesting" class="self-start">Request payout</AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
