<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgBranches, fetchOrgProfile, createOrgTransfer,
  type BranchSummary, type ProfileResponse,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { ArrowRightIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'

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
    error.value = extractErrorMessage(err)
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
const confirmPassword = ref('')
const confirmPin = ref('')
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
  if (!isOwner && !confirmPassword.value) {
    submitError.value = 'Re-enter your account password to confirm this transfer.'
    return
  }
  if (isOwner && !/^\d{4}$/.test(confirmPin.value)) {
    submitError.value = 'Enter your 4-digit transaction PIN to confirm this transfer.'
    return
  }
  submitting.value = true
  try {
    const result = await createOrgTransfer({
      from: fromEndpoint.value,
      to: toEndpoint.value,
      amount: amountCents,
      remarks: remarks.value.trim() || undefined,
      password: isOwner ? undefined : confirmPassword.value,
      pin: isOwner ? confirmPin.value : undefined,
    })
    submitSuccess.value = `Moved KES ${formatMoney(result.amount_cents)} from ${result.from} to ${result.to}.`
    amountKes.value = ''
    remarks.value = ''
    confirmPassword.value = ''
    confirmPin.value = ''
    await load()
  } catch (err) {
    submitError.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Transfers">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Move funds internally</h2>
        <p class="text-xs text-text-muted mb-5">
          Immediate, no external rail — between your organization's own wallet and any branch, or between two
          branches. Reversible only by transferring back.
        </p>

        <p v-if="loading" class="text-sm text-text-muted">Loading wallets…</p>
        <template v-else>
          <div v-if="submitError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ submitError }}</div>
          <div v-if="submitSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ submitSuccess }}</div>

          <form class="flex flex-col gap-4 max-w-md" @submit.prevent="submitTransfer">
            <div class="flex items-end gap-3">
              <AppSelect v-model="fromEndpoint" label="From" :options="endpointOptions" class="flex-1" />
              <ArrowRightIcon class="w-4 h-4 text-text-muted mb-2.5 shrink-0" />
              <AppSelect v-model="toEndpoint" label="To" :options="endpointOptions" placeholder="Select destination" class="flex-1" />
            </div>
            <AppInput v-model="amountKes" type="number" label="Amount (KES)" placeholder="Min 1" required />
            <AppInput v-model="remarks" label="Remarks (optional)" placeholder="What this transfer is for" />
            <AppInput v-if="!isOwner" v-model="confirmPassword" type="password" label="Confirm your password" required />
            <AppInput v-else v-model="confirmPin" type="password" label="Transaction PIN" placeholder="0000" required />
            <AppButton type="submit" :loading="submitting" class="self-start">Move funds</AppButton>
          </form>
        </template>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
