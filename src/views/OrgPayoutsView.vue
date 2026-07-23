<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  requestOrgPayoutAsMember, fetchPendingPayoutApprovals, approvePayoutRequest, rejectPayoutRequest,
  fetchOrgBranches, validateOrgBankAccount, validateOrgMobileMoney, validateOrgScreenName, fetchOrgBankCodes,
  fetchOrgProfile, fetchOrgBeneficiaries, createOrgBeneficiary, deleteOrgBeneficiary, fetchRecentSettlements,
  type PayoutApproval, type BranchSummary, type ProfileResponse, type Beneficiary, type RecentSettlement,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { CheckIcon, AlertTriangleIcon, XIcon, RepeatIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const isBranchSession = auth.meta?.memberType === 'branch_member'

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
    error.value = extractErrorMessage(err)
  } finally {
    branchesLoading.value = false
  }
}

async function loadProfile() {
  if (isBranchSession) return
  try {
    profile.value = await fetchOrgProfile()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

const requesting = ref(false)
const requestError = ref<string | null>(null)
const requestResult = ref<string | null>(null)
const amountKes = ref('')
const phoneNumber = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const recipientName = ref('')
const remarks = ref('')
const branchId = ref('')
const confirmPassword = ref('')
const confirmPin = ref('')
const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT'>('PHONE_NUMBER')

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
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]


const bankOptions = ref<{ value: string; label: string }[]>([])

async function loadBankCodes() {
  try {
    const codes = await fetchOrgBankCodes(isBranchSession)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    error.value = extractErrorMessage(err)
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
    beneficiaries.value = await fetchOrgBeneficiaries()
  } catch (err) {
    beneficiaryError.value = extractErrorMessage(err)
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
    beneficiaryError.value = extractErrorMessage(err)
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
    recentSettlements.value = await fetchRecentSettlements()
  } catch (err) {
    error.value = extractErrorMessage(err)
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
  branchId.value = s.branch_id ?? 'org'
  validationResult.value = null
  screening.value = null
}

const validating = ref(false)
const validationResult = ref<{ ok: boolean; message: string } | null>(null)
const screening = ref<{ isMatch: boolean; message: string } | null>(null)

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
      screening.value = { isMatch: true, message: `Possible sanctions/PEP match — this will be re-checked and may block the payout on submission.` }
    }
  } catch {
    console.log("Failed to screen")
  }
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
  } else if (!phoneNumber.value.trim()) {
    requestError.value = 'Recipient phone number is required.'
    return
  }
  if (!isOwner && !confirmPassword.value) {
    requestError.value = 'Re-enter your account password to confirm this payout.'
    return
  }
  if (isOwner && !/^\d{4}$/.test(confirmPin.value)) {
    requestError.value = 'Enter your 4-digit transaction PIN to confirm this payout.'
    return
  }
  requesting.value = true
  try {
    const result = await requestOrgPayoutAsMember({
      amount: amountCents,
      recipient_name: recipientName.value.trim(),
      remarks: remarks.value.trim(),
      branch_id: branchId.value,
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      password: isOwner ? undefined : confirmPassword.value,
      pin: isOwner ? confirmPin.value : undefined,
    })
    requestResult.value = result.status === 'approval_required'
      ? `This payout requires the owner's approval before it executes.`
      : 'Payout queued for execution.'

    if (saveAsBeneficiary.value && beneficiaryNickname.value.trim() && !isBranchSession) {
      savingBeneficiary.value = true
      try {
        const b = await createOrgBeneficiary({
          nickname: beneficiaryNickname.value.trim(),
          recipient_name: recipientName.value.trim(),
          destination_type: destinationType.value,
          phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
          bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
          bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
        })
        beneficiaries.value.unshift(b)
      } catch (err) {
        beneficiaryError.value = extractErrorMessage(err)
      } finally {
        savingBeneficiary.value = false
      }
    }

    amountKes.value = ''
    phoneNumber.value = ''
    bankCode.value = ''
    bankAccountNumber.value = ''
    recipientName.value = ''
    remarks.value = ''
    branchId.value = ''
    confirmPassword.value = ''
    confirmPin.value = ''
    validationResult.value = null
    screening.value = null
    selectedBeneficiaryId.value = ''
    saveAsBeneficiary.value = false
    beneficiaryNickname.value = ''
    if (isOwner) await loadApprovals()
    await loadRecentSettlements()
  } catch (err) {
    requestError.value = extractErrorMessage(err)
  } finally {
    requesting.value = false
  }
}

