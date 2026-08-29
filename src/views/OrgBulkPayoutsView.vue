<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchOrgVaults, fetchOrgBankCodes, createBulkPayoutBatch, confirmBulkPayoutBatch, fetchBulkPayoutBatches,
  validateOrgShortcode, validateOrgBankAccount, validateOrgMobileMoney,
  type OrgVault, type BankCode, type BulkPayoutBatch,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, TrashIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError, showSuccess } = useResponseModal()
const props = defineProps<{ orgId: string }>()
const router = useRouter()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'

const loading = ref(true)
const batches = ref<BulkPayoutBatch[]>([])
const vaults = ref<OrgVault[]>([])
const bankOptions = ref<{ value: string; label: string }[]>([])

async function load() {
  loading.value = true
  try {
    const [b, v] = await Promise.all([fetchBulkPayoutBatches(), fetchOrgVaults()])
    batches.value = b
    vaults.value = v
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
async function loadBankCodes() {
  try {
    const codes: BankCode[] = await fetchOrgBankCodes(false)
    bankOptions.value = codes.map((c) => ({ value: c.code, label: c.name }))
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}
onMounted(() => { load(); loadBankCodes() })

function openDetail(id: string) {
  router.push({ name: 'org-bulk-payout-detail', params: { orgId: props.orgId, batchId: id } })
}

const summary = computed(() => ({
  batches: batches.value.length,
  dispatched: batches.value.reduce((s, b) => s + b.dispatched_count, 0),
  value: batches.value.reduce((s, b) => s + b.total_amount_cents, 0),
}))

const showCreateForm = ref(false)
const remarks = ref('')
const pin = ref('')
const fundingSource = ref<'MAIN' | 'VAULT'>('MAIN')
const vaultId = ref('')
const fundingSourceOptions = computed(() => [
  { value: 'MAIN', label: 'Organization MAIN wallet' },
  ...vaults.value.map((v) => ({ value: `VAULT:${v.id}`, label: `Vault — ${v.name} (KES ${formatMoney(v.balance_cents)})` })),
])
const fundingSourceCombined = computed({
  get: () => (fundingSource.value === 'VAULT' ? `VAULT:${vaultId.value}` : 'MAIN'),
  set: (v: string) => {
    if (v === 'MAIN') { fundingSource.value = 'MAIN'; vaultId.value = '' }
    else { fundingSource.value = 'VAULT'; vaultId.value = v.replace('VAULT:', '') }
  },
})

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
    key: nextRowKey++, destination_type: 'PHONE_NUMBER', amount_kes: '', recipient_name: '',
    phone_number: '', shortcode: '', account_reference: '', bank_code: '', bank_account_number: '',
    remarks: '', verifying: false, verifyResult: null,
  }
}

async function verifyRowShortcode(r: EditableRow) {
  r.verifyResult = null
  if (!r.shortcode.trim()) { r.verifyResult = { ok: false, message: `Enter a ${r.destination_type === 'PAYBILL' ? 'paybill' : 'till'} number first.` }; return }
  r.verifying = true
  try {
    const result = await validateOrgShortcode(false, r.shortcode.trim(), r.destination_type === 'PAYBILL' ? 'paybill' : 'till')
    r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
    if (!r.recipient_name.trim()) r.recipient_name = result.account_name
  } catch (err) {
    r.verifyResult = { ok: false, message: extractErrorMessage(err) }
  } finally { r.verifying = false }
}

async function verifyRowRecipient(r: EditableRow) {
  r.verifyResult = null
  r.verifying = true
  try {
    if (r.destination_type === 'BANK_ACCOUNT') {
      if (!r.bank_account_number.trim() || !r.bank_code) { r.verifyResult = { ok: false, message: 'Enter a bank and account number first.' }; return }
      const result = await validateOrgBankAccount(r.bank_account_number.trim(), r.bank_code)
      r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!r.recipient_name.trim()) r.recipient_name = result.account_name
    } else {
      if (!r.phone_number.trim()) { r.verifyResult = { ok: false, message: 'Enter a phone number first.' }; return }
      const result = await validateOrgMobileMoney(r.phone_number.trim())
      r.verifyResult = { ok: true, message: `Account holder: ${result.account_name}` }
      if (!r.recipient_name.trim()) r.recipient_name = result.account_name
    }
  } catch (err) {
    r.verifyResult = { ok: false, message: extractErrorMessage(err) }
  } finally { r.verifying = false }
}

