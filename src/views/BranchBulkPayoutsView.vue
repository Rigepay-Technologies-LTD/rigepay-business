<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBankCodes, createBulkPayoutBatch, confirmBulkPayoutBatch, fetchBulkPayoutBatches, fetchBulkPayoutBatch, reclaimBulkPayoutResidual,
  fetchTags, fetchTagsForSubject, assignTag, unassignTag, validateOrgShortcode, validateOrgBankAccount, validateOrgMobileMoney,
  type BankCode, type BulkPayoutBatch, type BulkPayoutItem, type OrgTag,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, TagIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError, showSuccess } = useResponseModal()

const props = defineProps<{ orgId: string; branchId: string }>()

const error = ref<string | null>(null)
const loading = ref(true)
const batches = ref<BulkPayoutBatch[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    batches.value = await fetchBulkPayoutBatches(true)
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

const showCreateForm = ref(false)
const remarks = ref('')
const password = ref('')

interface EditableRow {
  key: number
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  amount_kes: string
  recipient_name: string
  phone_number: string
  shortcode: string
  account_reference: string
  bank_code: string
  bank_account_number: string
  remarks: string
  verifying: boolean
  verifyResult: { ok: boolean; message: string } | null
}

let nextRowKey = 1
function blankRow(): EditableRow {
  return {
    key: nextRowKey++,
    destination_type: 'PHONE_NUMBER',
    amount_kes: '',
    recipient_name: '',
    phone_number: '',
    shortcode: '',
    account_reference: '',
    bank_code: '',
    bank_account_number: '',
    remarks: '',
    verifying: false,
    verifyResult: null,
  }
}

async function verifyRowShortcode(r: EditableRow) {
  r.verifyResult = null
  if (!r.shortcode.trim()) {
    r.verifyResult = { ok: false, message: `Enter a ${r.destination_type === 'PAYBILL' ? 'paybill' : 'till'} number first.` }
    return
  }
  r.verifying = true
  try {
    const result = await validateOrgShortcode(true, r.shortcode.trim(), r.destination_type === 'PAYBILL' ? 'paybill' : 'till')
    r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
    if (!r.recipient_name.trim()) r.recipient_name = result.account_name
  } catch (err) {
    r.verifyResult = { ok: false, message: extractErrorMessage(err) }
  } finally {
    r.verifying = false
  }
}

// Verify recipient for phone / bank-account rows — mirrors
// verifyRowShortcode above (paybill/till already had this).
async function verifyRowRecipient(r: EditableRow) {
  r.verifyResult = null
  r.verifying = true
  try {
    if (r.destination_type === 'BANK_ACCOUNT') {
      if (!r.bank_account_number.trim() || !r.bank_code) {
        r.verifyResult = { ok: false, message: 'Enter a bank and account number first.' }
        return
      }
      const result = await validateOrgBankAccount(r.bank_account_number.trim(), r.bank_code, true)
      r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!r.recipient_name.trim()) r.recipient_name = result.account_name
    } else {
      if (!r.phone_number.trim()) {
        r.verifyResult = { ok: false, message: 'Enter a phone number first.' }
        return
      }
      const result = await validateOrgMobileMoney(r.phone_number.trim(), undefined, true)
      r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!r.recipient_name.trim()) r.recipient_name = result.account_name
    }
  } catch (err) {
    r.verifyResult = { ok: false, message: extractErrorMessage(err) }
  } finally {
    r.verifying = false
  }
}

const rows = ref<EditableRow[]>([blankRow(), blankRow()])

function addRow() {
  rows.value.push(blankRow())
}
function removeRow(key: number) {
  rows.value = rows.value.filter((r) => r.key !== key)
}
function resetRows() {
  nextRowKey = 1
  rows.value = [blankRow(), blankRow()]
}

