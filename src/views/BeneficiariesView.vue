<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import {
  fetchOrgBeneficiaries, createOrgBeneficiary, confirmOrgBeneficiary, updateOrgBeneficiary,
  deleteOrgBeneficiary, fetchOrgBankCodes, validateOrgMobileMoney, validateOrgBankAccount,
  validateOrgShortcode,
  type Beneficiary, type BeneficiaryDestinationType, type BankCode, type CreateBeneficiaryInput,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { UsersIcon, PencilIcon, Trash2Icon, PlusIcon, ShieldCheckIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string }>()
const isBranch = computed(() => !!props.branchId)

const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const loading = ref(true)
const beneficiaries = ref<Beneficiary[]>([])
const search = ref('')
const bankCodes = ref<BankCode[]>([])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return beneficiaries.value
  return beneficiaries.value.filter(
    (b) =>
      b.nickname.toLowerCase().includes(q) ||
      b.recipient_name.toLowerCase().includes(q) ||
      (b.phone_number ?? '').includes(q) ||
      (b.shortcode ?? '').includes(q) ||
      (b.bank_account_number ?? '').includes(q),
  )
})

async function load() {
  loading.value = true
  try {
    beneficiaries.value = (await fetchOrgBeneficiaries(isBranch.value)) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await load()
  try {
    bankCodes.value = (await fetchOrgBankCodes(isBranch.value)) ?? []
  } catch { /* dropdown falls back to a text field */ }
})

type Step = 'closed' | 'details' | 'auth' | 'otp'
const step = ref<Step>('closed')
const submitting = ref(false)

interface BeneficiaryForm {
  destination_type: BeneficiaryDestinationType
  nickname: string
  phone_number: string
  bank_code: string
  bank_account_number: string
  shortcode: string
  account_reference: string
}
const form = reactive<BeneficiaryForm>({
  destination_type: 'PHONE_NUMBER',
  nickname: '',
  phone_number: '',
  bank_code: '',
  bank_account_number: '',
  shortcode: '',
  account_reference: '',
})

const verifiedName = ref('')
const manualName = ref('')
const verifyAttempted = ref(false)
const verifying = ref(false)
const verifyError = ref('')
const detailsError = ref('')

const effectiveName = computed(() => verifiedName.value || manualName.value.trim())
const showManualName = computed(() => verifyAttempted.value && !verifiedName.value)

const auth = reactive({ pin: '', password: '' })
const otpCode = ref('')

function resetForm() {
  form.destination_type = 'PHONE_NUMBER'
  form.nickname = ''
  form.phone_number = ''
  form.bank_code = ''
  form.bank_account_number = ''
  form.shortcode = ''
  form.account_reference = ''
  verifiedName.value = ''
  manualName.value = ''
  verifyAttempted.value = false
  verifyError.value = ''
  detailsError.value = ''
  auth.pin = ''
  auth.password = ''
  otpCode.value = ''
}

function openForm() {
  resetForm()
  step.value = 'details'
}

function resetVerification() {
  verifiedName.value = ''
  manualName.value = ''
  verifyAttempted.value = false
  verifyError.value = ''
}

const canVerify = computed(() => {
  switch (form.destination_type) {
    case 'PHONE_NUMBER':
      return form.phone_number.trim().length >= 9
    case 'BANK_ACCOUNT':
      return !!form.bank_code && form.bank_account_number.trim().length >= 4
    case 'PAYBILL':
      return form.shortcode.trim().length >= 5
    case 'TILL_NUMBER':
      return form.shortcode.trim().length >= 5
    default:
      return false
  }
})

