<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatMoney } from '@/lib/format'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { fetchApprovals, type ApprovalRequest } from '@/lib/orgApi'
import { ClipboardCheckIcon, CheckCircle2Icon } from 'lucide-vue-next'

const props = defineProps<{
  isBranch: boolean
  routeName: string
}>()

const router = useRouter()
const loading = ref(true)
const total = ref(0)
const rows = ref<ApprovalRequest[]>([])

const ACTION_LABELS: Record<string, string> = {
  ORG_PAYOUT: 'Payout',
  BRANCH_PAYOUT: 'Payout',
  SUPPLIER_PAYMENT: 'Supplier payment',
  PURCHASE_ORDER: 'Purchase order',
  SUPPLIER_INVOICE: 'Supplier invoice',
}

function actionLabel(t: string): string {
  return ACTION_LABELS[t] ?? t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

onMounted(async () => {
  try {
    const res = await fetchApprovals(props.isBranch, { status: 'READY', page_size: 4 })
    rows.value = res.approvals
    total.value = res.total_count
  } catch {
    /* widget is best-effort */
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppCard>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
          <ClipboardCheckIcon class="w-4 h-4" />
        </span>
        <h2 class="text-sm font-bold text-text-primary">Pending approvals</h2>
        <AppBadge v-if="total" variant="warning" size="sm">{{ total }}</AppBadge>
      </div>
      <button
        class="text-xs font-semibold text-primary hover:underline"
        @click="router.push({ name: routeName })"
      >
        View all
      </button>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

    <div v-else-if="!rows.length" class="flex flex-col items-start gap-2 rounded-xl bg-success-light px-3.5 py-4">
      <CheckCircle2Icon class="w-6 h-6 text-success" />
      <p class="text-sm font-semibold text-text-primary">No pending approvals</p>
      <p class="text-xs text-text-muted">Every request has been actioned.</p>
    </div>

    <ul v-else class="flex flex-col divide-y divide-border">
      <li
        v-for="r in rows"
        :key="r.id"
        class="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-2/60 -mx-2 px-2 rounded-lg"
        @click="router.push({ name: routeName, query: { open: r.id } })"
      >
        <div class="min-w-0">
          <p class="text-[13px] font-semibold text-text-primary truncate">{{ r.title || actionLabel(r.action_type) }}</p>
          <p class="text-xs text-text-muted truncate">
            {{ actionLabel(r.action_type) }}<span v-if="r.maker_label"> · {{ r.maker_label }}</span>
          </p>
        </div>
        <div class="text-right shrink-0">
          <p v-if="r.amount_cents != null" class="text-[13px] font-semibold text-text-primary">
            KES {{ formatMoney(r.amount_cents) }}
          </p>
          <p class="text-xs text-text-muted">{{ r.status.replace(/_/g, ' ').toLowerCase() }}</p>
        </div>
      </li>
    </ul>
  </AppCard>
</template>
