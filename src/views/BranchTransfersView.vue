<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  createBranchTransfer, lookupTransferRecipient, requestBranchExternalTransfer, confirmBranchExternalTransfer,
  fetchSiblingBranches, fetchBranchWallets, fetchTransferHistory,
  type SiblingBranch, type TransferRecipientLookup, type WalletBalances, type TransferHistory,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import OtpConfirmCard from '@/components/OtpConfirmCard.vue'
import { ArrowRightIcon, CheckIcon, AlertTriangleIcon, WalletIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError, showSuccess } = useResponseModal()
const props = defineProps<{ orgId: string; branchId: string }>()

const loading = ref(true)
const siblingBranches = ref<SiblingBranch[]>([])
const wallets = ref<WalletBalances | null>(null)
const history = ref<TransferHistory | null>(null)
const historyLoading = ref(false)

async function load() {
  loading.value = true
  try {
    const [sib, w] = await Promise.all([fetchSiblingBranches(), fetchBranchWallets()])
    siblingBranches.value = sib
    wallets.value = w
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
async function loadHistory() {
  historyLoading.value = true
  try {
    history.value = await fetchTransferHistory(true, { page_size: 25 })
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    historyLoading.value = false
  }
}
onMounted(() => { load(); loadHistory() })

const toOptions = computed(() => [
  { value: 'org', label: 'Organization wallet' },
  ...siblingBranches.value.map((b) => ({ value: b.id, label: b.name })),
])

const tab = ref<'internal' | 'external'>('internal')

const toEndpoint = ref('')
const amountKes = ref('')
const remarks = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)

async function submitTransfer() {
  submitError.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !toEndpoint.value) {
    submitError.value = 'Enter a valid amount (min KES 1) and select a destination.'
    return
  }
  if (!confirmPassword.value) { submitError.value = 'Re-enter your account password.'; return }
  submitting.value = true
  try {
    const result = await createBranchTransfer({
      to: toEndpoint.value, amount: amountCents,
      remarks: remarks.value.trim() || undefined, password: confirmPassword.value,
    })
    showSuccess(`Moved KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`)
    amountKes.value = ''; remarks.value = ''; confirmPassword.value = ''
    await Promise.all([load(), loadHistory()])
  } catch (err) {
    submitError.value = extractErrorMessage(err)
    showError(submitError.value)
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
  if (!code) { lookupError.value = 'Enter a collection code first.'; return }
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
  extRecipientCode.value = ''; extAmountKes.value = ''; extRemarks.value = ''; extPassword.value = ''
  lookupResult.value = null; lookupError.value = null
}
async function submitExternalTransfer() {
  extError.value = null
  const amountCents = Math.round(Number(extAmountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !extRecipientCode.value.trim() || !extRemarks.value.trim()) {
    extError.value = 'Amount (min KES 1), recipient collection code, and remarks are required.'
    return
  }
  if (!lookupResult.value || lookupResult.value.collection_code !== extRecipientCode.value.trim()) {
    extError.value = 'Verify the recipient before sending.'
    return
  }
  if (!extPassword.value) { extError.value = 'Re-enter your account password.'; return }
  extSubmitting.value = true
  try {
    const result = await requestBranchExternalTransfer({
      recipient_collection_code: extRecipientCode.value.trim(),
      amount: amountCents, remarks: extRemarks.value.trim(), password: extPassword.value,
    })
    if (result.status === 'otp_required') {
      extOtp.value = ''; extOtpError.value = null; extOtpStep.value = true
    } else {
      showSuccess(`Sent KES ${formatMoney(result.data.amount_cents)} from ${result.data.from} to ${result.data.to}.`)
      resetExternalForm()
      await loadHistory()
    }
  } catch (err) {
    extError.value = extractErrorMessage(err)
    showError(extError.value)
  } finally {
    extSubmitting.value = false
  }
}
async function submitExternalOtp() {
  extOtpError.value = null
  extOtpConfirming.value = true
  try {
    const result = await confirmBranchExternalTransfer(extOtp.value)
    showSuccess(`Sent KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`)
    extOtpStep.value = false
    resetExternalForm()
    await loadHistory()
  } catch (err) {
    extOtpError.value = extractErrorMessage(err)
    showError(extOtpError.value)
  } finally {
    extOtpConfirming.value = false
  }
}
function cancelExternalOtp() { extOtpStep.value = false; extOtp.value = ''; extOtpError.value = null }

function directionMeta(d: string) {
  if (d === 'IN') return { label: 'Received', variant: 'success' as const }
  if (d === 'OUT') return { label: 'Sent', variant: 'warning' as const }
  return { label: 'Internal move', variant: 'neutral' as const }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Transfers">
    <div class="flex flex-col gap-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Treasury</p>
        <h1 class="text-lg font-bold text-text-primary mt-0.5">Transfers</h1>
        <p class="text-sm text-text-muted mt-0.5">
          Move funds to the organization or a sibling branch, or send to another business by collection code.
        </p>
      </div>

      <div v-if="wallets" class="flex gap-3 overflow-x-auto pb-1">
        <div class="shrink-0 min-w-44 rounded-xl border border-border bg-surface px-4 py-3">
          <div class="flex items-center gap-2 text-text-muted">
            <WalletIcon class="w-4 h-4" />
            <span class="text-[11px] font-semibold uppercase tracking-wide">This branch</span>
          </div>
          <p class="text-base font-bold text-text-primary mt-1">KES {{ formatMoney(wallets.main_cents) }}</p>
        </div>
      </div>

      <AppCard>
        <div class="flex gap-2 rounded-xl bg-surface-2 p-1 max-w-md mb-5">
          <button
            type="button"
            :class="['flex-1 text-xs font-semibold rounded-lg py-2 transition-colors', tab === 'internal' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted']"
            @click="tab = 'internal'"
          >Within my organization</button>
          <button
            type="button"
            :class="['flex-1 text-xs font-semibold rounded-lg py-2 transition-colors', tab === 'external' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted']"
            @click="tab = 'external'"
          >To another business</button>
        </div>

        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

        <template v-else-if="tab === 'internal'">
          <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ submitError }}</div>
          <form class="flex flex-col gap-4 max-w-lg" @submit.prevent="submitTransfer">
            <div class="flex items-end gap-3">
              <div class="flex-1 text-xs text-text-muted">
                <span class="block font-semibold text-text-primary mb-1">From</span>
                This branch's own wallet
              </div>
              <ArrowRightIcon class="w-4 h-4 text-text-muted mb-2.5 shrink-0" />
              <AppSelect v-model="toEndpoint" label="To" :options="toOptions" placeholder="Select destination" class="flex-1" />
            </div>
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="remarks" label="Remarks (optional)" placeholder="What this transfer is for" />
            <AppInput v-model="confirmPassword" type="password" label="Confirm your password" required />
            <AppButton type="submit" :loading="submitting" class="self-start">Move funds</AppButton>
          </form>
        </template>

        <template v-else>
          <OtpConfirmCard
            v-if="extOtpStep"
            v-model="extOtp"
            subject="transfer"
            :confirming="extOtpConfirming"
            :error="extOtpError"
            @confirm="submitExternalOtp"
            @cancel="cancelExternalOtp"
          />
          <template v-else>
            <p class="text-xs text-text-muted mb-4">
              Real money leaving your custody — screened and confirmed like any other payout.
            </p>
            <div v-if="extError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ extError }}</div>
            <form class="flex flex-col gap-4 max-w-lg" @submit.prevent="submitExternalTransfer">
              <div class="flex items-end gap-3">
                <AppInput
                  v-model="extRecipientCode" label="Recipient collection code" placeholder="6-digit code"
                  class="flex-1" required @input="lookupResult = null"
                />
                <AppButton type="button" variant="secondary" :loading="lookupLoading" @click="verifyRecipient">Verify</AppButton>
              </div>
              <div v-if="lookupError" class="text-xs rounded-lg px-3 py-2 flex items-center gap-2 bg-error-light text-error-text -mt-2">
                <AlertTriangleIcon class="w-3.5 h-3.5 shrink-0" />{{ lookupError }}
              </div>
              <div v-else-if="lookupResult" class="text-xs rounded-lg px-3 py-2 flex items-center gap-2 bg-success-light text-success-text -mt-2">
                <CheckIcon class="w-3.5 h-3.5 shrink-0" />{{ lookupResult.name }} — {{ lookupResult.type }}
              </div>
              <AppInput v-model="extAmountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
              <AppInput v-model="extRemarks" label="Remarks" placeholder="What this transfer is for" required />
              <AppInput v-model="extPassword" type="password" label="Confirm your password" required />
              <AppButton type="submit" :loading="extSubmitting" class="self-start">Send transfer</AppButton>
            </form>
          </template>
        </template>
      </AppCard>

      <AppCard padding="none">
        <div class="flex items-center justify-between px-5 pt-5">
          <h2 class="text-sm font-bold text-text-primary">Recent transfers</h2>
          <AppButton size="sm" variant="secondary" :loading="historyLoading" @click="loadHistory">
            <template #icon><RefreshCwIcon class="w-4 h-4" /></template>Refresh
          </AppButton>
        </div>
        <p v-if="historyLoading" class="text-sm text-text-muted px-5 py-8">Loading…</p>
        <p v-else-if="!history?.transfers?.length" class="text-sm text-text-muted px-5 py-8">No transfers yet.</p>
        <div v-else class="overflow-x-auto mt-3">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Date</th>
                <th class="px-5 py-3">Details</th>
                <th class="px-5 py-3">Direction</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in history.transfers" :key="t.id" class="border-b border-border last:border-0">
                <td class="px-5 py-3 text-text-secondary whitespace-nowrap">{{ formatDate(t.created_at) }}</td>
                <td class="px-5 py-3 text-text-primary">{{ t.description || (t.type === 'CROSS_ORG_TRANSFER' ? 'Cross-org transfer' : 'Internal transfer') }}</td>
                <td class="px-5 py-3">
                  <AppBadge :variant="directionMeta(t.direction).variant" size="sm">{{ directionMeta(t.direction).label }}</AppBadge>
                </td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">KES {{ formatMoney(t.amount_cents) }}</td>
                <td class="px-5 py-3 text-text-secondary text-xs">{{ t.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