const approvals = ref<PayoutApproval[]>([])
const approvalsLoading = ref(false)
const decisionError = ref<string | null>(null)
const decidingId = ref<string | null>(null)

async function loadApprovals() {
  if (!isOwner) return
  approvalsLoading.value = true
  try {
    approvals.value = await fetchPendingPayoutApprovals()
  } catch (err) {
    error.value = extractErrorMessage(err)
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
    decisionError.value = extractErrorMessage(err)
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
    decisionError.value = extractErrorMessage(err)
  } finally {
    decidingId.value = null
  }
}

onMounted(() => {
  loadBranches()
  loadProfile()
  loadApprovals()
  loadBankCodes()
  loadBeneficiaries()
  loadRecentSettlements()
})
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payouts">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard v-if="!isBranchSession && recentSettlements.length">
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

      <AppCard v-if="!isBranchSession && beneficiaries.length">
        <h2 class="text-sm font-bold text-text-primary mb-1">Saved payees</h2>
        <p class="text-xs text-text-muted mb-4">Manage your saved beneficiaries — pick one below to autofill the payout form.</p>
        <div v-if="beneficiaryError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ beneficiaryError }}</div>
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

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Request a payout</h2>
        <p v-if="isOwner" class="text-xs text-text-muted mb-4">
          As the owner, confirm with your 4-digit transaction PIN — your payouts execute immediately, no second approval needed.
        </p>
        <p v-else class="text-xs text-text-muted mb-4">
          Every payout you initiate requires the owner's approval before it executes, and you'll need to confirm
          with your account password below — you cannot approve your own request.
        </p>
        <div v-if="requestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ requestError }}</div>
        <div v-if="requestResult" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ requestResult }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submitPayout">
          <AppSelect
            v-if="!isBranchSession && beneficiaries.length"
            v-model="selectedBeneficiaryId"
            label="Pay a saved payee"
            :options="beneficiaryOptions"
            @update:modelValue="(v: string) => v && applyBeneficiary(v)"
          />

          <AppSelect v-model="branchId" label="Pay out from" placeholder="— Select wallet —" :options="branchOptions" required />

          <AppSelect v-model="destinationType" label="Pay out via" :options="destinationOptions" />

          <div v-if="destinationType === 'PHONE_NUMBER'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <AppInput v-model="phoneNumber" label="Recipient phone" placeholder="+254712345678" required />
            <AppButton type="button" variant="secondary" :loading="validating" @click="validateRecipient">Verify recipient</AppButton>
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
          <div v-if="validationResult" :class="['text-xs rounded-lg px-3 py-2 flex items-center gap-2', validationResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
            <CheckIcon v-if="validationResult.ok" class="w-3.5 h-3.5 shrink-0" />
            <AlertTriangleIcon v-else class="w-3.5 h-3.5 shrink-0" />
            {{ validationResult.message }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="recipientName" label="Recipient name" required @blur="screenRecipientName" />
          </div>
          <div v-if="screening?.isMatch" class="text-xs bg-warning-light text-warning-text rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangleIcon class="w-3.5 h-3.5 shrink-0" />
            {{ screening.message }}
          </div>

          <AppInput v-model="remarks" label="Remarks" placeholder="Reason for this payout" required />

          <div v-if="!isBranchSession" class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer">
              <input v-model="saveAsBeneficiary" type="checkbox" class="rounded border-input-border" />
              Save this recipient as a beneficiary for next time
            </label>
            <AppInput v-if="saveAsBeneficiary" v-model="beneficiaryNickname" label="Beneficiary nickname" placeholder="e.g. Weekly supplier" required />
          </div>

          <AppInput v-if="!isOwner" v-model="confirmPassword" type="password" label="Confirm your password" required />
          <AppInput v-else v-model="confirmPin" type="password" label="Transaction PIN" placeholder="0000" required />

          <AppButton type="submit" :loading="requesting" class="self-start">Request payout</AppButton>
        </form>
      </AppCard>

      <AppCard v-if="isOwner">
        <h2 class="text-sm font-bold text-text-primary mb-1">Pending approvals</h2>
        <p class="text-xs text-text-muted mb-4">
          Every payout requested by another member. You cannot approve your own requests.
        </p>
        <div v-if="decisionError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ decisionError }}</div>
        <p v-if="approvalsLoading" class="text-sm text-text-muted">Loading approvals…</p>
        <p v-else-if="!approvals.length" class="text-sm text-text-muted">No pending approvals.</p>
        <div v-else class="flex flex-col gap-3">
          <div v-for="a in approvals" :key="a.id" class="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-surface-2 px-4 py-3">
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
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
