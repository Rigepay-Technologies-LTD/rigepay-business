<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchOrgLimits, requestLimitChange, type OrgLimitsSnapshot } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'

const props = defineProps<{ orgId: string }>()
const { showError, showSuccess } = useResponseModal()

const limits = ref<OrgLimitsSnapshot | null>(null)
const limitsLoading = ref(true)
const error = ref<string | null>(null)

async function loadLimits() {
  limitsLoading.value = true
  try {
    limits.value = await fetchOrgLimits()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    limitsLoading.value = false
  }
}
onMounted(loadLimits)

function usagePercent(used: number, cap: number): number {
  if (!cap) return 0
  return Math.min(100, Math.round((used / cap) * 100))
}

const showRequestForm = ref(false)
const requesting = ref(false)
const requestError = ref<string | null>(null)
const requestResult = ref<string | null>(null)
const reqPayoutAmountKes = ref('')
const reqPayoutCount = ref('')
const reqCollectionAmountKes = ref('')
const reqCollectionCount = ref('')
const reason = ref('')

async function submitRequest() {
  requestError.value = null
  requestResult.value = null
  if (!reason.value.trim()) {
    requestError.value = 'Tell us why you need higher limits.'
    return
  }
  if (!reqPayoutAmountKes.value && !reqPayoutCount.value && !reqCollectionAmountKes.value && !reqCollectionCount.value) {
    requestError.value = 'Enter at least one requested limit.'
    return
  }
  requesting.value = true
  try {
    requestResult.value = await requestLimitChange({
      requested_daily_payout_amount_cents: reqPayoutAmountKes.value ? Math.round(Number(reqPayoutAmountKes.value) * 100) : undefined,
      requested_daily_payout_count: reqPayoutCount.value ? Number(reqPayoutCount.value) : undefined,
      requested_daily_collection_amount_cents: reqCollectionAmountKes.value ? Math.round(Number(reqCollectionAmountKes.value) * 100) : undefined,
      requested_daily_collection_count: reqCollectionCount.value ? Number(reqCollectionCount.value) : undefined,
      reason: reason.value.trim(),
    })
    showSuccess(requestResult.value)
    reqPayoutAmountKes.value = ''
    reqPayoutCount.value = ''
    reqCollectionAmountKes.value = ''
    reqCollectionCount.value = ''
    reason.value = ''
    showRequestForm.value = false
  } catch (err) {
    const msg = extractErrorMessage(err)
    requestError.value = msg
    showError(msg)
  } finally {
    requesting.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Daily limits">
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">
        Daily caps on how much can move in and out via payouts and collections, reset every 24h. Running close to a
        cap? Request higher limits below — our operations team reviews every request.
      </p>
      <AppCard>
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-bold text-text-primary">Today's usage</h2>
          <AppButton size="sm" variant="secondary" @click="showRequestForm = !showRequestForm">Request new limits</AppButton>
        </div>
        <p v-if="limits?.using_defaults" class="text-xs text-text-muted mb-5">No custom limits configured — showing platform defaults.</p>
        <p v-else class="text-xs text-text-muted mb-5">Custom limits configured for this organization.</p>
        <p v-if="limitsLoading" class="text-sm text-text-muted">Loading limits…</p>
        <div v-else-if="limits" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Payouts today (combined)</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_payout_amount_used_cents) }} / {{ formatMoney(limits.daily_payout_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-primary" :style="{ width: usagePercent(limits.daily_payout_amount_used_cents, limits.daily_payout_amount_cents) + '%' }" />
            </div>
            <p class="text-xs text-text-muted mt-2">{{ limits.daily_payout_count_used }} / {{ limits.daily_payout_count }} payouts</p>
          </div>
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Collections today (combined)</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_collection_amount_used_cents) }} / {{ formatMoney(limits.daily_collection_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-info" :style="{ width: usagePercent(limits.daily_collection_amount_used_cents, limits.daily_collection_amount_cents) + '%' }" />
            </div>
            <p class="text-xs text-text-muted mt-2">{{ limits.daily_collection_count_used }} / {{ limits.daily_collection_count }} collections</p>
          </div>
        </div>

        <p class="text-xs font-bold text-text-muted uppercase tracking-wider mt-6 mb-3">
          Split by source — org-wallet and branch-wallet activity each have their own headroom against the same cap
        </p>
        <div v-if="limits" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Org wallet — payouts</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_payout_amount_used_cents_org) }} / {{ formatMoney(limits.daily_payout_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-primary" :style="{ width: usagePercent(limits.daily_payout_amount_used_cents_org, limits.daily_payout_amount_cents) + '%' }" />
            </div>
          </div>
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Branches — payouts</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_payout_amount_used_cents_branch) }} / {{ formatMoney(limits.daily_payout_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-primary" :style="{ width: usagePercent(limits.daily_payout_amount_used_cents_branch, limits.daily_payout_amount_cents) + '%' }" />
            </div>
          </div>
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Org wallet — collections</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_collection_amount_used_cents_org) }} / {{ formatMoney(limits.daily_collection_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-info" :style="{ width: usagePercent(limits.daily_collection_amount_used_cents_org, limits.daily_collection_amount_cents) + '%' }" />
            </div>
          </div>
          <div class="rounded-xl bg-surface-2 p-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Branches — collections</p>
            <p class="text-sm font-semibold text-text-primary">
              KES {{ formatMoney(limits.daily_collection_amount_used_cents_branch) }} / {{ formatMoney(limits.daily_collection_amount_cents) }}
            </p>
            <div class="h-1.5 rounded-full bg-surface mt-2 overflow-hidden">
              <div class="h-full bg-info" :style="{ width: usagePercent(limits.daily_collection_amount_used_cents_branch, limits.daily_collection_amount_cents) + '%' }" />
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="showRequestForm">
        <h3 class="text-sm font-bold text-text-primary mb-1">Request new limits</h3>
        <p class="text-xs text-text-muted mb-4">Sent to our operations team for review — limits update once approved.</p>
        <div v-if="requestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ requestError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submitRequest">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="reqPayoutAmountKes" type="number" label="Requested daily payout amount (KES)" />
            <AppInput v-model="reqPayoutCount" type="number" label="Requested daily payout count" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="reqCollectionAmountKes" type="number" label="Requested daily collection amount (KES)" />
            <AppInput v-model="reqCollectionCount" type="number" label="Requested daily collection count" />
          </div>
          <AppInput v-model="reason" label="Reason" placeholder="Why do you need higher limits?" required />
          <div class="flex gap-2">
            <AppButton type="submit" :loading="requesting">Send request</AppButton>
            <AppButton type="button" variant="ghost" @click="showRequestForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