async function runVerify() {
  verifyError.value = ''
  verifiedName.value = ''
  verifying.value = true
  try {
    let name = ''
    if (form.destination_type === 'PHONE_NUMBER') {
      name = (await validateOrgMobileMoney(form.phone_number.trim(), undefined, isBranch.value)).account_name
    } else if (form.destination_type === 'BANK_ACCOUNT') {
      name = (await validateOrgBankAccount(form.bank_account_number.trim(), form.bank_code, isBranch.value)).account_name
    } else {
      const type = form.destination_type === 'PAYBILL' ? 'paybill' : 'till'
      name = (await validateOrgShortcode(isBranch.value, form.shortcode.trim(), type)).account_name
    }
    if (name && name.trim()) {
      verifiedName.value = name.trim()
    } else {
      verifyError.value = "We couldn't confirm the account holder — enter their name to continue."
    }
  } catch (err) {
    verifyError.value = extractErrorMessage(err) + " — you can enter the recipient's name manually to continue."
  } finally {
    verifyAttempted.value = true
    verifying.value = false
  }
}

function toAuthStep() {
  detailsError.value = ''
  if (!form.nickname.trim()) {
    detailsError.value = 'Give this payee a nickname.'
    return
  }
  if (!verifyAttempted.value) {
    detailsError.value = 'Verify the recipient first (or enter their name manually if it cannot be confirmed).'
    return
  }
  if (!effectiveName.value) {
    detailsError.value = "Enter the recipient's name."
    return
  }
  if (form.destination_type === 'PAYBILL' && !form.account_reference.trim()) {
    detailsError.value = 'Account / reference number is required for a paybill.'
    return
  }
  step.value = 'auth'
}

function buildInput(): CreateBeneficiaryInput {
  const base: CreateBeneficiaryInput = {
    nickname: form.nickname.trim(),
    recipient_name: effectiveName.value,
    verified_name: verifiedName.value || undefined,
    destination_type: form.destination_type,
    pin: auth.pin || undefined,
    password: auth.password || undefined,
  }
  if (form.destination_type === 'PHONE_NUMBER') base.phone_number = form.phone_number.trim()
  if (form.destination_type === 'BANK_ACCOUNT') {
    base.bank_code = form.bank_code
    base.bank_account_number = form.bank_account_number.trim()
  }
  if (form.destination_type === 'PAYBILL' || form.destination_type === 'TILL_NUMBER') {
    base.shortcode = form.shortcode.trim()
    if (form.account_reference.trim()) base.account_reference = form.account_reference.trim()
  }
  return base
}

async function submitDetails() {
  submitting.value = true
  try {
    const res = await createOrgBeneficiary(buildInput(), isBranch.value)
    if (res.outcome === 'otp_required') {
      step.value = 'otp'
    } else {
      beneficiaries.value.unshift(res.beneficiary)
      showSuccess(`${res.beneficiary.nickname} saved.`)
      step.value = 'closed'
      resetForm()
    }
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    submitting.value = false
  }
}

async function submitOtp() {
  submitting.value = true
  try {
    const b = await confirmOrgBeneficiary(otpCode.value.trim(), isBranch.value)
    beneficiaries.value.unshift(b)
    showSuccess(`${b.nickname} saved.`)
    step.value = 'closed'
    resetForm()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    submitting.value = false
  }
}

const editing = ref<Beneficiary | null>(null)
const editNickname = ref('')
const savingEdit = ref(false)

function startEdit(b: Beneficiary) {
  editing.value = b
  editNickname.value = b.nickname
}

async function submitEdit() {
  if (!editing.value || !editNickname.value.trim()) return
  savingEdit.value = true
  try {
    const updated = await updateOrgBeneficiary(editing.value.id, { nickname: editNickname.value.trim() }, isBranch.value)
    const i = beneficiaries.value.findIndex((x) => x.id === updated.id)
    if (i !== -1) beneficiaries.value[i] = updated
    showSuccess('Beneficiary updated.')
    editing.value = null
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    savingEdit.value = false
  }
}

const removing = ref<string | null>(null)

async function handleRemove(b: Beneficiary) {
  const ok = await confirmAction({
    title: 'Remove this beneficiary?',
    message: `${b.nickname} will no longer appear in your payout list. Money already sent is unaffected.`,
    confirmLabel: 'Remove',
    cancelLabel: 'Keep',
  })
  if (!ok) return
  removing.value = b.id
  try {
    await deleteOrgBeneficiary(b.id, isBranch.value)
    beneficiaries.value = beneficiaries.value.filter((x) => x.id !== b.id)
    showSuccess(`${b.nickname} removed.`)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    removing.value = null
  }
}

