<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchPettyCashFloats, fetchPettyCashHistory,
  requestPettyCashPayout, confirmPettyCashPayout, fetchOrgBankCodes,
  type PettyCashFloat, type PettyCashDraw, type BankCode,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import { WalletIcon, HistoryIcon, ArrowUpRightIcon, InfoIcon, LandmarkIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError, showSuccess } = useResponseModal()

const loading = ref(true)
const error = ref<string | null>(null)
const floats = ref<PettyCashFloat[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

const totalBalanceCents = computed(() => floats.value.reduce((sum, f) => sum + f.balance_cents, 0))

async function load() {
  loading.value = true
  error.value = null
  try {
    floats.value = await fetchPettyCashFloats(true)
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

// --- History ---
const historyFloat = ref<PettyCashFloat | null>(null)
const history = ref<PettyCashDraw[]>([])
const historyLoading = ref(false)

async function openHistory(float: PettyCashFloat) {
  historyFloat.value = float
  historyLoading.value = true
  try {
    history.value = await fetchPettyCashHistory(float.id, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    historyLoading.value = false
  }
}

// --- Electronic payout (real money out via M-Pesa/bank), its own modal ---
const payoutFloat = ref<PettyCashFloat | null>(null)
const paying = ref(false)
const payoutError = ref<string | null>(null)
const payoutAmountKes = ref('')
const payoutRecipientName = ref('')
const payoutRemarks = ref('')
const payoutCategory = ref('')
const payoutCategoryOther = ref('')
const pettyCashCategoryOptions = [
  'Supplies', 'Transport', 'Fuel', 'Meals & Entertainment', 'Utilities',
  'Repairs & Maintenance', 'Office Rent', 'Wages & Casual Labour',
  'Postage & Courier', 'Cleaning', 'Miscellaneous', 'Other',
].map((c) => ({ value: c, label: c }))
const resolvedPayoutCategory = computed(() =>
  payoutCategory.value === 'Other' ? payoutCategoryOther.value.trim() : payoutCategory.value
)
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
  payoutCategoryOther.value = ''
  payoutDestinationType.value = 'PHONE_NUMBER'
  payoutPhoneNumber.value = ''
  payoutBankCode.value = ''
  payoutBankAccountNumber.value = ''
  payoutConfirmSecret.value = ''
  payoutOtpStep.value = false
  payoutOtp.value = ''
  payoutOtpError.value = null
}

function openPayout(float: PettyCashFloat) {
  resetPayoutForm()
  payoutError.value = null
  payoutFloat.value = float
}

function closePayout() {
  payoutFloat.value = null
  resetPayoutForm()
}

async function submitPayout() {
  payoutError.value = null
  if (!payoutFloat.value) return
  const amountCents = Math.round(Number(payoutAmountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !payoutRecipientName.value.trim() || !payoutRemarks.value.trim()) {
    payoutError.value = 'Amount (min KES 1), recipient name, and remarks are required.'
    return
  }
  if (payoutFloat.value.balance_cents < amountCents) {
    payoutError.value = `This float only has KES ${formatMoney(payoutFloat.value.balance_cents)} available.`
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
    const result = await requestPettyCashPayout(payoutFloat.value.id, {
      amount: amountCents,
      recipient_name: payoutRecipientName.value.trim(),
      remarks: payoutRemarks.value.trim(),
      category: resolvedPayoutCategory.value || undefined,
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
      const msg = result.message || 'Payout queued for execution.'
      showSuccess(msg)
      closePayout()
      await load()
      if (historyFloat.value) history.value = await fetchPettyCashHistory(historyFloat.value.id, true)
    }
  } catch (err) {
    const msg = extractErrorMessage(err)
    payoutError.value = msg
    showError(msg)
  } finally {
    paying.value = false
  }
}

async function submitPayoutOtp() {
  payoutOtpError.value = null
  if (!payoutFloat.value) return
  if (!/^\d{6}$/.test(payoutOtp.value)) {
    payoutOtpError.value = 'Enter the 6-digit code sent to your phone.'
    return
  }
  payoutOtpConfirming.value = true
  try {
    const result = await confirmPettyCashPayout(payoutFloat.value.id, payoutOtp.value, true)
    const msg = result.message || 'Payout queued for execution.'
    showSuccess(msg)
    closePayout()
    await load()
    if (historyFloat.value) history.value = await fetchPettyCashHistory(historyFloat.value.id, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    payoutOtpError.value = msg
    showError(msg)
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
      <div>
        <h2 class="text-sm font-bold text-text-primary">Petty cash</h2>
        <p class="text-xs text-text-muted mt-0.5">This branch's tracked cash float.</p>
      </div>

      <AppCard class="bg-primary-muted/40 border border-primary/10">
        <div class="flex items-start gap-3">
          <InfoIcon class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p class="text-xs text-text-secondary leading-relaxed">
            Funding is done from the organization dashboard — ask an owner or authorized member to top up a float.
            From here you can send a real payout (M-Pesa or bank transfer) directly from the float, and every
            balance and draw is tracked automatically.
          </p>
        </div>
      </AppCard>

      <div v-if="!loading && floats.length" class="grid grid-cols-2 gap-3">
        <AppCard padding="sm">
          <p class="text-[11px] font-bold text-text-muted uppercase tracking-wide">Total across floats</p>
          <p class="text-lg font-bold text-text-primary mt-1">KES {{ formatMoney(totalBalanceCents) }}</p>
        </AppCard>
        <AppCard padding="sm">
          <p class="text-[11px] font-bold text-text-muted uppercase tracking-wide">Active floats</p>
          <p class="text-lg font-bold text-text-primary mt-1">{{ floats.length }}</p>
        </AppCard>
      </div>

      <p v-if="loading" class="text-sm text-text-muted">Loading floats…</p>
      <AppCard v-else-if="!floats.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <WalletIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No petty cash float for this branch yet</p>
          <p class="text-xs text-text-muted">Ask an org owner to create one from the organization dashboard.</p>
        </div>
      </AppCard>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppCard v-for="f in floats" :key="f.id" padding="none">
          <div class="px-5 py-4">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-text-primary truncate">{{ f.name }}</p>
              <WalletIcon class="w-4 h-4 text-text-muted shrink-0" />
            </div>
            <p class="text-2xl font-black text-text-primary mt-3">KES {{ formatMoney(f.balance_cents) }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">created {{ formatDate(f.created_at) }}</p>
            <div class="flex items-center gap-2 mt-4">
              <AppButton size="sm" variant="secondary" class="flex-1" @click="openPayout(f)">
                <template #icon><ArrowUpRightIcon class="w-3.5 h-3.5" /></template>
                Send payout
              </AppButton>
              <AppButton size="sm" variant="ghost" @click="openHistory(f)">
                <template #icon><HistoryIcon class="w-3.5 h-3.5" /></template>
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Send payout modal -->
    <AppModal :model-value="!!payoutFloat" :title="payoutFloat ? `Send payout — ${payoutFloat.name}` : 'Send payout'" size="md" @update:model-value="closePayout">
      <div v-if="payoutFloat" class="flex flex-col gap-4 p-6">
        <p class="text-xs text-text-muted">
          Sends real money out of this float via M-Pesa or bank transfer. Available balance:
          <span class="font-semibold text-text-primary">KES {{ formatMoney(payoutFloat.balance_cents) }}</span>.
        </p>

        <OtpConfirmCard
          v-if="payoutOtpStep"
          v-model="payoutOtp"
          subject="payout"
          :fee-cents="pendingPayoutFeeCents"
          :confirming="payoutOtpConfirming"
          :error="payoutOtpError"
          @confirm="submitPayoutOtp"
          @cancel="cancelPayoutOtp"
        />

        <form v-else class="flex flex-col gap-4" @submit.prevent="submitPayout">
          <div v-if="payoutError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ payoutError }}</div>

          <div class="flex flex-col gap-3">
            <p class="text-[11px] font-bold text-text-muted uppercase tracking-wide">1. Where's it going</p>
            <AppSelect v-model="payoutDestinationType" label="Pay out via" :options="[{ value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' }, { value: 'BANK_ACCOUNT', label: 'Bank account' }]" />
            <AppInput v-if="payoutDestinationType === 'PHONE_NUMBER'" v-model="payoutPhoneNumber" label="Recipient phone" placeholder="+254712345678" required />
            <div v-else class="grid grid-cols-2 gap-3">
              <AppSelect v-model="payoutBankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
              <AppInput v-model="payoutBankAccountNumber" label="Account number" required />
            </div>
          </div>

          <div class="flex flex-col gap-3 pt-3 border-t border-border">
            <p class="text-[11px] font-bold text-text-muted uppercase tracking-wide">2. Amount and reason</p>
            <div class="grid grid-cols-2 gap-3">
              <AppInput v-model="payoutAmountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
              <AppInput v-model="payoutRecipientName" label="Recipient name" required />
            </div>
            <AppInput v-model="payoutRemarks" label="Remarks" placeholder="Reason for this payout" required />
            <AppSelect v-model="payoutCategory" label="Category (optional)" placeholder="— Select category —" :options="pettyCashCategoryOptions" />
            <AppInput v-if="payoutCategory === 'Other'" v-model="payoutCategoryOther" label="Specify category" placeholder="e.g. Signage" />
          </div>

          <div class="flex flex-col gap-3 pt-3 border-t border-border">
            <p class="text-[11px] font-bold text-text-muted uppercase tracking-wide">3. Confirm</p>
            <ConfirmSecretInput v-model="payoutConfirmSecret" :is-pin="false" />
          </div>

          <AppButton type="submit" :loading="paying" class="self-start">Send payout</AppButton>
        </form>
      </div>
    </AppModal>

    <!-- History modal (view-only) -->
    <AppModal :model-value="!!historyFloat" :title="historyFloat ? `${historyFloat.name} — history` : 'History'" size="md" @update:model-value="historyFloat = null">
      <div v-if="historyFloat" class="flex flex-col gap-4 p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text-primary">Balance: KES {{ formatMoney(historyFloat.balance_cents) }}</p>
          <AppButton size="sm" variant="secondary" @click="openPayout(historyFloat)">
            <template #icon><ArrowUpRightIcon class="w-3.5 h-3.5" /></template>
            Send payout
          </AppButton>
        </div>

        <p v-if="historyLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="!history.length" class="flex flex-col items-center text-center gap-2 py-8">
          <LandmarkIcon class="w-6 h-6 text-text-muted" />
          <p class="text-sm text-text-muted">No draws recorded yet — spend from this float will show up here.</p>
        </div>
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
