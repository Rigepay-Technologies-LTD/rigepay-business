<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBranches, fetchOrgProfile, createOrgTransfer,
  lookupTransferRecipient, requestExternalTransfer, confirmExternalTransfer,
  type BranchSummary, type ProfileResponse, type TransferRecipientLookup,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import ConfirmSecretInput from '@/components/ConfirmSecretInput.vue'
import { ArrowRightIcon, CheckIcon, AlertTriangleIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const { showError, showSuccess } = useResponseModal()

const error = ref<string | null>(null)
const loading = ref(true)
const branches = ref<BranchSummary[]>([])
const profile = ref<ProfileResponse | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [b, p] = await Promise.all([fetchOrgBranches(), fetchOrgProfile()])
    branches.value = b.branches
    profile.value = p
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const endpointOptions = computed(() => {
  const options = [
    { value: 'org', label: `Organization wallet (KES ${formatMoney(profile.value?.organization.wallet.main_cents)})` },
  ]
  for (const b of branches.value) {
    options.push({ value: b.id, label: `${b.name} (KES ${formatMoney(b.main_cents)})` })
  }
  return options
})

const fromEndpoint = ref('org')
const toEndpoint = ref('')
const amountKes = ref('')
const remarks = ref('')
const confirmSecret = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref<string | null>(null)

async function submitTransfer() {
  submitError.value = null
  submitSuccess.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100) {
    submitError.value = 'Enter a valid amount (min KES 1).'
    return
  }
  if (!toEndpoint.value) {
    submitError.value = 'Select a destination.'
    return
  }
  if (fromEndpoint.value === toEndpoint.value) {
    submitError.value = 'Source and destination must be different.'
    return
  }
  if (isOwner ? !/^\d{4}$/.test(confirmSecret.value) : !confirmSecret.value) {
    submitError.value = isOwner ? 'Enter your 4-digit transaction PIN to confirm this transfer.' : 'Re-enter your account password to confirm this transfer.'
    return
  }
  submitting.value = true
  try {
    const result = await createOrgTransfer({
      from: fromEndpoint.value,
      to: toEndpoint.value,
      amount: amountCents,
      remarks: remarks.value.trim() || undefined,
      password: isOwner ? undefined : confirmSecret.value,
      pin: isOwner ? confirmSecret.value : undefined,
    })
    submitSuccess.value = `Moved KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`
    showSuccess(submitSuccess.value)
    amountKes.value = ''
    remarks.value = ''
    confirmSecret.value = ''
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    submitError.value = msg
    showError(msg)
  } finally {
    submitting.value = false
  }
}


const extFromEndpoint = ref('org')
const extRecipientCode = ref('')
const extAmountKes = ref('')
const extRemarks = ref('')
const extConfirmSecret = ref('')
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
    lookupResult.value = await lookupTransferRecipient(code)
  } catch (err) {
    const msg = extractErrorMessage(err)
    lookupError.value = msg
    showError(msg)
  } finally {
    lookupLoading.value = false
  }
}

function resetExternalForm() {
  extRecipientCode.value = ''
  extAmountKes.value = ''
  extRemarks.value = ''
  extConfirmSecret.value = ''
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
  if (isOwner ? !/^\d{4}$/.test(extConfirmSecret.value) : !extConfirmSecret.value) {
    extError.value = isOwner ? 'Enter your 4-digit transaction PIN to confirm this transfer.' : 'Re-enter your account password to confirm this transfer.'
    return
  }
  extSubmitting.value = true
  try {
    const result = await requestExternalTransfer({
      from: extFromEndpoint.value,
      recipient_collection_code: extRecipientCode.value.trim(),
      amount: amountCents,
      remarks: extRemarks.value.trim(),
      password: isOwner ? undefined : extConfirmSecret.value,
      pin: isOwner ? extConfirmSecret.value : undefined,
    })
    if (result.status === 'otp_required') {
      extOtp.value = ''
      extOtpError.value = null
      extOtpStep.value = true
    } else {
      extSuccess.value = `Sent KES ${formatMoney(result.data.amount_cents)} from ${result.data.from} to ${result.data.to}.`
      showSuccess(extSuccess.value)
      resetExternalForm()
      await load()
    }
  } catch (err) {
    const msg = extractErrorMessage(err)
    extError.value = msg
    showError(msg)
  } finally {
    extSubmitting.value = false
  }
}

async function submitExternalOtp() {
  extOtpError.value = null
  extOtpConfirming.value = true
  try {
    const result = await confirmExternalTransfer(extOtp.value)
    extSuccess.value = `Sent KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`
    showSuccess(extSuccess.value)
    extOtpStep.value = false
    resetExternalForm()
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    extOtpError.value = msg
    showError(msg)
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
  <DashboardLayout :org-id="props.orgId" title="Transfers">
    <div class="flex flex-col gap-6">
      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Move funds internally</h2>
        <p class="text-xs text-text-muted mb-5">
          Immediate, no external rail — between your organization's own wallet and any branch, or between two
          branches. Reversible only by transferring back.
        </p>

        <p v-if="loading" class="text-sm text-text-muted">Loading wallets…</p>
        <template v-else>
          <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ submitError }}</div>

          <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitTransfer">
            <div class="flex items-end gap-3">
              <AppSelect v-model="fromEndpoint" label="From" :options="endpointOptions" class="flex-1" />
              <ArrowRightIcon class="w-4 h-4 text-text-muted mb-2.5 shrink-0" />
              <AppSelect v-model="toEndpoint" label="To" :options="endpointOptions" placeholder="Select destination" class="flex-1" />
            </div>
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="remarks" label="Remarks (optional)" placeholder="What this transfer is for" />
            <ConfirmSecretInput v-model="confirmSecret" :is-pin="isOwner" />
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
          Send funds to a different organization or one of its branches, by their collection code. Real money
          leaving your custody — screened and confirmed like any other payout.
        </p>

        <div v-if="extError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ extError }}</div>

        <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitExternalTransfer">
          <AppSelect v-model="extFromEndpoint" label="From" :options="endpointOptions" />

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
          <ConfirmSecretInput v-model="extConfirmSecret" :is-pin="isOwner" />
          <AppButton type="submit" :loading="extSubmitting" class="self-start">Send transfer</AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
