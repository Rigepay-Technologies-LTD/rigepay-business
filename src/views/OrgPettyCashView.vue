<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  createPettyCashFloat, fetchPettyCashFloats, fundPettyCashFloat, recordPettyCashDraw, fetchPettyCashHistory,
  fetchOrgBranches,
  type PettyCashFloat, type PettyCashDraw, type BranchSummary,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, WalletIcon, HistoryIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'

const loading = ref(true)
const error = ref<string | null>(null)
const floats = ref<PettyCashFloat[]>([])
const branches = ref<BranchSummary[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const [f, b] = await Promise.all([fetchPettyCashFloats(), fetchOrgBranches()])
    floats.value = f
    branches.value = b.branches
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function branchName(branchId?: string | null): string {
  if (!branchId) return 'Organization'
  return branches.value.find((b) => b.id === branchId)?.name ?? 'Branch'
}

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newFloatName = ref('')
const newFloatBranchId = ref('')
const branchOptions = () => [
  { value: '', label: 'Organization (no branch)' },
  ...branches.value.map((b) => ({ value: b.id, label: b.name })),
]

async function submitCreate() {
  createError.value = null
  if (!newFloatName.value.trim()) {
    createError.value = 'Name is required.'
    return
  }
  creating.value = true
  try {
    await createPettyCashFloat(newFloatName.value.trim(), newFloatBranchId.value || undefined)
    newFloatName.value = ''
    newFloatBranchId.value = ''
    showCreateForm.value = false
    await load()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const fundingFloat = ref<PettyCashFloat | null>(null)
const fundAmountKes = ref('')
const fundPassword = ref('')
const fundPin = ref('')
const funding = ref(false)
const fundError = ref<string | null>(null)

function openFund(float: PettyCashFloat) {
  fundingFloat.value = float
  fundAmountKes.value = ''
  fundPassword.value = ''
  fundPin.value = ''
  fundError.value = null
}

async function submitFund() {
  fundError.value = null
  const amountCents = Math.round(Number(fundAmountKes.value) * 100)
  if (!amountCents || amountCents < 100 || !fundingFloat.value) {
    fundError.value = 'Enter a valid amount (min KES 1).'
    return
  }
  if (isOwner && !/^\d{4}$/.test(fundPin.value)) {
    fundError.value = 'Enter your 4-digit transaction PIN.'
    return
  }
  if (!isOwner && !fundPassword.value) {
    fundError.value = 'Re-enter your account password.'
    return
  }
  funding.value = true
  try {
    await fundPettyCashFloat(fundingFloat.value.id, amountCents, isOwner ? { pin: fundPin.value } : { password: fundPassword.value })
    fundingFloat.value = null
    await load()
  } catch (err) {
    fundError.value = extractErrorMessage(err)
  } finally {
    funding.value = false
  }
}

const historyFloat = ref<PettyCashFloat | null>(null)
const history = ref<PettyCashDraw[]>([])
const historyLoading = ref(false)

const showDrawForm = ref(false)
const drawing = ref(false)
const drawError = ref<string | null>(null)
const drawAmountKes = ref('')
const drawPayee = ref('')
const drawCategory = ref('')
const drawNotes = ref('')

async function openHistory(float: PettyCashFloat) {
  historyFloat.value = float
  showDrawForm.value = false
  historyLoading.value = true
  try {
    history.value = await fetchPettyCashHistory(float.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    historyLoading.value = false
  }
}

async function submitDraw() {
  drawError.value = null
  const amountCents = Math.round(Number(drawAmountKes.value) * 100)
  if (!amountCents || amountCents < 1 || !drawPayee.value.trim() || !historyFloat.value) {
    drawError.value = 'Amount and payee are required.'
    return
  }
  drawing.value = true
  try {
    await recordPettyCashDraw(historyFloat.value.id, {
      amount: amountCents,
      payee: drawPayee.value.trim(),
      category: drawCategory.value.trim() || undefined,
      notes: drawNotes.value.trim() || undefined,
    })
    drawAmountKes.value = ''
    drawPayee.value = ''
    drawCategory.value = ''
    drawNotes.value = ''
    showDrawForm.value = false
    history.value = await fetchPettyCashHistory(historyFloat.value.id)
    await load()
  } catch (err) {
    drawError.value = extractErrorMessage(err)
  } finally {
    drawing.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Petty cash">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Petty cash</h2>
          <p class="text-xs text-text-muted mt-0.5">A real tracked cash float, funded from MAIN and drawn down as it's spent.</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New float
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New petty cash float</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="submitCreate">
          <AppInput v-model="newFloatName" label="Name" placeholder="e.g. Front Desk Float" required />
          <AppSelect v-model="newFloatBranchId" label="Owner" :options="branchOptions()" />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create float</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading floats…</p>
      <AppCard v-else-if="!floats.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <WalletIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No petty cash floats yet</p>
          <p class="text-xs text-text-muted">Create one to start tracking small cash spend.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="f in floats" :key="f.id" padding="none">
          <div class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text-primary truncate">{{ f.name }} — KES {{ formatMoney(f.balance_cents) }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ branchName(f.branch_id) }} · created {{ formatDate(f.created_at) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <AppButton size="sm" variant="ghost" @click="openHistory(f)">
                <template #icon><HistoryIcon class="w-3.5 h-3.5" /></template>
                History
              </AppButton>
              <AppButton size="sm" variant="secondary" @click="openFund(f)">Fund</AppButton>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!fundingFloat" title="Fund petty cash float" size="sm" @update:model-value="fundingFloat = null">
      <div v-if="fundingFloat" class="flex flex-col gap-4 p-6">
        <p class="text-sm text-text-muted">
          Moves money from {{ fundingFloat.branch_id ? 'the branch' : 'the organization' }}'s own MAIN wallet into
          <span class="font-semibold text-text-primary">{{ fundingFloat.name }}</span>.
        </p>
        <div v-if="fundError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ fundError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submitFund">
          <AppInput v-model="fundAmountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
          <AppInput v-if="!isOwner" v-model="fundPassword" type="password" label="Confirm your password" required />
          <AppInput v-else v-model="fundPin" type="password" label="Transaction PIN" placeholder="0000" required />
          <AppButton type="submit" :loading="funding" class="self-start">Fund float</AppButton>
        </form>
      </div>
    </AppModal>

    <AppModal :model-value="!!historyFloat" :title="historyFloat ? `${historyFloat.name} — history` : 'History'" size="md" @update:model-value="historyFloat = null">
      <div v-if="historyFloat" class="flex flex-col gap-4 p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text-primary">Balance: KES {{ formatMoney(historyFloat.balance_cents) }}</p>
          <AppButton size="sm" @click="showDrawForm = !showDrawForm">
            <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>
            Record draw
          </AppButton>
        </div>

        <AppCard v-if="showDrawForm">
          <div v-if="drawError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ drawError }}</div>
          <form class="flex flex-col gap-3" @submit.prevent="submitDraw">
            <div class="grid grid-cols-2 gap-3">
              <AppInput v-model="drawAmountKes" type="number" label="Amount (KES)" required />
              <AppInput v-model="drawPayee" label="Payee" placeholder="Who was paid" required />
            </div>
            <AppInput v-model="drawCategory" label="Category (optional)" placeholder="e.g. Supplies" />
            <AppInput v-model="drawNotes" label="Notes (optional)" />
            <AppButton type="submit" size="sm" :loading="drawing" class="self-start">Save draw</AppButton>
          </form>
        </AppCard>

        <p v-if="historyLoading" class="text-sm text-text-muted">Loading…</p>
        <p v-else-if="!history.length" class="text-sm text-text-muted">No draws recorded yet.</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="d in history" :key="d.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-text-primary truncate">{{ d.payee }} — KES {{ formatMoney(d.amount_cents) }}</p>
              <p class="text-xs text-text-muted">{{ d.category || 'Uncategorized' }} · {{ formatDate(d.drawn_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
