<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchPettyCashFloats, fetchPettyCashHistory, type PettyCashFloat, type PettyCashDraw } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { WalletIcon, HistoryIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const floats = ref<PettyCashFloat[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    floats.value = await fetchPettyCashFloats(true)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const historyFloat = ref<PettyCashFloat | null>(null)
const history = ref<PettyCashDraw[]>([])
const historyLoading = ref(false)

async function openHistory(float: PettyCashFloat) {
  historyFloat.value = float
  historyLoading.value = true
  try {
    history.value = await fetchPettyCashHistory(float.id, true)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    historyLoading.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Petty cash">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div>
        <h2 class="text-sm font-bold text-text-primary">Petty cash</h2>
        <p class="text-xs text-text-muted mt-0.5">
          This branch's tracked cash float. Funding and recording draws is done from the organization dashboard —
          ask an owner or authorized member to top up or log a spend here.
        </p>
      </div>

      <p v-if="loading" class="text-sm text-text-muted">Loading floats…</p>
      <AppCard v-else-if="!floats.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <WalletIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No petty cash float for this branch yet</p>
          <p class="text-xs text-text-muted">Ask an org owner to create one from the organization dashboard.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="f in floats" :key="f.id" padding="none">
          <div class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text-primary truncate">{{ f.name }} — KES {{ formatMoney(f.balance_cents) }}</p>
              <p class="text-xs text-text-muted mt-0.5">created {{ formatDate(f.created_at) }}</p>
            </div>
            <AppButton size="sm" variant="ghost" @click="openHistory(f)">
              <template #icon><HistoryIcon class="w-3.5 h-3.5" /></template>
              History
            </AppButton>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!historyFloat" :title="historyFloat ? `${historyFloat.name} — history` : 'History'" size="md" @update:model-value="historyFloat = null">
      <div v-if="historyFloat" class="flex flex-col gap-4 p-6">
        <p class="text-sm font-semibold text-text-primary">Balance: KES {{ formatMoney(historyFloat.balance_cents) }}</p>
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
