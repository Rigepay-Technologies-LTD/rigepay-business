<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgSettlementPreferences, updateOrgSettlementPreferences, confirmOrgSettlementPreferences, fetchOrgBankCodes, validateOrgShortcode,
  type SettlementPreferences, type BankCode,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import { WalletIcon } from 'lucide-vue-next'

const { showError, showSuccess } = useResponseModal()

const props = defineProps<{ orgId: string; branchId: string }>()

const loading = ref(true)
const saving = ref(false)
const formError = ref<string | null>(null)
const bankOptions = ref<{ value: string; label: string }[]>([])

const destinationType = ref<'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'>('PHONE_NUMBER')
const phoneNumber = ref('')
const shortcode = ref('')
const bankCode = ref('')
const bankAccountNumber = ref('')
const password = ref('')

const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'Mobile money (M-Pesa)' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL_NUMBER', label: 'Till number' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
]

function applyPreferences(prefs: SettlementPreferences) {
  const dt = (prefs.destination_type as typeof destinationType.value) || 'PHONE_NUMBER'
  destinationType.value = dt
  if (dt === 'BANK_ACCOUNT') {
    bankCode.value = prefs.bank_code || ''
    bankAccountNumber.value = prefs.bank_account_number || ''
  } else if (dt === 'PAYBILL' || dt === 'TILL_NUMBER') {
    shortcode.value = prefs.phone_number || ''
  } else {
    phoneNumber.value = prefs.phone_number || ''
  }
}

async function load() {
  loading.value = true
  try {
    const [prefs, codes] = await Promise.all([fetchOrgSettlementPreferences(true), fetchOrgBankCodes(true)])
    applyPreferences(prefs)
    bankOptions.value = (codes as BankCode[]).map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const validating = ref(false)
const shortcodeValidation = ref<{ ok: boolean; message: string } | null>(null)
async function validateShortcodeDestination() {
  shortcodeValidation.value = null
  if (!shortcode.value.trim()) {
    shortcodeValidation.value = { ok: false, message: `Enter a ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number first.` }
    return
  }
  validating.value = true
  try {
    const result = await validateOrgShortcode(true, shortcode.value.trim(), destinationType.value === 'PAYBILL' ? 'paybill' : 'till')
    shortcodeValidation.value = { ok: true, message: `Account holder: ${result.account_name}` }
  } catch (err) {
    shortcodeValidation.value = { ok: false, message: extractErrorMessage(err) }
  } finally {
    validating.value = false
  }
}

async function submitSave() {
  formError.value = null
  if (destinationType.value === 'BANK_ACCOUNT') {
    if (!bankCode.value || !bankAccountNumber.value.trim()) {
      formError.value = 'Select a bank and enter the account number.'
      return
    }
  } else if (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') {
    if (!shortcode.value.trim()) {
      formError.value = `Enter the ${destinationType.value === 'PAYBILL' ? 'paybill' : 'till'} number.`
      return
    }
  } else if (!phoneNumber.value.trim()) {
    formError.value = 'Recipient phone number is required.'
    return
  }
  if (!password.value) {
    formError.value = 'Enter your account password to confirm this change.'
    return
  }

  saving.value = true
  try {
    const result = await updateOrgSettlementPreferences({
      destination_type: destinationType.value,
      phone_number: destinationType.value === 'PHONE_NUMBER' ? phoneNumber.value.trim() : undefined,
      shortcode: (destinationType.value === 'PAYBILL' || destinationType.value === 'TILL_NUMBER') ? shortcode.value.trim() : undefined,
      bank_code: destinationType.value === 'BANK_ACCOUNT' ? bankCode.value : undefined,
      bank_account_number: destinationType.value === 'BANK_ACCOUNT' ? bankAccountNumber.value.trim() : undefined,
      password: password.value,
    }, true)
    password.value = ''
    if (result.status === 'otp_required') {
      otp.value = ''
      otpError.value = null
      otpStep.value = true
      return
    }
    showSuccess('Default settlement destination updated.')
  } catch (err) {
    const msg = extractErrorMessage(err)
    formError.value = msg
    showError(msg)
  } finally {
    saving.value = false
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
    await confirmOrgSettlementPreferences(otp.value, true)
    otpStep.value = false
    showSuccess('Default settlement destination updated.')
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
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Settlement preferences">
    <div class="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 class="text-sm font-bold text-text-primary">Default settlement destination</h2>
        <p class="text-xs text-text-muted mt-0.5">
          Where auto-settlement rules for this branch send money by default. Individual scheduled payout rules can
          still specify their own destination.
        </p>
      </div>

      <OtpConfirmCard
        v-if="otpStep"
        v-model="otp"
        subject="settlement preferences change"
        :confirming="otpConfirming"
        :error="otpError"
        @confirm="submitOtp"
        @cancel="cancelOtp"
      />

      <AppCard v-else>
        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <form v-else class="flex flex-col gap-4" @submit.prevent="submitSave">
          <div v-if="formError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ formError }}</div>

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
              <AppButton type="button" variant="secondary" :loading="validating" @click="validateShortcodeDestination">Verify</AppButton>
            </div>
            <div v-if="shortcodeValidation" :class="['text-xs rounded-lg px-3 py-2', shortcodeValidation.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
              {{ shortcodeValidation.message }}
            </div>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect v-model="bankCode" label="Bank" placeholder="— Select bank —" :options="bankOptions" required />
            <AppInput v-model="bankAccountNumber" label="Account number" required />
          </div>

          <AppInput v-model="password" type="password" label="Account password" required />

          <AppButton type="submit" :loading="saving" class="self-start">
            <template #icon><WalletIcon class="w-4 h-4" /></template>
            Save preferences
          </AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