const destinationOptions = [
  { value: 'PHONE_NUMBER', label: 'M-Pesa' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL_NUMBER', label: 'Till' },
  { value: 'BANK_ACCOUNT', label: 'Bank' },
]

const totalPreview = computed(() => rows.value.reduce((sum, r) => sum + (Math.round(Number(r.amount_kes) * 100) || 0), 0))
const filledRowCount = computed(() => rows.value.filter((r) => r.recipient_name.trim() && Number(r.amount_kes) > 0).length)

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref<string | null>(null)

async function submitBatch() {
  submitError.value = null
  submitSuccess.value = null

  const items = []
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    const isBlank = !r.recipient_name.trim() && !r.amount_kes && !r.phone_number && !r.bank_account_number
    if (isBlank) continue

    const amountCents = Math.round(Number(r.amount_kes) * 100)
    if (!amountCents || amountCents < 100) {
      submitError.value = `Row ${i + 1}: enter a valid amount (min KES 1).`
      return
    }
    if (!r.recipient_name.trim()) {
      submitError.value = `Row ${i + 1}: recipient name is required.`
      return
    }
    const isShortcode = r.destination_type === 'PAYBILL' || r.destination_type === 'TILL_NUMBER'
    if (r.destination_type === 'BANK_ACCOUNT') {
      if (!r.bank_code || !r.bank_account_number.trim()) {
        submitError.value = `Row ${i + 1}: select a bank and enter the account number.`
        return
      }
    } else if (isShortcode) {
      if (!r.shortcode.trim()) {
        submitError.value = `Row ${i + 1}: enter the ${r.destination_type === 'PAYBILL' ? 'paybill' : 'till'} number.`
        return
      }
    } else if (!r.phone_number.trim()) {
      submitError.value = `Row ${i + 1}: enter a phone number.`
      return
    }
    items.push({
      amount_cents: amountCents,
      recipient_name: r.recipient_name.trim(),
      destination_type: r.destination_type,
      phone_number: r.destination_type === 'PHONE_NUMBER' ? r.phone_number.trim() : undefined,
      shortcode: isShortcode ? r.shortcode.trim() : undefined,
      account_reference: isShortcode ? r.account_reference.trim() || undefined : undefined,
      bank_code: r.destination_type === 'BANK_ACCOUNT' ? r.bank_code : undefined,
      bank_account_number: r.destination_type === 'BANK_ACCOUNT' ? r.bank_account_number.trim() : undefined,
      remarks: r.remarks.trim() || undefined,
    })
  }

  if (items.length < 2) {
    submitError.value = 'A batch needs at least 2 payees — use a single payout for one recipient.'
    return
  }
  if (!password.value) {
    submitError.value = 'Enter your account password to confirm this batch.'
    return
  }

  submitting.value = true
  try {
    const result = await createBulkPayoutBatch({
      remarks: remarks.value.trim() || undefined,
      items,
      password: password.value,
    }, true)
    password.value = ''
    if (result.status === 'otp_required') {
      otp.value = ''
      otpError.value = null
      otpStep.value = true
      return
    }
    const itemCount = result.data?.item_count ?? result.item_count ?? 0
    const totalAmount = result.data?.total_amount_cents ?? result.total_amount_cents ?? 0
    const totalFeeReserve = result.data?.total_fee_reserve_cents ?? result.total_fee_reserve_cents ?? 0
    const successMsg = `Batch escrowed: ${itemCount} items, KES ${formatMoney(totalAmount)} + an estimated KES ${formatMoney(totalFeeReserve)} in fees reserved (KES ${formatMoney(totalAmount + totalFeeReserve)} total held) — dispatching shortly.`
    submitSuccess.value = successMsg
    showSuccess(successMsg)
    resetRows()
    remarks.value = ''
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    submitError.value = msg
    showError(msg)
  } finally {
    submitting.value = false
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
    const result = await confirmBulkPayoutBatch(otp.value, true)
    const itemCount = result.data?.item_count ?? 0
    const totalAmount = result.data?.total_amount_cents ?? 0
    const totalFeeReserve = result.data?.total_fee_reserve_cents ?? 0
    const successMsg = `Batch escrowed: ${itemCount} items, KES ${formatMoney(totalAmount)} + an estimated KES ${formatMoney(totalFeeReserve)} in fees reserved (KES ${formatMoney(totalAmount + totalFeeReserve)} total held) — dispatching shortly.`
    submitSuccess.value = successMsg
    showSuccess(successMsg)
    otpStep.value = false
    resetRows()
    remarks.value = ''
    showCreateForm.value = false
    await load()
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

const expandedBatchId = ref<string | null>(null)
const batchDetail = ref<{ batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number } | null>(null)
const detailLoading = ref(false)
const reclaiming = ref(false)
const reclaimMessage = ref<string | null>(null)

async function toggleExpand(batchId: string) {
  if (expandedBatchId.value === batchId) {
    expandedBatchId.value = null
    batchDetail.value = null
    return
  }
  expandedBatchId.value = batchId
  reclaimMessage.value = null
  detailLoading.value = true
  try {
    batchDetail.value = await fetchBulkPayoutBatch(batchId, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    detailLoading.value = false
  }
}

async function handleReclaim(batchId: string) {
  reclaiming.value = true
  reclaimMessage.value = null
  try {
    const result = await reclaimBulkPayoutResidual(batchId, true)
    const successMsg = result.reclaimed_cents > 0
      ? `Reclaimed KES ${formatMoney(result.reclaimed_cents)} back to the funding wallet.`
      : 'Nothing left to reclaim.'
    reclaimMessage.value = successMsg
    showSuccess(successMsg)
    batchDetail.value = await fetchBulkPayoutBatch(batchId, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    reclaimMessage.value = msg
    showError(msg)
  } finally {
    reclaiming.value = false
  }
}

function itemStatusVariant(item: BulkPayoutItem): 'success' | 'warning' | 'error' | 'neutral' {
  if (item.status === 'REJECTED') return 'error'
  if (item.status === 'PENDING') return 'neutral'
  if (item.payout_status === 'completed' || item.payout_status === 'COMPLETED') return 'success'
  if (item.payout_status === 'failed' || item.payout_status === 'FAILED') return 'error'
  return 'warning'
}
function itemStatusLabel(item: BulkPayoutItem): string {
  if (item.status === 'REJECTED') return `Rejected: ${item.rejection_reason ?? 'unknown reason'}`
  if (item.status === 'PENDING') return 'Queued for dispatch'
  return item.payout_status ? `Payout: ${item.payout_status}` : 'Dispatched'
}

const selectedItem = ref<BulkPayoutItem | null>(null)
const allTags = ref<OrgTag[]>([])
const assignedTags = ref<OrgTag[]>([])
const tagToAssign = ref('')
const assigningTag = ref(false)

async function openItemTags(item: BulkPayoutItem) {
  if (!item.payout_id) return
  selectedItem.value = item
  tagToAssign.value = ''
  try {
    const [tags, assigned] = await Promise.all([
      allTags.value.length ? Promise.resolve(allTags.value) : fetchTags(true),
      fetchTagsForSubject('payout', item.payout_id, true),
    ])
    allTags.value = tags
    assignedTags.value = assigned
  } catch {
    assignedTags.value = []
  }
}

async function handleAssignTag() {
  if (!tagToAssign.value || !selectedItem.value?.payout_id) return
  assigningTag.value = true
  try {
    await assignTag(tagToAssign.value, 'payout', selectedItem.value.payout_id, true)
    assignedTags.value = await fetchTagsForSubject('payout', selectedItem.value.payout_id, true)
    tagToAssign.value = ''
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    assigningTag.value = false
  }
}

async function handleUnassignTag(tag: OrgTag) {
  if (!selectedItem.value?.payout_id) return
  try {
    await unassignTag(tag.id, 'payout', selectedItem.value.payout_id, true)
    assignedTags.value = assignedTags.value.filter((t) => t.id !== tag.id)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const availableTagsToAssign = () => allTags.value.filter((t) => !assignedTags.value.some((a) => a.id === t.id))
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Bulk payouts">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Payroll & supplier runs</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Paste a payee list — the full batch amount is escrowed immediately from this branch's own MAIN wallet,
            then each payee is paid out independently.
          </p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New batch
        </AppButton>
      </div>

      <AppCard v-if="otpStep">
        <h3 class="text-sm font-bold text-text-primary mb-1">Enter confirmation code</h3>
        <p class="text-xs text-text-muted mb-4">
          We sent a 6-digit code by SMS to confirm this batch. Enter it below to escrow the funds and dispatch the batch.
        </p>
        <div v-if="otpError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ otpError }}</div>
        <form class="flex flex-col gap-4 max-w-xs" @submit.prevent="submitOtp">
          <AppInput v-model="otp" label="6-digit code" placeholder="000000" maxlength="6" required autofocus />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="otpConfirming" class="self-start">Confirm batch</AppButton>
            <AppButton type="button" variant="secondary" :disabled="otpConfirming" class="self-start" @click="cancelOtp">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard v-else-if="showCreateForm" padding="none">
        <div class="px-5 pt-5">
          <h3 class="text-sm font-bold text-text-primary mb-1">New bulk payout batch</h3>
          <p class="text-xs text-text-muted mb-4">
            Add one row per payee. Choose M-Pesa, paybill, till, or bank per row.
          </p>
          <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ submitError }}</div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-y border-border">
                <th class="px-3 py-2 w-10">#</th>
                <th class="px-3 py-2">Via</th>
                <th class="px-3 py-2">Recipient name</th>
                <th class="px-3 py-2">Destination</th>
                <th class="px-3 py-2 w-32">Amount (KES)</th>
                <th class="px-3 py-2">Reason</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.key" class="border-b border-border last:border-0 align-top">
                <td class="px-3 py-2.5 text-text-muted">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 min-w-27.5">
                  <AppSelect v-model="r.destination_type" :options="destinationOptions" />
                </td>
                <td class="px-3 py-2.5 min-w-40">
                  <AppInput v-model="r.recipient_name" placeholder="Jane Wanjiku" />
                </td>
                <td class="px-3 py-2.5 min-w-55">
                  <div v-if="r.destination_type === 'PHONE_NUMBER'" class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppInput v-model="r.phone_number" placeholder="+254712345678" />
                      <AppButton type="button" size="sm" variant="secondary" :loading="r.verifying" @click="verifyRowRecipient(r)">Verify</AppButton>
                    </div>
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
                      {{ r.verifyResult.message }}
                    </div>
                  </div>
                  <div v-else-if="r.destination_type === 'PAYBILL' || r.destination_type === 'TILL_NUMBER'" class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppInput v-model="r.shortcode" :placeholder="r.destination_type === 'PAYBILL' ? 'Paybill no.' : 'Till no.'" />
                      <AppButton type="button" size="sm" variant="secondary" :loading="r.verifying" @click="verifyRowShortcode(r)">Verify</AppButton>
                    </div>
                    <AppInput v-if="r.destination_type === 'PAYBILL'" v-model="r.account_reference" placeholder="Account ref (optional)" />
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
                      {{ r.verifyResult.message }}
                    </div>
                  </div>
                  <div v-else class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppSelect v-model="r.bank_code" placeholder="Bank" :options="bankOptions" class="min-w-35" />
                      <AppInput v-model="r.bank_account_number" placeholder="Account no." />
                    </div>
                    <AppButton type="button" size="sm" variant="secondary" class="self-start" :loading="r.verifying" @click="verifyRowRecipient(r)">Verify</AppButton>
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">
                      {{ r.verifyResult.message }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2.5 min-w-27.5">
                  <AppInput v-model="r.amount_kes" type="number" placeholder="0" />
                </td>
                <td class="px-3 py-2.5 min-w-40">
                  <AppInput v-model="r.remarks" placeholder="Optional" />
                </td>
                <td class="px-3 py-2.5">
                  <button
                    type="button" class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors"
                    :disabled="rows.length <= 1" @click="removeRow(r.key)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-5 pb-5 pt-4 flex flex-col gap-4">
          <AppButton type="button" size="sm" variant="secondary" class="self-start" @click="addRow">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Add payee
          </AppButton>

          <p class="text-xs text-text-muted">
            {{ filledRowCount }} payee(s) filled in — total KES {{ formatMoney(totalPreview) }}.
            Payout fees are calculated per payee and reserved on top of this total when you submit — the exact
            reserved amount (including fees) is shown after submission.
          </p>

          <AppInput v-model="remarks" label="Batch remarks (optional)" placeholder="e.g. October commission run" />

          <AppInput v-model="password" type="password" label="Account password" required />

          <div class="flex gap-2">
            <AppButton type="button" :loading="submitting" @click="submitBatch">Escrow & submit batch</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </div>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading batches…</p>
      <AppCard v-else-if="!batches.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <p class="text-sm font-semibold text-text-primary">No bulk payout batches yet</p>
          <p class="text-xs text-text-muted">Submit a payee list above to run your first batch.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-3">
        <AppCard v-for="b in batches" :key="b.id" padding="none">
          <button
            type="button" class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
            @click="toggleExpand(b.id)"
          >
            <span class="text-sm font-semibold text-text-primary flex-1">
              {{ b.item_count }} payees — KES {{ formatMoney(b.total_amount_cents) }}
              <span class="font-normal text-text-muted">(+ KES {{ formatMoney(b.total_fee_reserve_cents) }} fees)</span>
            </span>
            <AppBadge :variant="b.status === 'DISPATCHED' ? 'success' : 'warning'" size="sm">{{ b.status }}</AppBadge>
            <span class="text-xs text-text-muted">{{ formatDate(b.created_at) }}</span>
            <ChevronUpIcon v-if="expandedBatchId === b.id" class="w-4 h-4 text-text-muted" />
            <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
          </button>

          <div v-if="expandedBatchId === b.id" class="border-t border-border px-5 py-5">
            <p v-if="detailLoading" class="text-sm text-text-muted">Loading…</p>
            <template v-else-if="batchDetail">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs text-text-muted">
                  Dispatched {{ batchDetail.batch.dispatched_count }} · Rejected {{ batchDetail.batch.rejected_count }}
                  · Escrow balance KES {{ formatMoney(batchDetail.escrow_balance_cents) }}
                </p>
                <AppButton v-if="batchDetail.escrow_balance_cents > 0" size="sm" variant="secondary" :loading="reclaiming" @click="handleReclaim(b.id)">
                  Reclaim residual
                </AppButton>
              </div>
              <div v-if="reclaimMessage" class="text-xs text-text-secondary bg-surface-2 rounded-lg px-3 py-2 mb-3">{{ reclaimMessage }}</div>
              <div class="flex flex-col gap-2">
                <div v-for="it in batchDetail.items" :key="it.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-text-primary truncate">{{ it.row_number }}. {{ it.recipient_name }} — KES {{ formatMoney(it.amount_cents) }}</p>
                    <p class="text-xs text-text-muted">{{ itemStatusLabel(it) }}</p>
                  </div>
                  <button
                    v-if="it.payout_id" type="button"
                    class="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
                    title="Tag this payout" @click="openItemTags(it)"
                  ><TagIcon class="w-4 h-4" /></button>
                  <AppBadge :variant="itemStatusVariant(it)" size="sm">{{ it.status }}</AppBadge>
                </div>
              </div>
            </template>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!selectedItem" title="Tag payout" size="sm" @update:model-value="selectedItem = null">
      <div v-if="selectedItem" class="flex flex-col gap-3 p-6">
        <p class="text-sm font-semibold text-text-primary">{{ selectedItem.recipient_name }} — KES {{ formatMoney(selectedItem.amount_cents) }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span v-if="!assignedTags.length" class="text-xs text-text-muted">No tags yet</span>
          <span
            v-for="tag in assignedTags" :key="tag.id"
            class="flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-xs font-semibold"
            :style="{ backgroundColor: (tag.color || '#9CA3AF') + '22', color: tag.color || '#6B7280' }"
          >
            {{ tag.name }}
            <button type="button" class="hover:opacity-70" @click="handleUnassignTag(tag)">✕</button>
          </span>
        </div>
        <div v-if="availableTagsToAssign().length" class="flex items-center gap-2">
          <select v-model="tagToAssign" class="h-8 flex-1 rounded-lg border border-input-border bg-input-bg px-2 text-xs">
            <option value="" disabled>Add a tag…</option>
            <option v-for="tag in availableTagsToAssign()" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
          <AppButton size="sm" variant="ghost" :loading="assigningTag" :disabled="!tagToAssign" @click="handleAssignTag">Add</AppButton>
        </div>
        <p v-else-if="!allTags.length" class="text-xs text-text-muted">
          No tags exist yet — create one on the <RouterLink :to="{ name: 'branch-tags', params: { orgId: props.orgId, branchId: props.branchId } }" class="text-primary underline">Tags page</RouterLink> first.
        </p>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