const rows = ref<EditableRow[]>([blankRow(), blankRow()])
function addRow() { rows.value.push(blankRow()) }
function removeRow(key: number) { rows.value = rows.value.filter((r) => r.key !== key) }
function resetRows() { nextRowKey = 1; rows.value = [blankRow(), blankRow()] }

const csvError = ref<string | null>(null)
const CSV_HEADERS = ['destination_type', 'amount_kes', 'recipient_name', 'phone_number', 'shortcode', 'account_reference', 'bank_code', 'bank_account_number', 'remarks']

function csvTemplate() {
  const sample = [
    'PHONE_NUMBER,1000,Jane Wanjiru,0712345678,,,,,June wages',
    'BANK_ACCOUNT,25000,Acme Ltd,,,,01,0123456789,Invoice 42',
    'PAYBILL,5000,KPLC,,888880,123456,,,Electricity',
  ]
  const blob = new Blob([CSV_HEADERS.join(',') + '\n' + sample.join('\n') + '\n'], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bulk-payout-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}
function importCsv(e: Event) {
  csvError.value = null
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = String(reader.result || '').replace(/\r\n/g, '\n').trim()
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) { csvError.value = 'CSV has no data rows.'; return }
      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
      const idx = (name: string) => header.indexOf(name)
      if (idx('amount_kes') === -1 || idx('recipient_name') === -1) {
        csvError.value = 'CSV must include at least amount_kes and recipient_name columns. Use the template.'
        return
      }
      const imported: EditableRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i])
        const get = (name: string) => { const j = idx(name); return j === -1 ? '' : (cells[j] ?? '') }
        const dt = (get('destination_type') || 'PHONE_NUMBER').toUpperCase()
        const row = blankRow()
        row.destination_type = (['PHONE_NUMBER', 'BANK_ACCOUNT', 'PAYBILL', 'TILL_NUMBER'].includes(dt) ? dt : 'PHONE_NUMBER') as EditableRow['destination_type']
        row.amount_kes = get('amount_kes')
        row.recipient_name = get('recipient_name')
        row.phone_number = get('phone_number')
        row.shortcode = get('shortcode')
        row.account_reference = get('account_reference')
        row.bank_code = get('bank_code')
        row.bank_account_number = get('bank_account_number')
        row.remarks = get('remarks')
        imported.push(row)
      }
      if (!imported.length) { csvError.value = 'No rows found.'; return }
      const existingFilled = rows.value.filter((r) => r.recipient_name.trim() || r.amount_kes)
      rows.value = [...existingFilled, ...imported]
    } catch {
      csvError.value = 'Could not read that CSV file.'
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
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

async function submitBatch() {
  submitError.value = null
  const items = []
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    const isBlank = !r.recipient_name.trim() && !r.amount_kes && !r.phone_number && !r.bank_account_number
    if (isBlank) continue
    const amountCents = Math.round(Number(r.amount_kes) * 100)
    if (!amountCents || amountCents < 100) { submitError.value = `Row ${i + 1}: enter a valid amount (min KES 1).`; return }
    if (!r.recipient_name.trim()) { submitError.value = `Row ${i + 1}: recipient name is required.`; return }
    const isShortcode = r.destination_type === 'PAYBILL' || r.destination_type === 'TILL_NUMBER'
    if (r.destination_type === 'BANK_ACCOUNT') {
      if (!r.bank_code || !r.bank_account_number.trim()) { submitError.value = `Row ${i + 1}: select a bank and enter the account number.`; return }
    } else if (isShortcode) {
      if (!r.shortcode.trim()) { submitError.value = `Row ${i + 1}: enter the ${r.destination_type === 'PAYBILL' ? 'paybill' : 'till'} number.`; return }
    } else if (!r.phone_number.trim()) { submitError.value = `Row ${i + 1}: enter a phone number.`; return }
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
  if (items.length < 2) { submitError.value = 'A batch needs at least 2 payees — use a single payout for one recipient.'; return }
  if (fundingSource.value === 'VAULT' && !vaultId.value) { submitError.value = 'Select a vault to fund this batch from.'; return }
  if (!/^\d{4}$/.test(pin.value)) { submitError.value = 'Enter your 4-digit transaction PIN to confirm this batch.'; return }

  submitting.value = true
  try {
    const result = await createBulkPayoutBatch({
      funding_source: fundingSource.value,
      vault_id: fundingSource.value === 'VAULT' ? vaultId.value : undefined,
      remarks: remarks.value.trim() || undefined,
      items,
      pin: pin.value,
    })
    pin.value = ''
    if (result.status === 'otp_required') { otp.value = ''; otpError.value = null; otpStep.value = true; return }
    finishCreate(result.data?.item_count ?? result.item_count ?? 0, result.data?.total_amount_cents ?? result.total_amount_cents ?? 0, result.data?.total_fee_reserve_cents ?? result.total_fee_reserve_cents ?? 0)
  } catch (err) {
    submitError.value = extractErrorMessage(err)
    showError(submitError.value)
  } finally {
    submitting.value = false
  }
}

function finishCreate(itemCount: number, totalAmount: number, totalFeeReserve: number) {
  showSuccess(`Batch escrowed: ${itemCount} items, KES ${formatMoney(totalAmount)} + KES ${formatMoney(totalFeeReserve)} fees reserved — dispatching shortly.`)
  resetRows()
  remarks.value = ''
  showCreateForm.value = false
  load()
}

const otpStep = ref(false)
const otp = ref('')
const otpError = ref<string | null>(null)
const otpConfirming = ref(false)

async function submitOtp() {
  otpError.value = null
  if (!/^\d{6}$/.test(otp.value)) { otpError.value = 'Enter the 6-digit code sent to your phone.'; return }
  otpConfirming.value = true
  try {
    const result = await confirmBulkPayoutBatch(otp.value)
    otpStep.value = false
    finishCreate(result.data?.item_count ?? 0, result.data?.total_amount_cents ?? 0, result.data?.total_fee_reserve_cents ?? 0)
  } catch (err) {
    otpError.value = extractErrorMessage(err)
    showError(otpError.value)
  } finally {
    otpConfirming.value = false
  }
}
function cancelOtp() { otpStep.value = false; otp.value = ''; otpError.value = null }
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Bulk payments">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Payroll &amp; supplier runs</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Bulk payments</h1>
          <p class="text-sm text-text-muted mt-0.5">
            The full batch amount is escrowed immediately, then each payee is paid out independently. Owner only.
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
            <template #icon><RefreshCwIcon class="w-4 h-4" /></template>Refresh
          </AppButton>
          <AppButton v-if="isOwner" size="sm" @click="showCreateForm = true">
            <template #icon><PlusIcon class="w-4 h-4" /></template>New batch
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Batches</p><p class="text-lg font-bold text-text-primary mt-1">{{ summary.batches }}</p></AppCard>
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Payees dispatched</p><p class="text-lg font-bold text-text-primary mt-1">{{ summary.dispatched }}</p></AppCard>
        <AppCard><p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total value</p><p class="text-lg font-bold text-text-primary mt-1">KES {{ formatMoney(summary.value) }}</p></AppCard>
      </div>

      <AppCard padding="none">
        <p v-if="loading" class="text-sm text-text-muted px-5 py-10 text-center">Loading batches…</p>
        <div v-else-if="!batches.length" class="flex flex-col items-center text-center gap-2 py-14">
          <p class="text-sm font-semibold text-text-primary">No bulk payout batches yet</p>
          <p class="text-xs text-text-muted">Submit a payee list to run your first batch.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3">Remarks</th>
                <th class="px-5 py-3 text-right">Payees</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3 text-right">Fees reserved</th>
                <th class="px-5 py-3">Progress</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in batches" :key="b.id" class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer" @click="openDetail(b.id)">
                <td class="px-5 py-3 text-text-secondary whitespace-nowrap">{{ formatDate(b.created_at) }}</td>
                <td class="px-5 py-3 text-text-primary">{{ b.remarks || '—' }}</td>
                <td class="px-5 py-3 text-right text-text-secondary">{{ b.item_count }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">KES {{ formatMoney(b.total_amount_cents) }}</td>
                <td class="px-5 py-3 text-right text-text-muted whitespace-nowrap">KES {{ formatMoney(b.total_fee_reserve_cents) }}</td>
                <td class="px-5 py-3 text-text-secondary text-xs">{{ b.dispatched_count }}/{{ b.item_count }} dispatched<span v-if="b.rejected_count"> · {{ b.rejected_count }} rejected</span></td>
                <td class="px-5 py-3">
                  <AppBadge :variant="b.status === 'DISPATCHED' ? 'success' : 'warning'" size="sm">{{ b.status }}</AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="otpStep" title="Confirm batch" size="sm" @update:model-value="(v: boolean) => { if (!v) cancelOtp() }">
      <p class="text-xs text-text-muted mb-4">We sent a 6-digit code by SMS to confirm this batch. Enter it to escrow the funds and dispatch.</p>
      <div v-if="otpError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ otpError }}</div>
      <form class="flex flex-col gap-4" @submit.prevent="submitOtp">
        <AppInput v-model="otp" label="6-digit code" placeholder="000000" maxlength="6" required autofocus />
        <div class="flex gap-2">
          <AppButton type="submit" :loading="otpConfirming">Confirm batch</AppButton>
          <AppButton type="button" variant="ghost" :disabled="otpConfirming" @click="cancelOtp">Cancel</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-model="showCreateForm" title="New bulk payout batch" size="full">
      <div class="flex flex-col gap-4">
        <p class="text-xs text-text-muted">
          Add one row per payee — choose M-Pesa, Paybill, Till or Bank per row. Use "Import CSV" for large runs.
        </p>
        <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ submitError }}</div>
        <AppSelect v-model="fundingSourceCombined" label="Funded from" :options="fundingSourceOptions" class="max-w-sm" />

        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border bg-surface-2/40">
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
                <td class="px-3 py-2.5 min-w-27.5"><AppSelect v-model="r.destination_type" :options="destinationOptions" /></td>
                <td class="px-3 py-2.5 min-w-40"><AppInput v-model="r.recipient_name" placeholder="Jane Wanjiku" /></td>
                <td class="px-3 py-2.5 min-w-55">
                  <div v-if="r.destination_type === 'PHONE_NUMBER'" class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppInput v-model="r.phone_number" placeholder="+254712345678" />
                      <AppButton type="button" size="sm" variant="secondary" :loading="r.verifying" @click="verifyRowRecipient(r)">Verify</AppButton>
                    </div>
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">{{ r.verifyResult.message }}</div>
                  </div>
                  <div v-else-if="r.destination_type === 'PAYBILL' || r.destination_type === 'TILL_NUMBER'" class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppInput v-model="r.shortcode" :placeholder="r.destination_type === 'PAYBILL' ? 'Paybill no.' : 'Till no.'" />
                      <AppButton type="button" size="sm" variant="secondary" :loading="r.verifying" @click="verifyRowShortcode(r)">Verify</AppButton>
                    </div>
                    <AppInput v-if="r.destination_type === 'PAYBILL'" v-model="r.account_reference" placeholder="Account ref (optional)" />
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">{{ r.verifyResult.message }}</div>
                  </div>
                  <div v-else class="flex flex-col gap-1.5">
                    <div class="flex gap-2">
                      <AppSelect v-model="r.bank_code" placeholder="Bank" :options="bankOptions" class="min-w-35" />
                      <AppInput v-model="r.bank_account_number" placeholder="Account no." />
                    </div>
                    <AppButton type="button" size="sm" variant="secondary" class="self-start" :loading="r.verifying" @click="verifyRowRecipient(r)">Verify</AppButton>
                    <div v-if="r.verifyResult" :class="['text-xs rounded-lg px-2 py-1', r.verifyResult.ok ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text']">{{ r.verifyResult.message }}</div>
                  </div>
                </td>
                <td class="px-3 py-2.5 min-w-27.5"><AppInput v-model="r.amount_kes" type="number" placeholder="0" /></td>
                <td class="px-3 py-2.5 min-w-40"><AppInput v-model="r.remarks" placeholder="Optional" /></td>
                <td class="px-3 py-2.5">
                  <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors" :disabled="rows.length <= 1" @click="removeRow(r.key)">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton type="button" size="sm" variant="secondary" @click="addRow">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Add payee
          </AppButton>
          <label class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-primary border border-primary/40 cursor-pointer hover:bg-primary/5">
            Import CSV
            <input type="file" accept=".csv,text/csv" class="hidden" @change="importCsv" />
          </label>
          <button type="button" class="text-xs font-semibold text-text-muted hover:text-primary" @click="csvTemplate">Download template</button>
        </div>
        <p v-if="csvError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ csvError }}</p>

        <p class="text-xs text-text-muted">
          {{ filledRowCount }} payee(s) filled — total KES {{ formatMoney(totalPreview) }}. Payout fees are calculated per payee and reserved on top when you submit.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppInput v-model="remarks" label="Batch remarks (optional)" placeholder="e.g. October commission run" />
          <AppInput v-model="pin" type="password" inputmode="numeric" maxlength="4" label="Transaction PIN" placeholder="••••" required />
        </div>

        <div class="flex gap-2">
          <AppButton type="button" :loading="submitting" @click="submitBatch">Escrow &amp; submit batch</AppButton>
          <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
