<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  requestOrgPayoutAsMember, confirmOrgPayoutAsMember, fetchPendingPayoutApprovals, approvePayoutRequest, rejectPayoutRequest,
  fetchOrgBranches, validateOrgBankAccount, validateOrgMobileMoney, validateOrgShortcode, validateOrgScreenName, fetchOrgBankCodes,
  fetchOrgProfile, fetchOrgBeneficiaries, createOrgBeneficiary, deleteOrgBeneficiary, fetchRecentSettlements,
  fetchApprovalThreshold, setApprovalThreshold, fetchPayoutFeeEstimate,
  fetchRoleApprovalThresholds, setRoleApprovalThreshold, fetchOrgSettlementPreferences,
  type PayoutApproval, type BranchSummary, type ProfileResponse, type Beneficiary, type RecentSettlement,
  type ApprovalThreshold, type PayoutFeeEstimate, type RoleApprovalThreshold, type ScreenNameMatch,
  type SettlementPreferences,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PayoutsHistoryTable from '@/components/PayoutsHistoryTable.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import { CheckIcon, AlertTriangleIcon, XIcon, RepeatIcon, SendIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const route = useRoute()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const isBranchSession = auth.meta?.memberType === 'branch_member'
const { showError, showSuccess } = useResponseModal()

const error = ref<string | null>(null)
const branches = ref<BranchSummary[]>([])
const branchesLoading = ref(true)
const profile = ref<ProfileResponse | null>(null)

async function loadBranches() {
  branchesLoading.value = true
  try {
    const overview = await fetchOrgBranches()
    branches.value = overview.branches
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    branchesLoading.value = false
  }
}