const railLabels: Record<BeneficiaryDestinationType, string> = {
  PHONE_NUMBER: 'M-Pesa (phone)',
  TILL_NUMBER: 'Till number',
  PAYBILL: 'Paybill',
  BANK_ACCOUNT: 'Bank account',
}

function destinationLabel(b: Beneficiary): string {
  if (b.destination_type === 'BANK_ACCOUNT') {
    const bank = bankCodes.value.find((x) => x.code === b.bank_code)?.name ?? b.bank_code ?? 'Bank'
    return `${bank} · ${b.bank_account_number ?? ''}`
  }
  if (b.destination_type === 'PAYBILL') return `Paybill ${b.shortcode ?? ''} · acc ${b.account_reference ?? ''}`
  if (b.destination_type === 'TILL_NUMBER') return `Till ${b.shortcode ?? ''}`
  return b.phone_number ?? ''
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Beneficiaries">
    <div class="flex flex-col gap-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Saved payees</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Recipients you can pick when sending a payout. Anyone you successfully pay is added here
            automatically. Adding one manually takes a PIN and a one-time code, same as sending money.
          </p>
        </div>
        <AppButton size="sm" @click="openForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Add beneficiary
        </AppButton>
      </div>

      <AppInput v-model="search" placeholder="Search by name, phone, shortcode or account" />

      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
      <AppCard v-else-if="!filtered.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <UsersIcon class="w-6 h-6 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No beneficiaries yet</p>
          <p class="text-xs text-text-muted">They'll show up here after your first successful payout, or add one now.</p>
        </div>
      </AppCard>

      <AppCard v-else padding="none">
        <div class="flex flex-col divide-y divide-border">
          <div v-for="b in filtered" :key="b.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-text-primary truncate">{{ b.nickname }}</p>
                <span v-if="b.source === 'AUTO'" class="text-[10px] font-bold uppercase rounded-full bg-surface-2 text-text-muted px-1.5 py-0.5">auto</span>
                <span class="text-[10px] font-semibold uppercase rounded-full bg-surface-2 text-text-muted px-1.5 py-0.5">{{ railLabels[b.destination_type] }}</span>
              </div>
              <p class="text-xs text-text-muted mt-0.5 truncate">
                {{ b.recipient_name }} · {{ destinationLabel(b) }} · added {{ formatDate(b.created_at) }}
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <AppButton size="sm" variant="ghost" @click="startEdit(b)">
                <template #icon><PencilIcon class="w-4 h-4" /></template>
              </AppButton>
              <AppButton size="sm" variant="ghost" :loading="removing === b.id" @click="handleRemove(b)">
                <template #icon><Trash2Icon class="w-4 h-4" /></template>
              </AppButton>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <div v-if="step !== 'closed'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="step = 'closed'">
      <div class="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl">
        <!-- STEP: DETAILS -->
        <div v-if="step === 'details'" class="flex flex-col gap-3">
          <h3 class="text-sm font-bold text-text-primary">New beneficiary</h3>
          <div v-if="detailsError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ detailsError }}</div>

          <label class="text-xs font-semibold text-text-secondary">
            Destination type
            <select v-model="form.destination_type" class="mt-1 w-full h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none" @change="resetVerification()">
              <option value="PHONE_NUMBER">M-Pesa (phone)</option>
              <option value="TILL_NUMBER">Till number</option>
              <option value="PAYBILL">Paybill</option>
              <option value="BANK_ACCOUNT">Bank account</option>
            </select>
          </label>

          <AppInput v-if="form.destination_type === 'PHONE_NUMBER'" v-model="form.phone_number" label="Phone number" placeholder="2547XXXXXXXX" @update:model-value="resetVerification()" />

          <template v-else-if="form.destination_type === 'BANK_ACCOUNT'">
            <label class="text-xs font-semibold text-text-secondary">
              Bank
              <select v-model="form.bank_code" class="mt-1 w-full h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none" @change="resetVerification()">
                <option value="" disabled>Select a bank</option>
                <option v-for="bc in bankCodes" :key="bc.code" :value="bc.code">{{ bc.name }}</option>
              </select>
            </label>
            <AppInput v-model="form.bank_account_number" label="Account number" @update:model-value="resetVerification()" />
          </template>

          <template v-else>
            <AppInput v-model="form.shortcode" :label="form.destination_type === 'PAYBILL' ? 'Paybill number' : 'Till number'" @update:model-value="resetVerification()" />
            <AppInput v-if="form.destination_type === 'PAYBILL'" v-model="form.account_reference" label="Account / reference number" placeholder="Required for paybill" />
          </template>

          <div class="flex items-center gap-2">
            <AppButton size="sm" variant="ghost" :loading="verifying" :disabled="!canVerify" @click="runVerify">Verify recipient</AppButton>
            <span v-if="verifiedName" class="flex items-center gap-1 text-xs font-semibold text-success-text">
              <ShieldCheckIcon class="w-3.5 h-3.5" /> {{ verifiedName }}
            </span>
          </div>
          <p v-if="verifyError" class="text-xs text-warning-text">{{ verifyError }}</p>

          <AppInput
            v-if="showManualName"
            v-model="manualName"
            label="Recipient name"
            placeholder="Enter the account holder's full name"
            required
          />

          <AppInput v-model="form.nickname" label="Nickname" placeholder="e.g. Weekly supplier" required />

          <div class="flex justify-end gap-2 pt-1">
            <AppButton variant="ghost" @click="step = 'closed'">Cancel</AppButton>
            <AppButton :disabled="!effectiveName || !verifyAttempted" @click="toAuthStep">Continue</AppButton>
          </div>
        </div>

        <!-- STEP: AUTH (PIN / password) -->
        <div v-else-if="step === 'auth'" class="flex flex-col gap-3">
          <h3 class="text-sm font-bold text-text-primary">Confirm it's you</h3>
          <p class="text-xs text-text-muted">Saving {{ effectiveName }} as “{{ form.nickname }}”.</p>
          <AppInput v-model="auth.pin" label="Transaction PIN" type="password" inputmode="numeric" placeholder="Owners" />
          <AppInput v-model="auth.password" label="Password" type="password" placeholder="Other members" />
          <p class="text-[11px] text-text-muted">Owners enter their transaction PIN; other members enter their login password.</p>
          <div class="flex justify-end gap-2 pt-1">
            <AppButton variant="ghost" @click="step = 'details'">Back</AppButton>
            <AppButton :loading="submitting" :disabled="!auth.pin && !auth.password" @click="submitDetails">Send code</AppButton>
          </div>
        </div>

        <!-- STEP: OTP -->
        <div v-else class="flex flex-col gap-3">
          <h3 class="text-sm font-bold text-text-primary">Enter the code</h3>
          <p class="text-xs text-text-muted">We sent a 6-digit code to your phone.</p>
          <AppInput v-model="otpCode" label="6-digit code" inputmode="numeric" maxlength="6" />
          <div class="flex justify-end gap-2 pt-1">
            <AppButton variant="ghost" @click="step = 'closed'">Cancel</AppButton>
            <AppButton :loading="submitting" :disabled="otpCode.trim().length !== 6" @click="submitOtp">Save beneficiary</AppButton>
          </div>
        </div>
      </div>
    </div>

    <div v-if="editing" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="editing = null">
      <div class="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
        <h3 class="text-sm font-bold text-text-primary">Rename beneficiary</h3>
        <p class="text-xs text-text-muted mt-0.5">{{ editing.recipient_name }} · {{ destinationLabel(editing) }}</p>
        <AppInput v-model="editNickname" label="Nickname" class="mt-3" required />
        <div class="flex justify-end gap-2 mt-4">
          <AppButton variant="ghost" @click="editing = null">Cancel</AppButton>
          <AppButton :loading="savingEdit" @click="submitEdit">Save</AppButton>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
