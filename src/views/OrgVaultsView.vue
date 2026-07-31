<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchOrgVaults, createOrgVault, fundOrgVault, withdrawOrgVault,
  type OrgVault,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { PlusIcon, VaultIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const { showError, showSuccess } = useResponseModal()

const loading = ref(true)
const error = ref<string | null>(null)
const vaults = ref<OrgVault[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    vaults.value = await fetchOrgVaults()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newVaultName = ref('')

async function createVault() {
  createError.value = null
  if (!newVaultName.value.trim()) {
    createError.value = 'Vault name is required.'
    return
  }
  creating.value = true
  try {
    await createOrgVault(newVaultName.value.trim())
    newVaultName.value = ''
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const expandedVaultId = ref<string | null>(null)
const transferDirection = ref<'fund' | 'withdraw'>('fund')
const transferAmount = ref('')
const transferPassword = ref('')
const transferPin = ref('')
const transferring = ref(false)
const transferError = ref<string | null>(null)
const transferSuccess = ref<string | null>(null)

function toggleExpand(vaultId: string) {
  expandedVaultId.value = expandedVaultId.value === vaultId ? null : vaultId
  transferError.value = null
  transferSuccess.value = null
  transferAmount.value = ''
  transferPassword.value = ''
  transferPin.value = ''
}

async function submitTransfer(vaultId: string) {
  transferError.value = null
  transferSuccess.value = null
  const amountCents = Math.round(Number(transferAmount.value) * 100)
  if (!amountCents || amountCents < 100) {
    transferError.value = 'Enter a valid amount (min KES 1).'
    return
  }
  if (!isOwner && !transferPassword.value) {
    transferError.value = 'Re-enter your account password to confirm this transfer.'
    return
  }
  if (isOwner && !/^\d{4}$/.test(transferPin.value)) {
    transferError.value = 'Enter your 4-digit transaction PIN to confirm this transfer.'
    return
  }
  transferring.value = true
  try {
    const input = {
      amount: amountCents,
      password: isOwner ? undefined : transferPassword.value,
      pin: isOwner ? transferPin.value : undefined,
    }
    if (transferDirection.value === 'fund') {
      await fundOrgVault(vaultId, input)
      transferSuccess.value = 'Vault funded successfully.'
    } else {
      await withdrawOrgVault(vaultId, input)
      transferSuccess.value = 'Withdrawal successful.'
    }
    showSuccess(transferSuccess.value)
    transferAmount.value = ''
    transferPassword.value = ''
    transferPin.value = ''
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    transferError.value = msg
    showError(msg)
  } finally {
    transferring.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Vaults">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Vaults</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Custom prefunded sub-wallets. Move money in from your MAIN wallet ahead of a settlement date, then point
            a scheduled payout at a vault instead of MAIN directly.
          </p>
        </div>
        <AppButton v-if="isOwner" size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Create vault
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New vault</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="createVault">
          <AppInput v-model="newVaultName" label="Vault name" placeholder="e.g. December payroll" required />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading vaults…</p>
      <AppCard v-else-if="!vaults.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <VaultIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No vaults yet</p>
          <p class="text-xs text-text-muted">Create one to start ring-fencing funds for upcoming settlements.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-3">
        <AppCard v-for="v in vaults" :key="v.id" padding="none">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
            @click="toggleExpand(v.id)"
          >
            <div class="w-8 h-8 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
              <VaultIcon class="w-4 h-4" />
            </div>
            <span class="text-sm font-semibold text-text-primary flex-1">{{ v.name }}</span>
            <span class="text-sm font-bold text-text-primary">KES {{ formatMoney(v.balance_cents) }}</span>
            <ChevronUpIcon v-if="expandedVaultId === v.id" class="w-4 h-4 text-text-muted" />
            <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
          </button>

          <div v-if="expandedVaultId === v.id" class="border-t border-border px-5 py-5">
            <div class="flex gap-2 rounded-xl bg-surface-2 p-1 mb-4 max-w-xs">
              <button
                type="button"
                :class="['flex-1 text-xs font-semibold rounded-lg py-1.5', transferDirection === 'fund' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted']"
                @click="transferDirection = 'fund'"
              >
                Fund from MAIN
              </button>
              <button
                type="button"
                :class="['flex-1 text-xs font-semibold rounded-lg py-1.5', transferDirection === 'withdraw' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted']"
                @click="transferDirection = 'withdraw'"
              >
                Withdraw to MAIN
              </button>
            </div>

            <div v-if="transferError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ transferError }}</div>

            <form class="flex flex-col gap-3 max-w-sm" @submit.prevent="submitTransfer(v.id)">
              <AppInput v-model="transferAmount" type="number" label="Amount (KES)" placeholder="Min 1" required />
              <AppInput v-if="!isOwner" v-model="transferPassword" type="password" label="Confirm your password" required />
              <AppInput v-else v-model="transferPin" type="password" label="Transaction PIN" placeholder="0000" required />
              <AppButton type="submit" size="sm" :loading="transferring" class="self-start">
                {{ transferDirection === 'fund' ? 'Fund vault' : 'Withdraw to MAIN' }}
              </AppButton>
            </form>

            <p class="text-[11px] text-text-muted mt-3">Created {{ formatDate(v.created_at) }}</p>
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
