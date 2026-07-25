<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  createBranchTransfer, lookupTransferRecipient, requestBranchExternalTransfer, confirmBranchExternalTransfer,
  fetchSiblingBranches, type SiblingBranch, type TransferRecipientLookup,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import { ArrowRightIcon, CheckIcon, AlertTriangleIcon } from 'lucide-vue-next'


const props = defineProps<{ orgId: string; branchId: string }>()

const error = ref<string | null>(null)
const loading = ref(true)
const siblingBranches = ref<SiblingBranch[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    siblingBranches.value = await fetchSiblingBranches()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const toOptions = () => [
  { value: 'org', label: 'Organization wallet' },
  ...siblingBranches.value.map((b) => ({ value: b.id, label: b.name })),
]

const toEndpoint = ref('')
const amountKes = ref('')
const remarks = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref<string | null>(null)

async function submitTransfer() {
  submitError.value = null
  submitSuccess.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !toEndpoint.value) {
    submitError.value = 'Enter a valid amount (min KES 1) and select a destination.'
    return
  }
  if (!confirmPassword.value) {
    submitError.value = 'Re-enter your account password to confirm this transfer.'
    return
  }
  submitting.value = true
  try {
    const result = await createBranchTransfer({
      to: toEndpoint.value,
      amount: amountCents,
      remarks: remarks.value.trim() || undefined,
      password: confirmPassword.value,
    })
    submitSuccess.value = `Moved KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`
    amountKes.value = ''
    remarks.value = ''
    confirmPassword.value = ''
    await load()
  } catch (err) {
    submitError.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const extRecipientCode = ref('')
const extAmountKes = ref('')
const extRemarks = ref('')
const extPassword = ref('')
const extSubmitting = ref(false)
const extError = ref<string | null>(null)
const extSuccess = ref<string | null>(null)

const extOtpStep = ref(false)
const extOtp = ref('')
const extOtpError = ref<string | null>(null)
const extOtpConfirming = ref(false)

const lookupLoading = ref(false)
const lookupResult = ref<TransferRecipientLookup | null>(null)
const lookupError = ref<string | null>(null)

async function verifyRecipient() {
  lookupResult.value = null
  lookupError.value = null
  const code = extRecipientCode.value.trim()
  if (!code) {
    lookupError.value = 'Enter a collection code first.'
    return
  }
  lookupLoading.value = true
  try {
    lookupResult.value = await lookupTransferRecipient(code, true)
  } catch (err) {
    lookupError.value = extractErrorMessage(err)
  } finally {
    lookupLoading.value = false
  }
}

function resetExternalForm() {
  extRecipientCode.value = ''
  extAmountKes.value = ''
  extRemarks.value = ''
  extPassword.value = ''
  lookupResult.value = null
  lookupError.value = null
}

async function submitExternalTransfer() {
  extError.value = null
  extSuccess.value = null
  const amountCents = Math.round(Number(extAmountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !extRecipientCode.value.trim() || !extRemarks.value.trim()) {
    extError.value = 'Amount (min KES 1), recipient collection code, and remarks are required.'
    return
  }
  if (!lookupResult.value || lookupResult.value.collection_code !== extRecipientCode.value.trim()) {
    extError.value = 'Verify the recipient before sending — click "Verify recipient" above.'
    return
  }
  if (!extPassword.value) {
    extError.value = 'Re-enter your account password to confirm this transfer.'
    return
  }
  extSubmitting.value = true
  try {
    const result = await requestBranchExternalTransfer({
      recipient_collection_code: extRecipientCode.value.trim(),
      amount: amountCents,
      remarks: extRemarks.value.trim(),
      password: extPassword.value,
    })
    if (result.status === 'otp_required') {
      extOtp.value = ''
      extOtpError.value = null
      extOtpStep.value = true
    } else {
      extSuccess.value = `Sent KES ${formatMoney(result.data.amount_cents)} from ${result.data.from} to ${result.data.to}.`
      resetExternalForm()
    }
  } catch (err) {
    extError.value = extractErrorMessage(err)
  } finally {
    extSubmitting.value = false
  }
}

async function submitExternalOtp() {
  extOtpError.value = null
  extOtpConfirming.value = true
  try {
    const result = await confirmBranchExternalTransfer(extOtp.value)
    extSuccess.value = `Sent KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`
    extOtpStep.value = false
    resetExternalForm()
  } catch (err) {
    extOtpError.value = extractErrorMessage(err)
  } finally {
    extOtpConfirming.value = false
  }
}

function cancelExternalOtp() {
  extOtpStep.value = false
  extOtp.value = ''
  extOtpError.value = null
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Transfers">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Move funds internally</h2>
        <p class="text-xs text-text-muted mb-5">
          Immediate, no external rail — from this branch's own wallet to the organization or a sibling branch.
        </p>

        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <template v-else>
          <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ submitError }}</div>
          <div v-if="submitSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ submitSuccess }}</div>

          <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitTransfer">
            <div class="flex items-end gap-3">
              <div class="flex-1 text-xs text-text-muted">
                <span class="block font-semibold text-text-primary mb-1">From</span>
                This branch's own wallet
              </div>
              <ArrowRightIcon class="w-4 h-4 text-text-muted mb-2.5 shrink-0" />
              <AppSelect v-model="toEndpoint" label="To" :options="toOptions()" placeholder="Select destination" class="flex-1" />
            </div>
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="remarks" label="Remarks (optional)" placeholder="What this transfer is for" />
            <AppInput v-model="confirmPassword" type="password" label="Confirm your password" required />
            <AppButton type="submit" :loading="submitting" class="self-start">Move funds</AppButton>
          </form>
        </template>
      </AppCard>

      <OtpConfirmCard
        v-if="extOtpStep"
        v-model="extOtp"
        subject="transfer"
        :confirming="extOtpConfirming"
        :error="extOtpError"
        @confirm="submitExternalOtp"
        @cancel="cancelExternalOtp"
      />

      <AppCard v-else>
        <h2 class="text-sm font-bold text-text-primary mb-1">Transfer to another business</h2>
        <p class="text-xs text-text-muted mb-5">
          Send funds from this branch to a different organization or one of its branches, by their collection
          code. Real money leaving your custody — screened and confirmed like any other payout.
        </p>

        <div v-if="extError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ extError }}</div>
        <div v-if="extSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ extSuccess }}</div>

        <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitExternalTransfer">
          <div class="flex items-end gap-3">
            <AppInput
              v-model="extRecipientCode"
              label="Recipient collection code"
              placeholder="6-digit code"
              class="flex-1"
              required
              @input="lookupResult = null"
            />
            <AppButton type="button" variant="secondary" :loading="lookupLoading" @click="verifyRecipient">Verify recipient</AppButton>
          </div>
          <div v-if="lookupError" class="text-xs rounded-lg px-3 py-2 flex items-center gap-2 bg-error-light text-error-text -mt-2">
            <AlertTriangleIcon class="w-3.5 h-3.5 shrink-0" />
            {{ lookupError }}
          </div>
          <div v-else-if="lookupResult" class="text-xs rounded-lg px-3 py-2 flex items-center gap-2 bg-success-light text-success-text -mt-2">
            <CheckIcon class="w-3.5 h-3.5 shrink-0" />
            {{ lookupResult.name }} — {{ lookupResult.type === 'organization' ? 'organization' : 'branch' }}
          </div>

          <AppInput v-model="extAmountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
          <AppInput v-model="extRemarks" label="Remarks" placeholder="What this transfer is for" required />
          <AppInput v-model="extPassword" type="password" label="Confirm your password" required />
          <AppButton type="submit" :loading="extSubmitting" class="self-start">Send transfer</AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
