<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchCollectionInstructions, requestStkPush,
  type CollectionInstructions,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { SmartphoneIcon, LandmarkIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'


const props = defineProps<{ orgId: string; branchId: string }>()
const { showError, showSuccess } = useResponseModal()

const error = ref<string | null>(null)
const instructions = ref<CollectionInstructions | null>(null)
const instructionsLoading = ref(true)
const copiedField = ref<string | null>(null)

async function loadInstructions() {
  instructionsLoading.value = true
  try {
    instructions.value = await fetchCollectionInstructions(true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
    instructions.value = null
  } finally {
    instructionsLoading.value = false
  }
}

async function copy(field: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copiedField.value = field
    setTimeout(() => { if (copiedField.value === field) copiedField.value = null }, 1500)
  } catch {
    console.log('Failed to copy')
  }
}

onMounted(loadInstructions)

const stkAmountKes = ref('')
const stkPhone = ref('')
const stkRemarks = ref('')
const stkSending = ref(false)
const stkError = ref<string | null>(null)
const stkResult = ref<string | null>(null)

async function sendStkPush() {
  stkError.value = null
  stkResult.value = null
  const amountCents = Math.round(Number(stkAmountKes.value) * 100)
  if (!amountCents || amountCents < 1000 || !stkPhone.value.trim()) {
    stkError.value = 'A valid amount (min KES 10) and customer phone number are required.'
    return
  }
  stkSending.value = true
  try {
    const result = await requestStkPush(true, {
      amount_cents: amountCents,
      customer_phone: stkPhone.value.trim(),
      remarks: stkRemarks.value.trim() || undefined,
    })
    const msg = result.customer_message || 'STK push sent — ask the customer to check their phone and enter their M-Pesa PIN.'
    stkResult.value = msg
    showSuccess(msg)
    stkAmountKes.value = ''
    stkPhone.value = ''
    stkRemarks.value = ''
  } catch (err) {
    const errMsg = extractErrorMessage(err)
    stkError.value = errMsg
    showError(errMsg)
  } finally {
    stkSending.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Collect payments">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted">Payments collected here credit this branch's own wallet.</p>

      <!-- STK push -->
      <AppCard>
        <div class="flex items-center gap-2 mb-1">
          <SmartphoneIcon class="w-4 h-4 text-primary" />
          <h2 class="text-sm font-bold text-text-primary">Send an STK push</h2>
        </div>
        <p class="text-xs text-text-muted mb-5">Prompts the customer's phone to enter their M-Pesa PIN and pay instantly.</p>
        <form class="flex flex-col gap-4" @submit.prevent="sendStkPush">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="stkAmountKes" type="number" label="Amount (KES)" placeholder="Min 10" required />
            <AppInput v-model="stkPhone" label="Customer phone" placeholder="+254712345678" required />
          </div>
          <AppInput v-model="stkRemarks" label="Remarks (optional)" placeholder="What this payment is for" />
          <AppButton type="submit" :loading="stkSending" class="self-start">Send STK push</AppButton>
        </form>
      </AppCard>

      <!-- Static collection instructions -->
      <AppCard v-if="instructionsLoading">
        <p class="text-sm text-text-muted">Loading collection instructions…</p>
      </AppCard>

      <template v-else-if="instructions">
        <AppCard>
          <div class="flex items-center gap-2 mb-1">
            <SmartphoneIcon class="w-4 h-4 text-primary" />
            <h2 class="text-sm font-bold text-text-primary">M-Pesa Paybill (Lipa na M-Pesa)</h2>
          </div>
          <p class="text-xs text-text-muted mb-5">Give these steps to anyone paying you directly from their M-Pesa menu.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Business number</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.mpesa_paybill }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('paybill', instructions.mpesa_paybill)">
                  <CheckIcon v-if="copiedField === 'paybill'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Account number</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.collection_code }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('mpesa-code', instructions.collection_code)">
                  <CheckIcon v-if="copiedField === 'mpesa-code'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <ol class="flex flex-col gap-2 text-sm text-text-secondary list-decimal list-inside">
            <li>Go to M-Pesa</li>
            <li>Select Lipa na M-Pesa</li>
            <li>Select Paybill</li>
            <li>Enter business number: <span class="font-mono font-semibold text-text-primary">{{ instructions.mpesa_paybill }}</span></li>
            <li>Enter account number: <span class="font-mono font-semibold text-text-primary">{{ instructions.collection_code }}</span></li>
            <li>Enter amount</li>
            <li>Enter your PIN to authorize the transaction</li>
          </ol>
        </AppCard>

        <AppCard>
          <div class="flex items-center gap-2 mb-1">
            <LandmarkIcon class="w-4 h-4 text-primary" />
            <h2 class="text-sm font-bold text-text-primary">KCB Bank transfer</h2>
          </div>
          <p class="text-xs text-text-muted mb-5">For anyone sending funds from a KCB account or via PesaLink.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Account number</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.kcb_account_number }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('kcb-account', instructions.kcb_account_number)">
                  <CheckIcon v-if="copiedField === 'kcb-account'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Payment reason / narration</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.collection_code }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('kcb-code', instructions.collection_code)">
                  <CheckIcon v-if="copiedField === 'kcb-code'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <ol class="flex flex-col gap-2 text-sm text-text-secondary list-decimal list-inside">
            <li>Open your bank app or dial the USSD code</li>
            <li>Select Transfer</li>
            <li>Select PesaLink or Transfer to other banks</li>
            <li>Select KCB</li>
            <li>Enter account number: <span class="font-mono font-semibold text-text-primary">{{ instructions.kcb_account_number }}</span></li>
            <li>On payment reason / narration, enter: <span class="font-mono font-semibold text-text-primary">{{ instructions.collection_code }}</span></li>
            <li>Enter amount</li>
            <li>Enter your PIN to authorize the transaction</li>
          </ol>
        </AppCard>

        <AppCard>
          <div class="flex items-center gap-2 mb-1">
            <LandmarkIcon class="w-4 h-4 text-primary" />
            <h2 class="text-sm font-bold text-text-primary">Stanbic Bank transfer</h2>
          </div>
          <p class="text-xs text-text-muted mb-5">For anyone sending funds from a Stanbic account or another bank via PesaLink.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Account number</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.stanbic_account_number }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('stanbic-account', instructions.stanbic_account_number)">
                  <CheckIcon v-if="copiedField === 'stanbic-account'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="rounded-xl bg-surface-2 p-4">
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Payment reason / narration</p>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-lg font-bold text-text-primary">{{ instructions.collection_code }}</span>
                <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" @click="copy('stanbic-code', instructions.collection_code)">
                  <CheckIcon v-if="copiedField === 'stanbic-code'" class="w-4 h-4 text-success" />
                  <CopyIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <ol class="flex flex-col gap-2 text-sm text-text-secondary list-decimal list-inside">
            <li>Open your bank app or dial the USSD code</li>
            <li>Select Transfer</li>
            <li>Select PesaLink or Transfer to other banks</li>
            <li>Select Stanbic Bank</li>
            <li>Enter account number: <span class="font-mono font-semibold text-text-primary">{{ instructions.stanbic_account_number }}</span></li>
            <li>On payment reason / narration, enter: <span class="font-mono font-semibold text-text-primary">{{ instructions.collection_code }}</span></li>
            <li>Enter amount</li>
            <li>Enter your PIN to authorize the transaction</li>
          </ol>
        </AppCard>
      </template>
    </div>
  </DashboardLayout>
</template>
