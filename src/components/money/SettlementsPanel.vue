<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import type { SettlementList, SettlementQuery } from '@/lib/orgApi'

const props = defineProps<{
  listFetcher: (params: SettlementQuery) => Promise<SettlementList>
  orgId: string
  branchId?: string
  detailRouteName: string
  allowScope?: boolean
}>()

const router = useRouter()
const { showError } = useResponseModal()

function monthStart(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

const from = ref(monthStart(-2))
const to = ref(new Date().toISOString().slice(0, 10))
const scope = ref('consolidated')
const page = ref(1)
const list = ref<SettlementList | null>(null)
const loading = ref(false)

const scopeOptions = [
  { value: 'consolidated', label: 'Consolidated (org + branches)' },
  { value: 'org', label: 'Organization wallet only' },
]

function params(): SettlementQuery {
  const p: SettlementQuery = { from: from.value, to: to.value, page: page.value, page_size: 50 }
  if (props.allowScope) p.scope = scope.value as 'consolidated' | 'org'
  return p
}

async function load() {
  loading.value = true
  try {
    list.value = await props.listFetcher(params())
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

function apply() {
  page.value = 1
  load()
}

const totalPages = computed(() => (list.value ? Math.max(1, Math.ceil(list.value.total / list.value.page_size)) : 1))

async function changePage(delta: number) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  await load()
}

function openDetail(id: string) {
  router.push({
    name: props.detailRouteName,
    params: props.branchId
      ? { orgId: props.orgId, branchId: props.branchId, settlementId: id }
      : { orgId: props.orgId, settlementId: id },
  })
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-5">
    <AppCard>
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">From</label>
          <input v-model="from" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">To</label>
          <input v-model="to" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <AppSelect v-if="props.allowScope" v-model="scope" label="Scope" :options="scopeOptions" class="min-w-56" />
        <AppButton size="sm" variant="secondary" :loading="loading" @click="apply">Apply</AppButton>
      </div>
    </AppCard>

    <div v-if="list" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Settlements</p>
        <p class="text-lg font-bold text-text-primary">{{ list.total }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Net settled</p>
        <p class="text-lg font-bold text-success">KES {{ formatMoney(list.total_net_cents) }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Period</p>
        <p class="text-sm font-semibold text-text-primary">{{ from }} → {{ to }}</p>
      </AppCard>
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-6">Loading settlements…</p>
      <p v-else-if="!list || !list.settlements.length" class="text-sm text-text-muted px-5 py-6">
        No settlements in this period. Matured high-risk-rail holds are released to your main wallet automatically after 72 hours.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-2">Settled</th>
              <th class="px-5 py-2">Reference</th>
              <th class="px-5 py-2 text-right">Items</th>
              <th class="px-5 py-2 text-right">Gross</th>
              <th class="px-5 py-2 text-right">Fees</th>
              <th class="px-5 py-2 text-right">Net</th>
              <th class="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="st in list.settlements" :key="st.settlement_id"
              class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer"
              @click="openDetail(st.settlement_id)"
            >
              <td class="px-5 py-2.5 text-text-muted whitespace-nowrap">{{ new Date(st.settled_at).toLocaleString() }}</td>
              <td class="px-5 py-2.5 font-medium text-text-primary">{{ st.reference || '—' }}</td>
              <td class="px-5 py-2.5 text-right text-text-muted">{{ st.item_count || '—' }}</td>
              <td class="px-5 py-2.5 text-right text-text-secondary">{{ formatMoney(st.gross_cents) }}</td>
              <td class="px-5 py-2.5 text-right text-error">{{ st.fees_cents ? formatMoney(st.fees_cents) : '—' }}</td>
              <td class="px-5 py-2.5 text-right font-semibold text-success">{{ formatMoney(st.net_cents) }}</td>
              <td class="px-5 py-2.5 text-right"><span class="text-xs font-semibold text-primary">View →</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="list && list.total > list.page_size" class="flex items-center justify-between px-5 py-4 border-t border-border">
        <p class="text-xs text-text-muted">Page {{ list.page }} of {{ totalPages }} · {{ list.total }} settlements</p>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="list.page <= 1" @click="changePage(-1)">Previous</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="list.page >= totalPages" @click="changePage(1)">Next</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
