<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchOrgSettlementCalendar, fetchBranchSettlementCalendar, type SettlementCalendar, type SettlementHold, type SettlementHistoryEntry } from '@/lib/orgApi'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { extractErrorMessage } from '@/lib/errors'
import AppCard from '@/components/ui/AppCard.vue'
import AppStat from '@/components/ui/AppStat.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { ClockIcon, CalendarIcon, WalletIcon } from 'lucide-vue-next'

const props = defineProps<{ branchId?: string }>()

const { showError } = useResponseModal()
const loading = ref(true)
const data = ref<SettlementCalendar | null>(null)

async function load() {
  loading.value = true
  try {
    const res = props.branchId ? await fetchBranchSettlementCalendar() : await fetchOrgSettlementCalendar()
    data.value = {
      ...res,
      holds: res.holds ?? [],
      upcoming_holidays: res.upcoming_holidays ?? [],
      settlement_history: res.settlement_history ?? [],
    }
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

defineExpose({ reload: load })

// Live ticking clock so every countdown on this page updates once a
// second without a full reload.
const now = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | undefined
onMounted(() => { tickHandle = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (tickHandle) clearInterval(tickHandle) })

function countdown(iso?: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: '—', overdue: false }
  const target = new Date(iso).getTime()
  const diffMs = target - now.value
  if (diffMs <= 0) return { text: 'Releasing shortly', overdue: true }
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return { text: `${days}d ${hours}h ${minutes}m`, overdue: false }
  if (hours > 0) return { text: `${hours}h ${minutes}m ${seconds}s`, overdue: false }
  return { text: `${minutes}m ${seconds}s`, overdue: false }
}

function holidayBadge(category: string): string {
  if (category === 'public_holiday') return 'bg-primary-muted text-primary'
  return 'bg-surface-2 text-text-muted'
}

const sortedHolds = computed(() => {
  const holds = data.value?.holds ?? []
  return [...holds].sort((a, b) => {
    if (!a.expected_release_at) return 1
    if (!b.expected_release_at) return -1
    return new Date(a.expected_release_at).getTime() - new Date(b.expected_release_at).getTime()
  })
})

const nextSettlementCountdown = computed(() => countdown(data.value?.next_settlement?.date ?? null))

const selectedHold = ref<SettlementHold | null>(null)
function openDetail(hold: SettlementHold) {
  selectedHold.value = hold
}

const selectedHistory = ref<SettlementHistoryEntry | null>(null)
function openHistoryDetail(entry: SettlementHistoryEntry) {
  selectedHistory.value = entry
}

const railLabel = (rail?: string) => (rail ? rail.replace(/_/g, ' ').toUpperCase() : '—')
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="loading" class="text-sm text-text-muted">Loading settlement calendar…</p>

    <template v-else-if="data">
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppStat
          label="Currently held" :value="`KES ${formatMoney(data.total_held_cents)}`"
          :sub="`${data.holds.length} pending hold${data.holds.length === 1 ? '' : 's'}`"
          icon-color="warning"
        >
          <template #icon><WalletIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat
          label="Next settlement"
          :value="data.next_settlement ? `KES ${formatMoney(data.next_settlement.amount_cents)}` : 'None pending'"
          :sub="data.next_settlement ? `${formatDate(data.next_settlement.date)} · ${nextSettlementCountdown.text}` : 'Nothing currently on hold'"
          icon-color="success"
        >
          <template #icon><ClockIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
        <AppStat
          label="Hold window" :value="`${data.hold_window_business_days} business days`"
          sub="Weekends and public holidays don't count"
          icon-color="info"
        >
          <template #icon><CalendarIcon class="w-4.5 h-4.5" /></template>
        </AppStat>
      </section>

      <AppCard>
        <h3 class="text-sm font-bold text-text-primary mb-1">Held funds</h3>
        <p class="text-xs text-text-muted mb-4">Funds currently in a security hold, and the day each is expected to settle. Click a row for details.</p>
        <p v-if="!sortedHolds.length" class="text-sm text-text-muted">No funds are currently on hold.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border">
                <th class="px-3 py-2">Amount</th>
                <th class="px-3 py-2">Held since</th>
                <th class="px-3 py-2">Reason</th>
                <th class="px-3 py-2">Expected release</th>
                <th class="px-3 py-2">Time remaining</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="h in sortedHolds" :key="h.entry_id"
                class="border-b border-border last:border-0 cursor-pointer hover:bg-surface-2 transition"
                @click="openDetail(h)"
              >
                <td class="px-3 py-2.5 font-semibold text-text-primary">KES {{ formatMoney(h.amount_cents) }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ formatDate(h.held_since) }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ h.description || '72-hour settlement hold' }}</td>
                <td class="px-3 py-2.5 font-semibold text-success">
                  {{ h.expected_release_at ? formatDate(h.expected_release_at) : 'Calculating…' }}
                </td>
                <td class="px-3 py-2.5 font-mono text-xs" :class="countdown(h.expected_release_at).overdue ? 'text-success font-semibold' : 'text-text-secondary'">
                  {{ countdown(h.expected_release_at).text }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard>
        <h3 class="text-sm font-bold text-text-primary mb-1">Settlement history</h3>
        <p class="text-xs text-text-muted mb-4">Past releases actually completed by the settlement job. Click a row for details.</p>
        <p v-if="!data.settlement_history.length" class="text-sm text-text-muted">No settlements yet.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border">
                <th class="px-3 py-2">Amount</th>
                <th class="px-3 py-2">Settled</th>
                <th class="px-3 py-2">Reference</th>
                <th class="px-3 py-2">Included transactions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in data.settlement_history" :key="entry.transaction_id"
                class="border-b border-border last:border-0 cursor-pointer hover:bg-surface-2 transition"
                @click="openHistoryDetail(entry)"
              >
                <td class="px-3 py-2.5 font-semibold text-text-primary">KES {{ formatMoney(entry.amount_cents) }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ formatDate(entry.settled_at) }}</td>
                <td class="px-3 py-2.5 text-text-muted font-mono text-xs">{{ entry.reference || '—' }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ entry.original_transaction_count || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard>
        <h3 class="text-sm font-bold text-text-primary mb-1">Upcoming holidays</h3>
        <p class="text-xs text-text-muted mb-4">Weekends and these dates push settlement to the next business day.</p>
        <p v-if="!data.upcoming_holidays.length" class="text-sm text-text-muted">No holidays in the next month.</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="h in data.upcoming_holidays" :key="h.id" class="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
            <span class="font-semibold text-text-primary">{{ h.name }}</span>
            <span class="flex items-center gap-2">
              <span :class="['text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', holidayBadge(h.category)]">{{ h.category.replace('_', ' ') }}</span>
              <span class="text-text-muted">{{ formatDate(h.date) }}</span>
            </span>
          </div>
        </div>
      </AppCard>
    </template>

    <AppModal :model-value="!!selectedHold" title="Hold detail" size="sm" @update:model-value="selectedHold = null">
      <dl v-if="selectedHold" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-text-muted">Amount held</dt>
          <dd class="font-semibold text-text-primary">KES {{ formatMoney(selectedHold.amount_cents) }}</dd>
        </div>
        <div v-if="selectedHold.original_amount_cents !== selectedHold.amount_cents" class="flex justify-between">
          <dt class="text-text-muted">Original transaction amount</dt>
          <dd class="font-semibold text-text-primary">KES {{ formatMoney(selectedHold.original_amount_cents) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">Held since</dt>
          <dd class="font-semibold text-text-primary">{{ formatDate(selectedHold.held_since) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">Expected release</dt>
          <dd class="font-semibold text-success">{{ selectedHold.expected_release_at ? formatDate(selectedHold.expected_release_at) : 'Calculating…' }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">Time remaining</dt>
          <dd class="font-mono font-semibold" :class="countdown(selectedHold.expected_release_at).overdue ? 'text-success' : 'text-text-primary'">
            {{ countdown(selectedHold.expected_release_at).text }}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">Reason</dt>
          <dd class="font-semibold text-text-primary text-right">{{ selectedHold.hold_reason || '72-hour settlement hold' }}</dd>
        </div>
        <div v-if="selectedHold.rail" class="flex justify-between">
          <dt class="text-text-muted">Rail</dt>
          <dd class="font-semibold text-text-primary">{{ railLabel(selectedHold.rail) }}</dd>
        </div>
        <div v-if="selectedHold.txn_type" class="flex justify-between">
          <dt class="text-text-muted">Transaction type</dt>
          <dd class="font-semibold text-text-primary">{{ selectedHold.txn_type }}</dd>
        </div>
        <div v-if="selectedHold.customer_name || selectedHold.customer_phone" class="flex justify-between">
          <dt class="text-text-muted">Customer</dt>
          <dd class="font-semibold text-text-primary text-right">{{ selectedHold.customer_name || selectedHold.customer_phone }}</dd>
        </div>
        <div v-if="selectedHold.reference" class="flex justify-between">
          <dt class="text-text-muted">Reference</dt>
          <dd class="font-semibold text-text-primary font-mono text-xs">{{ selectedHold.reference }}</dd>
        </div>
        <div v-if="selectedHold.description" class="flex flex-col gap-1">
          <dt class="text-text-muted">Description</dt>
          <dd class="font-semibold text-text-primary">{{ selectedHold.description }}</dd>
        </div>
      </dl>
    </AppModal>

    <AppModal :model-value="!!selectedHistory" title="Settlement detail" size="sm" @update:model-value="selectedHistory = null">
      <dl v-if="selectedHistory" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-text-muted">Amount settled</dt>
          <dd class="font-semibold text-text-primary">KES {{ formatMoney(selectedHistory.amount_cents) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">Settled at</dt>
          <dd class="font-semibold text-text-primary">{{ formatDate(selectedHistory.settled_at) }}</dd>
        </div>
        <div v-if="selectedHistory.original_transaction_count" class="flex justify-between">
          <dt class="text-text-muted">Transactions included</dt>
          <dd class="font-semibold text-text-primary">{{ selectedHistory.original_transaction_count }}</dd>
        </div>
        <div v-if="selectedHistory.reference" class="flex justify-between">
          <dt class="text-text-muted">Reference</dt>
          <dd class="font-semibold text-text-primary font-mono text-xs">{{ selectedHistory.reference }}</dd>
        </div>
        <div v-if="selectedHistory.description" class="flex flex-col gap-1">
          <dt class="text-text-muted">Description</dt>
          <dd class="font-semibold text-text-primary">{{ selectedHistory.description }}</dd>
        </div>
      </dl>
    </AppModal>
  </div>
</template>
