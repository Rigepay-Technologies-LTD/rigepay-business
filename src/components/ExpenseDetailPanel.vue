<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgExpense, type OrgExpense } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import TagEditor from '@/components/TagEditor.vue'
import { ChevronLeftIcon, FileTextIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; expenseId: string; listRouteName: string }>()
const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const expense = ref<OrgExpense | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    expense.value = await fetchOrgExpense(props.expenseId, isBranch.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
})

const listTo = computed(() =>
  props.branchId
    ? { name: props.listRouteName, params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: props.listRouteName, params: { orgId: props.orgId } },
)

const rows = computed(() => {
  const e = expense.value
  if (!e) return []
  const list = [
    { label: 'Vendor', value: e.vendor },
    { label: 'Category', value: e.category },
    { label: 'Date', value: formatDate(e.occurred_at) },
    { label: 'Payment method', value: e.payment_method || '—' },
    { label: 'Status', value: e.status || '—' },
    { label: 'Currency', value: e.currency || 'KES' },
  ]
  if (e.reference_code) list.push({ label: 'Reference', value: e.reference_code })
  if (e.vendor_pin) list.push({ label: 'Vendor KRA PIN', value: e.vendor_pin })
  if (e.tax_amount_cents) list.push({ label: 'Tax', value: `KES ${formatMoney(e.tax_amount_cents)}` })
  list.push({ label: 'Tax deductible', value: e.is_tax_deductible ? 'Yes' : 'No' })
  return list
})

const isPdfReceipt = computed(() => (expense.value?.receipt_url || '').toLowerCase().endsWith('.pdf'))
</script>

<template>
  <div class="flex flex-col gap-6 max-w-3xl">
    <RouterLink :to="listTo" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Expenses
    </RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading expense…</p>

    <template v-else-if="expense">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Expense</p>
        <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ expense.vendor }}</h1>
        <p class="text-2xl font-bold text-text-primary tracking-tight mt-1">KES {{ formatMoney(expense.amount_cents) }}</p>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-4">Details</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div v-for="r in rows" :key="r.label" class="flex justify-between gap-4">
            <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
            <dd class="font-medium text-text-primary text-right break-all">{{ r.value }}</dd>
          </div>
        </dl>
        <div v-if="expense.notes" class="mt-4 pt-4 border-t border-border">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Notes</p>
          <p class="text-sm text-text-primary">{{ expense.notes }}</p>
        </div>
      </AppCard>

      <AppCard>
        <TagEditor subject-type="expense" :subject-id="expense.id" :is-branch="isBranch" />
      </AppCard>

      <AppCard v-if="expense.receipt_url">
        <h2 class="text-sm font-bold text-text-primary mb-3">Receipt</h2>
        <a :href="expense.receipt_url" target="_blank" rel="noopener">
          <img v-if="!isPdfReceipt" :src="expense.receipt_url" alt="Receipt" class="rounded-xl border border-border max-h-80 w-auto" />
          <span v-else class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <FileTextIcon class="w-4 h-4" /> View receipt PDF
          </span>
        </a>
      </AppCard>
    </template>
  </div>
</template>
