<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import AppModal from '@/components/ui/AppModal.vue'
import {
  PlusIcon, VaultIcon, ArrowDownToLineIcon, ArrowUpFromLineIcon, LayersIcon, WalletIcon,
} from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const { showError, showSuccess } = useResponseModal()

const loading = ref(true)
const vaults = ref<OrgVault[]>([])

const totalVaulted = computed(() => vaults.value.reduce((s, v) => s + v.balance_cents, 0))

async function load() {
  loading.value = true
  try {
    vaults.value = (await fetchOrgVaults()) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newVaultName = ref('')

function openCreate() {
  newVaultName.value = ''
  createError.value = null
  showCreate.value = true
}

async function createVault() {
  createError.value = null
  if (!newVaultName.value.trim()) {
    createError.value = 'Vault name is required.'
    return
  }
  creating.value = true
  try {
    await createOrgVault(newVaultName.value.trim())
    showCreate.value = false
    await load()
    showSuccess('Vault created.')
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const transferVault = ref<OrgVault | null>(null)
const transferDirection = ref<'fund' | 'withdraw'>('fund')
const transferAmount = ref('')
const transferSecret = ref('')
const transferring = ref(false)
const transferError = ref<string | null>(null)

function openTransfer(vault: OrgVault, direction: 'fund' | 'withdraw') {
  transferVault.value = vault
  transferDirection.value = direction
  transferAmount.value = ''
  transferSecret.value = ''
  transferError.value = null
}

async function submitTransfer() {
  if (!transferVault.value) return
  transferError.value = null
  const amountCents = Math.round(Number(transferAmount.value) * 100)
  if (!amountCents || amountCents < 100) {
    transferError.value = 'Enter a valid amount (min KES 1).'
    return
  }
  if (isOwner && !/^\d{4}$/.test(transferSecret.value)) {
    transferError.value = 'Enter your 4-digit transaction PIN to confirm this transfer.'
    return
  }
  if (!isOwner && !transferSecret.value) {
    transferError.value = 'Re-enter your account password to confirm this transfer.'
    return
  }
  transferring.value = true
  try {
    const input = {
      amount: amountCents,
      password: isOwner ? undefined : transferSecret.value,
      pin: isOwner ? transferSecret.value : undefined,
    }
    if (transferDirection.value === 'fund') {
      await fundOrgVault(transferVault.value.id, input)
      showSuccess('Vault funded successfully.')
    } else {
      await withdrawOrgVault(transferVault.value.id, input)
      showSuccess('Withdrawal successful.')
    }
    transferVault.value = null
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
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-bold text-text-primary">Vaults</h1>
          <p class="text-sm text-text-muted mt-0.5 max-w-lg">
            Custom prefunded sub-wallets. Move money in from MAIN ahead of a settlement date, then point a
            scheduled payout at a vault instead of MAIN directly.
          </p>
        </div>
        <AppButton v-if="isOwner && vaults.length" size="sm" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Create vault
        </AppButton>
      </div>

      <div v-if="!loading && vaults.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppCard>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
              <WalletIcon class="w-4 h-4" />
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total in vaults</p>
              <p class="text-lg font-bold text-text-primary leading-tight">KES {{ formatMoney(totalVaulted) }}</p>
            </div>
          </div>
        </AppCard>
        <AppCard>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-surface-2 text-text-secondary flex items-center justify-center shrink-0">
              <LayersIcon class="w-4 h-4" />
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Vaults</p>
              <p class="text-lg font-bold text-text-primary leading-tight">{{ vaults.length }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AppCard v-for="i in 3" :key="i">
          <div class="flex flex-col gap-3 animate-pulse">
            <div class="w-8 h-8 rounded-lg bg-surface-2" />
            <div class="h-3 w-2/3 rounded bg-surface-2" />
            <div class="h-5 w-1/2 rounded bg-surface-2" />
          </div>
        </AppCard>
      </div>

      <AppCard v-else-if="!vaults.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-3 py-8">
          <div class="w-12 h-12 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
            <VaultIcon class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm font-semibold text-text-primary">No vaults yet</p>
            <p class="text-xs text-text-muted mt-1 max-w-xs">
              Create one to start ring-fencing funds ahead of an upcoming settlement.
            </p>
          </div>
          <AppButton v-if="isOwner" size="sm" class="mt-1" @click="openCreate">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Create vault
          </AppButton>
        </div>
      </AppCard>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AppCard v-for="v in vaults" :key="v.id" class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
              <VaultIcon class="w-4 h-4" />
            </div>
            <span class="text-sm font-semibold text-text-primary flex-1 truncate">{{ v.name }}</span>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Balance</p>
            <p class="text-xl font-bold text-text-primary leading-tight">
              <span class="text-xs font-semibold text-text-muted align-top mr-1">KES</span>{{ formatMoney(v.balance_cents) }}
            </p>
            <p class="text-[11px] text-text-muted mt-1">Created {{ formatDate(v.created_at) }}</p>
          </div>
          <div v-if="isOwner" class="flex gap-2 pt-1 mt-auto">
            <AppButton size="sm" variant="secondary" class="flex-1" @click="openTransfer(v, 'fund')">
              <template #icon><ArrowDownToLineIcon class="w-3.5 h-3.5" /></template>
              Fund
            </AppButton>
            <AppButton size="sm" variant="ghost" class="flex-1" @click="openTransfer(v, 'withdraw')">
              <template #icon><ArrowUpFromLineIcon class="w-3.5 h-3.5" /></template>
              Withdraw
            </AppButton>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal v-model="showCreate" title="Create vault" size="sm">
      <form class="flex flex-col gap-4" @submit.prevent="createVault">
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</div>
        <AppInput v-model="newVaultName" label="Vault name" placeholder="e.g. December payroll" required />
        <div class="flex gap-2">
          <AppButton type="submit" :loading="creating">Create vault</AppButton>
          <AppButton type="button" variant="ghost" @click="showCreate = false">Cancel</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      :model-value="!!transferVault"
      :title="transferDirection === 'fund' ? 'Fund vault' : 'Withdraw to MAIN'"
      size="sm"
      @update:model-value="(v: boolean) => { if (!v) transferVault = null }"
    >
      <form v-if="transferVault" class="flex flex-col gap-4" @submit.prevent="submitTransfer">
        <div class="rounded-xl bg-surface-2 px-4 py-3">
          <p class="text-sm font-semibold text-text-primary">{{ transferVault.name }}</p>
          <p class="text-xs text-text-muted mt-0.5">Balance: KES {{ formatMoney(transferVault.balance_cents) }}</p>
        </div>

        <div class="flex gap-2 rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            :class="['flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-1.5 transition-colors', transferDirection === 'fund' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted']"
            @click="transferDirection = 'fund'"
          >
            <ArrowDownToLineIcon class="w-3.5 h-3.5" /> Fund from MAIN
          </button>
          <button
            type="button"
            :class="['flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-1.5 transition-colors', transferDirection === 'withdraw' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted']"
            @click="transferDirection = 'withdraw'"
          >
            <ArrowUpFromLineIcon class="w-3.5 h-3.5" /> Withdraw to MAIN
          </button>
        </div>

        <div v-if="transferError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ transferError }}</div>

        <AppInput v-model="transferAmount" type="number" label="Amount (KES)" placeholder="Min 1" required />
        <AppInput
          v-model="transferSecret"
          type="password"
          :label="isOwner ? 'Transaction PIN' : 'Confirm your password'"
          :placeholder="isOwner ? '••••' : ''"
          required
        />
        <div class="flex gap-2">
          <AppButton type="submit" :loading="transferring">
            {{ transferDirection === 'fund' ? 'Fund vault' : 'Withdraw to MAIN' }}
          </AppButton>
          <AppButton type="button" variant="ghost" @click="transferVault = null">Cancel</AppButton>
        </div>
      </form>
    </AppModal>
  </DashboardLayout>
</template>
