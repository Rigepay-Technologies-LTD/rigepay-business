<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchPettyCashFloats, fetchPettyCashHistory,
  requestPettyCashPayout, confirmPettyCashPayout, fetchOrgBankCodes,
  type PettyCashFloat, type PettyCashDraw, type BankCode,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import { WalletIcon, HistoryIcon, PlusIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const floats = ref<PettyCashFloat[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    floats.value = await fetchPettyCashFloats(true)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadBankCodes() {
  try {
    const codes: BankCode[] = await fetchOrgBankCodes(true)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

onMounted(() => {
  load()
  loadBankCodes()
})

const historyFloat = ref<PettyCashFloat | null>(null)
const history = ref<PettyCashDraw[]>([])
const historyLoading = ref(false)

async function openHistory(float: PettyCashFloat) {
  historyFloat.value = float
  showPayoutForm.value = false
  historyLoading.value = true
  try {
    history.value = await fetchPettyCashHistory(float.id, true)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    historyLoading.value = false
  }
}

// --- Electronic payout (real money out via M-Pesa/bank) ---
const showPayoutForm = ref(false)
const paying = ref(false)
const payoutError = ref<string | null>(null)
const payoutSuccess = ref<string | null>(null)
const payoutAmountKes = ref('')
const payoutRecipientName = ref('')
const payoutRemarks = ref('')
const payoutCategory = ref('')
const payoutDestinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT'>('PHONE_NUMBER')
const payoutPhoneNumber = ref('')
const payoutBankCode = ref('')
const payoutBankAccountNumber = ref('')
const payoutConfirmSecret = ref('')

const payoutOtpStep = ref(false)
const payoutOtp = ref('')
const payoutOtpError = ref<string | null>(null)
const payoutOtpConfirming = ref(false)
const pendingPayoutFeeCents = ref<number | undefined>(undefined)

function resetPayoutForm() {
  payoutAmountKes.value = ''
  payoutRecipientName.value = ''
  payoutRemarks.value = ''
  payoutCategory.value = ''
  payoutPhoneNumber.value = ''
  payoutBankAccountNumber.value = ''
  payoutConfirmSecret.value = ''
}

async function submitPayout() {
  payoutError.value = null
  payoutSuccess.value = null
  if (!historyFloat.value) return
  const amountCents = Math.round(Number(payoutAmountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !payoutRecipientName.value.trim() || !payoutRemarks.value.trim()) {
    payoutError.value = 'Amount (min KES 1), recipient name, and remarks are required.'
    return
  }
  if (payoutDestinationType.value === 'BANK_ACCOUNT') {
    if (!payoutBankCode.value || !payoutBankAccountNumber.value.trim()) {
      payoutError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (!payoutPhoneNumber.value.trim()) {
    payoutError.value = 'Recipient phone number is required.'
    return
  }
  if (!payoutConfirmSecret.value) {
    payoutError.value = 'Re-enter your account password to confirm this payout.'
    return
  }

  paying.value = true
  try {
    const result = await requestPettyCashPayout(historyFloat.value.id, {
      amount: amountCents,
      recipient_name: payoutRecipientName.value.trim(),
      remarks: payoutRemarks.value.trim(),
      category: payoutCategory.value.trim() || undefined,
      destination_type: payoutDestinationType.value,
      phone_number: payoutDestinationType.value === 'PHONE_NUMBER' ? payoutPhoneNumber.value.trim() : undefined,
      bank_code: payoutDestinationType.value === 'BANK_ACCOUNT' ? payoutBankCode.value : undefined,
      bank_account_number: payoutDestinationType.value === 'BANK_ACCOUNT' ? payoutBankAccountNumber.value.trim() : undefined,
      password: payoutConfirmSecret.value,
    }, true)
    if (result.status === 'otp_required') {
      pendingPayoutFeeCents.value = result.fee_cents
      payoutOtp.value = ''
      payoutOtpError.value = null
      payoutOtpStep.value = true
    } else {
      payoutSuccess.value = result.message || 'Payout queued for execution.'
      resetPayoutForm()
      showPayoutForm.value = false
      history.value = await fetchPettyCashHistory(historyFloat.value.id, true)
      await load()
    }
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
  } finally {
    paying.value = false
  }
}

async function submitPayoutOtp() {
  payoutOtpError.value = null
  if (!historyFloat.value) return
  if (!/^\d{6}$/.test(payoutOtp.value)) {
    payoutOtpError.value = 'Enter the 6-digit code sent to your phone.'
    return
  }
  payoutOtpConfirming.value = true
  try {
    const result = await confirmPettyCashPayout(historyFloat.value.id, payoutOtp.value, true)
    payoutSuccess.value = result.message || 'Payout queued for execution.'
    payoutOtpStep.value = false
    resetPayoutForm()
    showPayoutForm.value = false
    history.value = await fetchPettyCashHistory(historyFloat.value.id, true)
    await load()
  } catch (err) {
    payoutOtpError.value = extractErrorMessage(err)
  } finally {
    payoutOtpConfirming.value = false
  }
}

function cancelPayoutOtp() {
  payoutOtpStep.value = false
  payoutOtp.value = ''
  payoutOtpError.value = null
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Petty cash">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div>
        <h2 class="text-sm font-bold text-text-primary">Petty cash</h2>
        <p class="text-xs text-text-muted mt-0.5">
          This branch's tracked cash float. Funding is done from the organization dashboard — ask an owner or
          authorized member to top up — but you can log a draw or send a real payout here.
        </p>
      </div>

      <p v-if="loading" class="text-sm text-text-muted">Loading floats…</p>
      <AppCard v-else-if="!floats.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <WalletIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No petty cash float for this branch yet</p>
          <p class="text-xs text-text-muted">Ask an org owner to create one from the organization dashboard.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="f in floats" :key="f.id" padding="none">
          <div class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text-primary truncate">{{ f.name }} — KES {{ formatMoney(f.balance_cents) }}</p>
              <p class="text-xs text-text-muted mt-0.5">created {{ formatDate(f.created_at) }}</p>
            </div>
            <AppButton size="sm" variant="ghost" @click="openHistory(f)">
              <template #icon><HistoryIcon class="w-3.5 h-3.5" /></template>
              History
            </AppButton>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!historyFloat" :title="historyFloat ? `${historyFloat.name} — history` : 'History'" size="md" @update:model-value="historyFloat = null">
      <div v-if="historyFloat" class="flex flex-col gap-4 p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text-primary">Balance: KES {{ formatMoney(historyFloat.balance_cents) }}</p>
          <div class="flex gap-2">
            <AppButton size="sm" @click="showPayoutForm = !showPayoutForm">
              <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>
              Send payout
            </AppButton>
          </div>
        </div>

        <OtpConfirmCard
          v-if="showPayoutForm && payoutOtpStep"
          v-model="payoutOtp"
          subject="payout"
          :fee-cents="pendingPayoutFeeCents"
          :confirming="payoutOtpConfirming"
          :error="payoutOtpError"
          @confirm="submitPayoutOtp"
          @cancel="cancelPayoutOtp"
        />

        <AppCard v-else-if="showPayoutForm">
          <p class="text-xs text-text-muted mb-3">Sends real money out of this float via M-Pesa or bank transfer.</p>
          <div v-if="payoutError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ payoutError }}</div>
          <form class="flex flex-col gap-3" @submit.prevent="submitPayout">
            <AppSelect v-model="payoutDestinationType" label="Pay out via" :options="[{ value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' }, { value: 'BANK_ACCOUNT', label: 'Bank account' }]" />
            <AppInput v-if="payoutDestinationType === 'PHONE_NUMBER'" v-model="payoutPhoneNumber" label="Recipient phone" placeholder="+254712345678" required />
            <div v-else class="grid grid-cols-2 gap-3">
              <AppSelect v-model="payoutBankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
              <AppInput v-model="payoutBankAccountNumber" label="Account number" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <AppInput v-model="payoutAmountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
              <AppInput v-model="payoutRecipientName" label="Recipient name" required />
            </div>
            <AppInput v-model="payoutRemarks" label="Remarks" placeholder="Reason for this payout" required />
            <AppInput v-model="payoutCategory" label="Category (optional)" placeholder="e.g. Supplies, Transport, Fuel" />
            <ConfirmSecretInput v-model="payoutConfirmSecret" :is-pin="false" />
            <AppButton type="submit" size="sm" :loading="paying" class="self-start">Send payout</AppButton>
          </form>
        </AppCard>

        <p v-if="payoutSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2">{{ payoutSuccess }}</p>

        <p v-if="historyLoading" class="text-sm text-text-muted">Loading…</p>
        <p v-else-if="!history.length" class="text-sm text-text-muted">No draws recorded yet.</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="d in history" :key="d.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-text-primary truncate">{{ d.payee }} — KES {{ formatMoney(d.amount_cents) }}</p>
              <p class="text-xs text-text-muted">{{ d.category || 'Uncategorized' }} · {{ formatDate(d.drawn_at) }}</p>
              <p v-if="d.notes" class="text-xs text-text-muted mt-0.5 truncate" :title="d.notes">{{ d.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
