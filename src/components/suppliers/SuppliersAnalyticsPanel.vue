<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchSuppliersAnalytics, type SuppliersAnalytics } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'

const props = defineProps<{ isBranch: boolean; orgId: string; branchId?: string }>()
const { showError } = useResponseModal()

const loading = ref(true)
const a = ref<SuppliersAnalytics | null>(null)

onMounted(async () => {
  try {
    a.value = await fetchSuppliersAnalytics(props.isBranch)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
    <template v-else-if="a">
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total suppliers</p><p class="text-xl font-bold text-text-primary mt-1">{{ a.total_suppliers }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Payment ready</p><p class="text-xl font-bold text-success mt-1">{{ a.payment_ready }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Overdue invoices</p><p class="text-xl font-bold text-error mt-1">{{ a.overdue_invoices }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Avg payment days</p><p class="text-xl font-bold text-text-primary mt-1">{{ a.avg_payment_days.toFixed(1) }}</p></AppCard>
      </section>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-3">Spend over time</h2>
        <p v-if="!a.spend_over_time.length" class="text-sm text-text-muted">No supplier spend in this period.</p>
        <div v-else class="flex items-end gap-2 h-40">
          <div v-for="p in a.spend_over_time" :key="p.month" class="flex-1 flex flex-col items-center gap-1">
            <div class="w-full bg-primary/70 rounded-t" :style="{ height: (Math.max(4, (p.spend_cents / Math.max(...a.spend_over_time.map(x => x.spend_cents), 1)) * 140)) + 'px' }" />
            <span class="text-[10px] text-text-muted">{{ p.month.slice(5) }}</span>
          </div>
        </div>
      </AppCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Payables aging</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="py-2">Cur</th><th class="py-2 text-right">Current</th><th class="py-2 text-right">1–30</th><th class="py-2 text-right">31–60</th><th class="py-2 text-right">61–90</th><th class="py-2 text-right">90+</th>
              </tr></thead>
              <tbody>
                <tr v-if="!a.aging.length"><td colspan="6" class="py-4 text-text-muted text-center">No aging balances.</td></tr>
                <tr v-for="b in a.aging" :key="b.currency" class="border-b border-border last:border-0">
                  <td class="py-2 font-semibold">{{ b.currency }}</td>
                  <td class="py-2 text-right">{{ formatMoney(b.current_cents) }}</td>
                  <td class="py-2 text-right">{{ formatMoney(b.d1_30_cents) }}</td>
                  <td class="py-2 text-right">{{ formatMoney(b.d31_60_cents) }}</td>
                  <td class="py-2 text-right">{{ formatMoney(b.d61_90_cents) }}</td>
                  <td class="py-2 text-right text-error">{{ formatMoney(b.d90_plus_cents) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-3">Top suppliers by spend</h2>
          <p v-if="!a.top_suppliers.length" class="text-sm text-text-muted">No paid supplier spend yet.</p>
          <div v-else class="flex flex-col gap-2">
            <div v-for="t in a.top_suppliers" :key="t.supplier_id" class="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
              <span class="font-medium text-text-primary">{{ t.legal_name }}</span>
              <span class="font-semibold text-text-primary">KES {{ formatMoney(t.spend_cents) }}</span>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-3">Spend by category</h2>
        <p v-if="!a.spend_by_category.length" class="text-sm text-text-muted">No category spend yet.</p>
        <div v-else class="flex flex-wrap gap-3">
          <div v-for="c in a.spend_by_category" :key="c.category" class="rounded-xl bg-surface-2 px-4 py-2.5">
            <p class="text-xs text-text-muted">{{ c.category }}</p>
            <p class="text-sm font-bold text-text-primary">KES {{ formatMoney(c.spend_cents) }}</p>
          </div>
        </div>
      </AppCard>

      <p class="text-xs text-text-muted">{{ a.failed_payments }} failed supplier payment(s) recorded.</p>
    </template>
  </div>
</template>