async function loadProfile() {
  if (isBranchSession) return
  try {
    profile.value = await fetchOrgProfile()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const showRequestModal = ref(false)
const payoutsReloadKey = ref(0)
const settlementPrefs = ref<SettlementPreferences | null>(null)

async function loadSettlementPrefs() {
  if (isBranchSession) return
  try {
    settlementPrefs.value = await fetchOrgSettlementPreferences()
  } catch {
    settlementPrefs.value = null
  }
}

const settlementPrefLabel = computed(() => {
  const p = settlementPrefs.value
  if (!p || !p.destination_type) return ''
  const detail = p.destination_type === 'BANK_ACCOUNT'
    ? `${p.bank_code || ''} ${p.bank_account_number || ''}`.trim()
    : (p.phone_number || '')
  const kind = {
    BANK_ACCOUNT: 'Bank account', PAYBILL: 'Paybill', TILL_NUMBER: 'Till number', PHONE_NUMBER: 'M-Pesa',
  }[p.destination_type] || p.destination_type
  return `${kind} · ${detail}`
})

function applySettlementPref() {
  const p = settlementPrefs.value
  if (!p || !p.destination_type) return
  destinationType.value = p.destination_type as typeof destinationType.value
  if (p.destination_type === 'BANK_ACCOUNT') {
    bankCode.value = p.bank_code || ''
    bankAccountNumber.value = p.bank_account_number || ''
    phoneNumber.value = ''
    shortcode.value = ''
  } else if (p.destination_type === 'PAYBILL' || p.destination_type === 'TILL_NUMBER') {
    shortcode.value = p.phone_number || ''
    phoneNumber.value = ''
    bankCode.value = ''
    bankAccountNumber.value = ''
  } else {
    phoneNumber.value = p.phone_number || ''
    shortcode.value = ''
    bankCode.value = ''
    bankAccountNumber.value = ''
  }
}

watch(showRequestModal, (open) => {
  if (!open) return
  const untouched = !phoneNumber.value && !bankAccountNumber.value && !shortcode.value && !recipientName.value
  if (untouched) applySettlementPref()
})

const historyBranchOptions = computed(() => [
  { value: '', label: 'Organization (this business)' },
  ...branches.value.map((b) => ({ value: b.id, label: b.name })),
])

const requesting = ref(false)
const requestError = ref<string | null>(null)
const requestResult = ref<string | null>(null)
const amountKes = ref('')
const feeEstimate = ref<PayoutFeeEstimate | null>(null)
const feeEstimateLoading = ref(false)
let feeEstimateTimer: ReturnType<typeof setTimeout> | null = null
const phoneNumber = ref('')
const shortcode = ref('')
const accountReference = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const recipientName = ref('')
const remarks = ref('')
const branchId = ref('')
const confirmSecret = ref('')
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'>('PHONE_NUMBER')

const branchOptions = computed(() => {
  const options = branches.value.map((b) => ({ value: b.id, label: `${b.name} (KES ${formatMoney(b.main_cents)} available)` }))
  if (!isBranchSession && profile.value) {
    options.unshift({
      value: 'org',
      label: `Organization wallet (KES ${formatMoney(profile.value.organization.wallet.main_cents)} available)`,
    })
  }
  return options
})

const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL_NUMBER', label: 'Till number' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]


const bankOptions = ref<{ value: string; label: string }[]>([])

async function loadBankCodes() {
  try {
    const codes = await fetchOrgBankCodes(isBranchSession)
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
const savingBeneficiary = ref(false)
const removingBeneficiaryId = ref<string | null>(null)

const beneficiaryOptions = computed(() => [
  { value: '', label: '— Pick a saved payee (optional) —' },
  ...beneficiaries.value.map((b) => ({
    value: b.id,
    label: `${b.nickname} — ${b.recipient_name} (${b.destination_type === 'BANK_ACCOUNT' ? b.bank_account_number : b.phone_number})`,
  })),
])

async function loadBeneficiaries() {
  if (isBranchSession) return
  beneficiariesLoading.value = true
  try {
    beneficiaries.value = (await fetchOrgBeneficiaries()) ?? []
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
  validationResult.value = null
  screening.value = null
}

async function removeBeneficiary(id: string) {
  removingBeneficiaryId.value = id
  try {
    await deleteOrgBeneficiary(id)
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
  if (isBranchSession) return
  recentSettlementsLoading.value = true
  try {
    recentSettlements.value = (await fetchRecentSettlements()) ?? []
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
  branchId.value = s.branch_id ?? 'org'
  validationResult.value = null
  screening.value = null
}

const validating = ref(false)
const validationResult = ref<{ ok: boolean; message: string } | null>(null)
const screening = ref<{ isMatch: boolean; matches: ScreenNameMatch[] } | null>(null)

async function validateRecipient() {
  validationResult.value = null
  validating.value = true
  try {
    if (destinationType.value === 'BANK_ACCOUNT') {
      if (!bankAccountNumber.value.trim() || !bankCode.value) {
        validationResult.value = { ok: false, message: 'Enter a bank and account number first.' }
        return
      }
      const result = await validateOrgBankAccount(bankAccountNumber.value.trim(), bankCode.value)
      validationResult.value = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!recipientName.value.trim()) recipientName.value = result.account_name
    } else if (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') {
      if (!shortcode.value.trim()) {
        validationResult.value = { ok: false, message: `Enter a ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number first.` }
        return
      }
      const result = await validateOrgShortcode(isBranchSession, shortcode.value.trim(), destinationType.value === 'PAYBILL' ? 'paybill' : 'till')
      validationResult.value = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!recipientName.value.trim()) recipientName.value = result.account_name
    } else {
      if (!phoneNumber.value.trim()) {
        validationResult.value = { ok: false, message: 'Enter a phone number first.' }
        return
      }
      const result = await validateOrgMobileMoney(phoneNumber.value.trim())
      validationResult.value = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!recipientName.value.trim()) recipientName.value = result.account_name
    }
  } catch (err) {
    validationResult.value = { ok: false, message: extractErrorMessage(err) }
  } finally {
    validating.value = false
  }
}

async function screenRecipientName() {
  screening.value = null
  if (!recipientName.value.trim()) return
  try {
    const result = await validateOrgScreenName(recipientName.value.trim())
    if (result.is_match) {
      screening.value = { isMatch: true, matches: result.matches }
    }
  } catch {
    console.log("Failed to screen")
  }
}

const otpStep = ref(false)
const otp = ref('')
const otpError = ref<string | null>(null)
const otpConfirming = ref(false)
const pendingFeeCents = ref<number | undefined>(undefined)

function resetPayoutForm() {
  amountKes.value = ''
  feeEstimate.value = null
  phoneNumber.value = ''
  shortcode.value = ''
  accountReference.value = ''
  bankCode.value = ''
  bankAccountNumber.value = ''
  recipientName.value = ''
  remarks.value = ''
  branchId.value = ''
  confirmSecret.value = ''
  validationResult.value = null
  screening.value = null
  selectedBeneficiaryId.value = ''
  saveAsBeneficiary.value = false
  beneficiaryNickname.value = ''
}

async function submitPayout() {
  requestError.value = null
  requestResult.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !recipientName.value.trim() || !remarks.value.trim() || !branchId.value) {
    requestError.value = 'Amount (min KES 1), recipient name, remarks, and branch are all required.'
    return
  }
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      requestError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') {
    if (!shortcode.value.trim()) {
      requestError.value = `Enter the ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number.`
      return
    }
  } else if (!phoneNumber.value.trim()) {
    requestError.value = 'Recipient phone number is required.'
    return
  }
  if (isOwner ? !/^\d{4}$/.test(confirmSecret.value) : !confirmSecret.value) {
    requestError.value = isOwner ? 'Enter your 4-digit transaction PIN to confirm this payout.' : 'Re-enter your account password to confirm this payout.'
    return
  }
  requesting.value = true
  try {
    const isShortcode = destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER'
    const result = await requestOrgPayoutAsMember({
      amount: amountCents,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      branch_id: branchId.value,
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      shortcode: isShortcode ? shortcode.value.trim() : undefined,
      account_reference: isShortcode ? accountReference.value.trim() || undefined : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      password: isOwner ? undefined : confirmSecret.value,
      pin: isOwner ? confirmSecret.value : undefined,
    })

    if (saveAsBeneficiary.value && beneficiaryNickname.value.trim() && !isBranchSession && !isShortcode) {
      savingBeneficiary.value = true
      try {
        const b = await createOrgBeneficiary({
          nickname: beneficiaryNickname.value.trim(),
          recipient_name: recipientName.value.trim(),
          destination_type: destinationType.value as 'PHONE_NUMBER' | 'BANK_ACCOUNT',
          phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
          bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
          bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
        })
        beneficiaries.value.unshift(b)
      } catch (err) {
        const msg = extractErrorMessage(err)
        beneficiaryError.value = msg
        showError(msg)
      } finally {
        savingBeneficiary.value = false
      }
    }

    if (result.status === 'otp_required') {
      pendingFeeCents.value = result.fee_cents
      otp.value = ''
      otpError.value = null
      otpStep.value = true
      return
    }

    requestResult.value = result.status === 'approval_required'
      ? `This payout requires the owner's approval before it executes.`
      : 'Payout queued for execution.'
    showSuccess(requestResult.value)

    resetPayoutForm()
    showRequestModal.value = false
    payoutsReloadKey.value++
    if (isOwner) await loadApprovals()
    await loadRecentSettlements()
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
    const result = await confirmOrgPayoutAsMember(otp.value)
    requestResult.value = result.message || 'Payout queued for execution.'
    showSuccess(requestResult.value)
    otpStep.value = false
    resetPayoutForm()
    showRequestModal.value = false
    payoutsReloadKey.value++
    if (isOwner) await loadApprovals()
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

const approvals = ref<PayoutApproval[]>([])
const approvalsLoading = ref(false)
const decisionError = ref<string | null>(null)
const decidingId = ref<string | null>(null)

async function loadApprovals() {
  if (!isOwner) return
  approvalsLoading.value = true
  try {
    approvals.value = (await fetchPendingPayoutApprovals()) ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    approvalsLoading.value = false
  }
}

async function approve(id: string) {
  decisionError.value = null
  decidingId.value = id
  try {
    await approvePayoutRequest(id)
    await loadApprovals()
  } catch (err) {
    const msg = extractErrorMessage(err)
    decisionError.value = msg
    showError(msg)
  } finally {
    decidingId.value = null
  }
}

async function reject(id: string) {
  decisionError.value = null
  decidingId.value = id
  try {
    await rejectPayoutRequest(id)
    await loadApprovals()
  } catch (err) {
    const msg = extractErrorMessage(err)
    decisionError.value = msg
    showError(msg)
  } finally {
    decidingId.value = null
  }
}

const threshold = ref<ApprovalThreshold | null>(null)
const thresholdLoading = ref(false)
const thresholdSaving = ref(false)
const thresholdError = ref<string | null>(null)
const thresholdSuccess = ref<string | null>(null)
const thresholdAmountKes = ref('')
const thresholdActive = ref(false)

async function loadThreshold() {
  if (!isOwner || isBranchSession) return
  thresholdLoading.value = true
  try {
    threshold.value = await fetchApprovalThreshold()
    thresholdAmountKes.value = threshold.value.amount_cents ? String(threshold.value.amount_cents / 100) : ''
    thresholdActive.value = threshold.value.active
  } catch (err) {
    const msg = extractErrorMessage(err)
    thresholdError.value = msg
    showError(msg)
  } finally {
    thresholdLoading.value = false
  }
}

async function saveThreshold() {
  thresholdError.value = null
  thresholdSuccess.value = null
  const amountCents = Math.round(Number(thresholdAmountKes.value) * 100)
  if (thresholdActive.value && (!amountCents || amountCents < 100)) {
    thresholdError.value = 'Enter a valid ceiling amount (min KES 1) to activate dual control.'
    return
  }
  thresholdSaving.value = true
  try {
    const result = await setApprovalThreshold({ amount_cents: amountCents, active: thresholdActive.value })
    thresholdSuccess.value = result.warning || 'Approval ceiling updated.'
    showSuccess(thresholdSuccess.value)
    await loadThreshold()
  } catch (err) {
    const msg = extractErrorMessage(err)
    thresholdError.value = msg
    showError(msg)
  } finally {
    thresholdSaving.value = false
  }
}

const roleCeilingRoles = ['manager', 'member'] as const
const roleCeilings = ref<Record<string, RoleApprovalThreshold | null>>({ manager: null, member: null })
const roleCeilingAmountKes = ref<Record<string, string>>({ manager: '', member: '' })
const roleCeilingActive = ref<Record<string, boolean>>({ manager: false, member: false })
const roleCeilingLoading = ref(false)
const roleCeilingSaving = ref<string | null>(null)
const roleCeilingError = ref<string | null>(null)
const roleCeilingSuccess = ref<string | null>(null)

async function loadRoleCeilings() {
  if (!isOwner || isBranchSession) return
  roleCeilingLoading.value = true
  try {
    const rows = await fetchRoleApprovalThresholds()
    for (const role of roleCeilingRoles) {
      const row = rows.find((r) => r.role === role) ?? null
      roleCeilings.value[role] = row
      roleCeilingAmountKes.value[role] = row ? String(row.amount_cents / 100) : ''
      roleCeilingActive.value[role] = row?.active ?? false
    }
  } catch (err) {
    const msg = extractErrorMessage(err)
    roleCeilingError.value = msg
    showError(msg)
  } finally {
    roleCeilingLoading.value = false
  }
}

async function saveRoleCeiling(role: string) {
  roleCeilingError.value = null
  roleCeilingSuccess.value = null
  const amountCents = Math.round(Number(roleCeilingAmountKes.value[role]) * 100)
  if (roleCeilingActive.value[role] && (!amountCents || amountCents < 100)) {
    roleCeilingError.value = 'Enter a valid ceiling amount (min KES 1) to activate self-execution for this role.'
    return
  }
  roleCeilingSaving.value = role
  try {
    await setRoleApprovalThreshold(role, { amount_cents: amountCents, active: roleCeilingActive.value[role] })
    roleCeilingSuccess.value = `${role[0].toUpperCase()}${role.slice(1)} ceiling updated.`
    showSuccess(roleCeilingSuccess.value)
    await loadRoleCeilings()
  } catch (err) {
    const msg = extractErrorMessage(err)
    roleCeilingError.value = msg
    showError(msg)
  } finally {
    roleCeilingSaving.value = null
  }
}

onMounted(() => {
  loadBranches()
  loadProfile()
  loadApprovals()
  loadBankCodes()
  loadBeneficiaries()
  loadRecentSettlements()
  loadThreshold()
  loadRoleCeilings()
  loadSettlementPrefs()
  const branchQuery = route.query.branch
  if (typeof branchQuery === 'string' && branchQuery) {
    branchId.value = branchQuery
  }
})

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
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payouts">
    <div class="flex flex-col gap-6 page-in">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-bold text-text-primary">Payouts</h1>
          <p class="text-sm text-text-muted mt-0.5">Review beneficiary payouts, destination details, fees, and processing status.</p>
        </div>
        <AppButton @click="showRequestModal = true">
          <template #icon><SendIcon class="w-4 h-4" /></template>
          Send money
        </AppButton>
      </div>

      <PayoutsHistoryTable :is-branch="false" :branch-options="historyBranchOptions" :reload-key="payoutsReloadKey" />

      <AppModal v-model="showRequestModal" title="Send money" size="lg">
        <div class="flex flex-col gap-4">
        <!-- Recent settlements + saved payees quick-pick -->
        <div class="flex flex-col gap-4">
          <AppCard v-if="!isBranchSession && recentSettlements.length">
            <h2 class="text-sm font-bold text-text-primary mb-1">Recent settlements</h2>
            <p class="text-xs text-text-muted mb-4">Click one to repeat it — prefills the form.</p>
            <p v-if="recentSettlementsLoading" class="text-sm text-text-muted">Loading…</p>
            <TransitionGroup v-else tag="div" name="list" class="flex flex-col gap-2">
              <button
                v-for="(s, i) in recentSettlements"
                :key="i"
                type="button"
                class="row-hover flex items-center gap-2 rounded-xl bg-surface-2 hover:bg-surface-3 px-3 py-2 text-left"
                @click="repeatSettlement(s)"
              >
                <RepeatIcon class="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span class="min-w-0">
                  <span class="text-sm font-semibold text-text-primary block truncate">{{ s.recipient_name || s.recipient_info }}</span>
                  <span class="text-xs text-text-muted">KES {{ formatMoney(s.amount_cents) }} · {{ formatDate(s.last_paid_at) }}</span>
                </span>
              </button>
            </TransitionGroup>
          </AppCard>

          <AppCard v-if="!isBranchSession && beneficiaries.length">
            <h2 class="text-sm font-bold text-text-primary mb-1">Saved payees</h2>
            <p class="text-xs text-text-muted mb-4">Pick one below to autofill the payout form.</p>
            <p v-if="beneficiariesLoading" class="text-sm text-text-muted">Loading…</p>
            <TransitionGroup v-else tag="div" name="list" class="flex flex-col gap-2">
              <div v-for="b in beneficiaries" :key="b.id" class="row-hover flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-2.5">
                <div class="min-w-0">
                  <span class="text-sm font-semibold text-text-primary">{{ b.nickname }}</span>
                  <span class="text-xs text-text-muted ml-2">
                    {{ b.recipient_name }} — {{ b.destination_type === 'BANK_ACCOUNT' ? b.bank_account_number : b.phone_number }}
                  </span>
                </div>
                <button
                  type="button"
                  class="text-text-muted hover:text-error-text shrink-0 transition-colors"
                  :disabled="removingBeneficiaryId === b.id"
                  @click="removeBeneficiary(b.id)"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </TransitionGroup>
          </AppCard>
        </div>

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
            <p v-if="isOwner" class="text-xs text-text-muted mb-4">
              As the owner, confirm with your 4-digit transaction PIN — your payouts execute immediately, no second approval needed.
            </p>
            <p v-else class="text-xs text-text-muted mb-4">
              Every payout you initiate requires the owner's approval before it executes, and you'll need to confirm
              with your account password below — you cannot approve your own request.
            </p>
            <div v-if="requestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ requestError }}</div>

            <div v-if="settlementPrefLabel" class="flex flex-wrap items-center justify-between gap-2 text-xs bg-surface-2 rounded-lg px-3 py-2 mb-3">
              <span class="text-text-secondary">Settlement preference: <span class="font-semibold text-text-primary">{{ settlementPrefLabel }}</span></span>
              <button type="button" class="font-semibold text-primary hover:underline" @click="applySettlementPref">Use this destination</button>
            </div>

            <form class="flex flex-col gap-4" @submit.prevent="submitPayout">
              <!-- Group 1: who / where -->
              <div class="flex flex-col gap-4">
                <AppSelect
                  v-if="!isBranchSession && beneficiaries.length"
                  v-model="selectedBeneficiaryId"
                  label="Pay a saved payee"
                  :options="beneficiaryOptions"
                  @update:modelValue="(v: string) => v && applyBeneficiary(v)"
                />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AppSelect v-model="branchId" label="Pay out from" placeholder="— Select wallet —" :options="branchOptions" required />
                  <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />
                </div>

                <div v-if="destinationType === 'PHONE_NUMBER'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
                  <AppButton type="button" variant="secondary" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
                </div>
                <div v-else-if="destinationType === 'PAYBILL' || destinationType === 'TILL_NUMBER'" class="flex flex-col gap-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <AppInput
                      v-model="shortcode"
                      :label="destinationType === 'PAYBILL' ? 'Paybill number' : 'Till number'"
                      :placeholder="destinationType === 'PAYBILL' ? 'e.g. 522522' : 'e.g. 123456'"
                      required
                    />
                    <AppButton type="button" variant="secondary" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
                  </div>
                  <AppInput v-if="destinationType === 'PAYBILL'" v-model="accountReference" label="Account number / reference (optional)" placeholder="e.g. invoice or account number" />
                </div>
                <div v-else class="flex flex-col gap-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AppSelect v-model="bankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
                    <AppInput v-model="bankAccountNumber" label="Account number" required />
                  </div>
                  <AppButton type="button" variant="secondary" class="self-start" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
                </div>

                <p v-if="destinationType === 'PHONE_NUMBER'" class="text-[11px] text-text-muted -mt-2">
                  M-Pesa numbers can't be pre-verified — the payout itself confirms the recipient. Verification is only available for Airtel/Telkom.
                </p>

                <Transition name="fade">
                  <div v-if="validationResult" :class="['text-xs rounded-lg px-3 py-2 flex items-center gap-2', validationResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
                    <CheckIcon v-if="validationResult.ok" class="w-3.5 h-3.5 shrink-0" />
                    <AlertTriangleIcon v-else class="w-3.5 h-3.5 shrink-0" />
                    {{ validationResult.message }}
                  </div>
                </Transition>
              </div>

              <!-- Group 2: amount / recipient -->
              <div class="flex flex-col gap-4 border-t border-input-border pt-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
                  <AppInput v-model="recipientName" label="Recipient name" required @blur="screenRecipientName" />
                </div>

                <Transition name="fade" mode="out-in">
                  <p v-if="feeEstimateLoading" key="loading" class="text-xs text-text-muted">Estimating fee…</p>
                  <div v-else-if="feeEstimate" key="estimate" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span>Estimated fee: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.fee_cents) }}</span></span>
                    <span>Total to be debited: <span class="font-semibold text-text-primary">KES {{ formatMoney(feeEstimate.total_cents) }}</span></span>
                  </div>
                </Transition>

                <Transition name="fade">
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
                </Transition>
              </div>

              <!-- Group 3: remarks / confirm / submit -->
              <div class="flex flex-col gap-4 border-t border-input-border pt-4">
                <AppInput v-model="remarks" label="Remarks" placeholder="Reason for this payout" required />

                <div v-if="!isBranchSession && destinationType !== 'PAYBILL' && destinationType !== 'TILL_NUMBER'" class="flex flex-col gap-2">
                  <label class="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer">
                    <input v-model="saveAsBeneficiary" type="checkbox" class="rounded border-input-border" />
                    Save this recipient as a beneficiary for next time
                  </label>
                  <AppInput v-if="saveAsBeneficiary" v-model="beneficiaryNickname" label="Beneficiary nickname" placeholder="e.g. Weekly supplier" required />
                </div>

                <ConfirmSecretInput v-model="confirmSecret" :is-pin="isOwner" />

                <AppButton type="submit" :loading="requesting" class="self-start">Request payout</AppButton>
              </div>
            </form>
          </AppCard>
        </div>
      </AppModal>

      <!-- Pending approvals: full width -->
      <AppCard v-if="isOwner">
        <h2 class="text-sm font-bold text-text-primary mb-1">Pending approvals</h2>
        <p class="text-xs text-text-muted mb-4">
          Every payout requested by another member. You cannot approve your own requests.
        </p>
        <p v-if="approvalsLoading" class="text-sm text-text-muted">Loading approvals…</p>
        <p v-else-if="!approvals.length" class="text-sm text-text-muted">No pending approvals.</p>
        <TransitionGroup v-else tag="div" name="list" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="a in approvals" :key="a.id" class="row-hover flex flex-col gap-2 rounded-xl bg-surface-2 px-4 py-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <AppBadge variant="warning" size="sm">Pending</AppBadge>
                <span class="text-sm font-semibold text-text-primary">{{ a.recipient_name }}</span>
              </div>
              <p class="text-xs text-text-muted mt-1">
                KES {{ formatMoney(a.amount_cents) }} to {{ a.phone_number }} — {{ a.remarks }} · requested {{ formatDate(a.created_at) }}
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <AppButton size="sm" :loading="decidingId === a.id" @click="approve(a.id)">Approve</AppButton>
              <AppButton size="sm" variant="secondary" :loading="decidingId === a.id" @click="reject(a.id)">Reject</AppButton>
            </div>
          </div>
        </TransitionGroup>
      </AppCard>

      <!-- Payout controls: demoted admin settings, side by side -->
      <div v-if="isOwner && !isBranchSession" class="flex flex-col gap-3">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Payout controls</p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AppCard>
            <h2 class="text-sm font-bold text-text-primary mb-1">High-value approval ceiling (dual control)</h2>
            <p class="text-xs text-text-muted mb-4">
              When active, any payout at or above this amount — dashboard or API — needs a second owner's approval
              before it executes, even if the initiating owner could otherwise self-approve.
            </p>
            <div v-if="thresholdError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ thresholdError }}</div>
            <p v-if="thresholdLoading" class="text-sm text-text-muted">Loading…</p>
            <template v-else>
              <p v-if="threshold" class="text-xs text-text-muted mb-3">
                Active owners: {{ threshold.active_owner_count }} —
                <span v-if="threshold.active_owner_count < 2" class="text-warning">
                  enforcement needs a second owner to approve owner-initiated payouts; machine/API payouts are still gated.
                </span>
                <span v-else class="text-success">ceiling is enforceable.</span>
              </p>
              <form class="flex flex-col gap-4" @submit.prevent="saveThreshold">
                <label class="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <input type="checkbox" v-model="thresholdActive" class="w-4 h-4 rounded" />
                  Require a second owner's approval above a threshold
                </label>
                <AppInput
                  v-model="thresholdAmountKes" type="number" label="Ceiling amount (KES)"
                  placeholder="e.g. 250000" :disabled="!thresholdActive" required
                />
                <AppButton type="submit" size="sm" :loading="thresholdSaving" class="self-start">Save</AppButton>
              </form>
            </template>
          </AppCard>

          <AppCard>
            <h2 class="text-sm font-bold text-text-primary mb-1">Per-role self-execution ceilings</h2>
            <p class="text-xs text-text-muted mb-4">
              By default, every non-owner payout requires your approval, regardless of amount. Setting an active
              ceiling here lets that role's payouts execute immediately — still confirmed by password and a
              one-time code — as long as they stay below the amount. Anything at or above it still comes to
              you for approval.
            </p>
            <div v-if="roleCeilingError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ roleCeilingError }}</div>
            <p v-if="roleCeilingLoading" class="text-sm text-text-muted">Loading…</p>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form
                v-for="role in roleCeilingRoles" :key="role"
                class="flex flex-col gap-3 rounded-xl bg-surface-2 px-4 py-3"
                @submit.prevent="saveRoleCeiling(role)"
              >
                <label class="flex items-center gap-2 text-sm font-medium text-text-primary capitalize">
                  <input type="checkbox" v-model="roleCeilingActive[role]" class="w-4 h-4 rounded" />
                  Allow {{ role }}s to self-execute below a ceiling
                </label>
                <AppInput
                  v-model="roleCeilingAmountKes[role]" type="number" label="Ceiling amount (KES)"
                  placeholder="e.g. 50000" :disabled="!roleCeilingActive[role]" required
                />
                <AppButton type="submit" size="sm" :loading="roleCeilingSaving === role" class="self-start">Save</AppButton>
              </form>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<style scoped>
.page-in {
  animation: page-in 0.35s ease-out;
}
@keyframes page-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.row-hover {
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.row-hover:hover {
  transform: translateY(-1px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.list-enter-active,
.list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.list-leave-to {
  opacity: 0;
}
.list-leave-active {
  position: absolute;
}
</style>