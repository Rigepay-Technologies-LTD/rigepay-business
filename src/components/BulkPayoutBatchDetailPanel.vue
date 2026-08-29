<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBulkPayoutBatch, reclaimBulkPayoutResidual,
  type BulkPayoutBatch, type BulkPayoutItem,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import TagEditor from '@/components/TagEditor.vue'
import { ChevronLeftIcon, RefreshCwIcon, TagIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; batchId: string; listRouteName: string }>()
const router = useRouter()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const { showError, showSuccess } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const data = ref<{ batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number } | null>(null)
const loading = ref(true)
const reclaiming = ref(false)
const tagItem = ref<BulkPayoutItem | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = await fetchBulkPayoutBatch(props.batchId, isBranch.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function reclaim() {
  reclaiming.value = true
  try {
    const res = await reclaimBulkPayoutResidual(props.batchId, isBranch.value)
    showSuccess(res.reclaimed_cents > 0 ? `Reclaimed KES ${formatMoney(res.reclaimed_cents)} to the funding wallet.` : 'Nothing left to reclaim.')
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    reclaiming.value = false
  }
}

function itemVariant(it: BulkPayoutItem) {
  if (it.status === 'REJECTED') return 'error'
  if (it.status === 'PENDING') return 'neutral'
  const ps = (it.payout_status || '').toLowerCase()
  if (ps === 'completed') return 'success'
  if (ps === 'failed') return 'error'
  return 'warning'
}
function destLabel(t: string) {
  return { BANK_ACCOUNT: 'Bank', PAYBILL: 'Paybill', TILL_NUMBER: 'Till' }[t] || 'M-Pesa'
}

const tiles = computed(() => {
  const b = data.value?.batch
  if (!b || !data.value) return []
  return [
    { label: 'Total amount', value: `KES ${formatMoney(b.total_amount_cents)}` },
    { label: 'Fees reserved', value: `KES ${formatMoney(b.total_fee_reserve_cents)}` },
    { label: 'Payees', value: String(b.item_count) },
    { label: 'Dispatched', value: String(b.dispatched_count) },
    { label: 'Rejected', value: String(b.rejected_count) },
    { label: 'Escrow balance', value: `KES ${formatMoney(data.value.escrow_balance_cents)}` },
  ]
})

function goBack() {
  router.push({
    name: props.listRouteName,
    params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId },
  })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Bulk payments
    </button>

    <p v-if="loading" class="text-sm text-text-muted">Loading batch…</p>

    <template v-else-if="data">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Bulk payout batch</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ data.batch.item_count }} payees</h1>
          <p class="text-2xl font-bold text-text-primary tracking-tight mt-1">KES {{ formatMoney(data.batch.total_amount_cents) }}</p>
          <p class="text-xs text-text-muted mt-1">{{ data.batch.remarks || 'No remarks' }} · {{ formatDate(data.batch.created_at) }}</p>
        </div>
        <div class="flex flex-col items-end gap-3">
          <AppBadge :variant="data.batch.status === 'DISPATCHED' ? 'success' : 'warning'" size="sm">{{ data.batch.status }}</AppBadge>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
              <template #icon><RefreshCwIcon class="w-4 h-4" /></template>Refresh
            </AppButton>
            <AppButton v-if="isOwner && data.escrow_balance_cents > 0" size="sm" :loading="reclaiming" @click="reclaim">Reclaim residual</AppButton>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AppCard v-for="t in tiles" :key="t.label">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{{ t.label }}</p>
          <p class="text-base font-bold text-text-primary mt-1">{{ t.value }}</p>
        </AppCard>
      </div>

      <AppCard padding="none">
        <div class="px-5 pt-5"><h2 class="text-sm font-bold text-text-primary mb-4">Payees</h2></div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">#</th>
                <th class="px-5 py-3">Recipient</th>
                <th class="px-5 py-3">Via</th>
                <th class="px-5 py-3">Destination</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in data.items" :key="it.id" class="border-b border-border last:border-0 hover:bg-surface-2/60 align-top">
                <td class="px-5 py-3 text-text-muted">{{ it.row_number }}</td>
                <td class="px-5 py-3 font-medium text-text-primary">
                  {{ it.recipient_name }}
                  <span v-if="it.rejection_reason" class="block text-xs text-error">{{ it.rejection_reason }}</span>
                </td>
                <td class="px-5 py-3 text-text-secondary text-xs">{{ destLabel(it.destination_type) }}</td>
                <td class="px-5 py-3 text-text-secondary text-xs">
                  {{ it.destination_type === 'BANK_ACCOUNT' ? `${it.bank_code || ''} ${it.bank_account_number || ''}`.trim() : (it.phone_number || '—') }}
                </td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">KES {{ formatMoney(it.amount_cents) }}</td>
                <td class="px-5 py-3">
                  <AppBadge :variant="itemVariant(it)" size="sm">{{ it.payout_status || it.status }}</AppBadge>
                </td>
                <td class="px-5 py-3 text-right">
                  <button
                    v-if="it.payout_id" type="button"
                    class="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
                    title="Tag this payout" @click="tagItem = it"
                  ><TagIcon class="w-4 h-4" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <AppModal
      :model-value="!!tagItem" title="Tag payout" size="sm"
      @update:model-value="(v: boolean) => { if (!v) tagItem = null }"
    >
      <div v-if="tagItem" class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-text-primary">{{ tagItem.recipient_name }} — KES {{ formatMoney(tagItem.amount_cents) }}</p>
        <TagEditor v-if="tagItem.payout_id" subject-type="payout" :subject-id="tagItem.payout_id" :is-branch="isBranch" compact />
      </div>
    </AppModal>
  </div>
</template>
