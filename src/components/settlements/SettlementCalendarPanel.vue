<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgSettlementCalendar, fetchBranchSettlementCalendar, type SettlementCalendar } from '@/lib/orgApi'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { extractErrorMessage } from '@/lib/errors'
import AppCard from '@/components/ui/AppCard.vue'
import AppStat from '@/components/ui/AppStat.vue'
import { ClockIcon, CalendarIcon, WalletIcon } from 'lucide-vue-next'

const props = defineProps<{ branchId?: string }>()

const { showError } = useResponseModal()
const loading = ref(true)
const data = ref<SettlementCalendar | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = props.branchId ? await fetchBranchSettlementCalendar() : await fetchOrgSettlementCalendar()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

defineExpose({ reload: load })

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
          :sub="data.next_settlement ? formatDate(data.next_settlement.date) : 'Nothing currently on hold'"
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
        <p class="text-xs text-text-muted mb-4">Funds currently in a security hold, and the day each is expected to settle.</p>
        <p v-if="!sortedHolds.length" class="text-sm text-text-muted">No funds are currently on hold.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border">
                <th class="px-3 py-2">Amount</th>
                <th class="px-3 py-2">Held since</th>
                <th class="px-3 py-2">Reason</th>
                <th class="px-3 py-2">Expected release</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in sortedHolds" :key="h.entry_id" class="border-b border-border last:border-0">
                <td class="px-3 py-2.5 font-semibold text-text-primary">KES {{ formatMoney(h.amount_cents) }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ formatDate(h.held_since) }}</td>
                <td class="px-3 py-2.5 text-text-muted">{{ h.description || '72-hour settlement hold' }}</td>
                <td class="px-3 py-2.5 font-semibold text-success">
                  {{ h.expected_release_at ? formatDate(h.expected_release_at) : 'Calculating…' }}
                </td>
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
  </div>
</template>
