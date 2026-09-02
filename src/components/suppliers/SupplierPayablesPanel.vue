<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchSupplierPayables, createSupplierPayment,
  type SupplierInvoice, type PayablesSummary,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'

const props = defineProps<{ isBranch: boolean; orgId: string; branchId?: string }>()
const auth = useAuthStore()
const { showError, showSuccess } = useResponseModal()

const isOwnerSession = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType === 'org_member')

const loading = ref(true)
const invoices = ref<SupplierInvoice[]>([])
const summary = ref<PayablesSummary | null>(null)
const selected = ref<Record<string, boolean>>({})

async function load() {
  loading.value = true
  try {
    const res = await fetchSupplierPayables(props.isBranch)
    invoices.value = res.invoices ?? []
    summary.value = res.summary
  } catch (err) { showError(extractErrorMessage(err)) } finally { loading.value = false }
}
onMounted(load)

const selectedInvoices = computed(() => invoices.value.filter((i) => selected.value[i.id]))
const sameSupplier = computed(() => {
  const ids = new Set(selectedInvoices.value.map((i) => i.supplier_id))
  return ids.size === 1
})
const selectedTotal = computed(() => selectedInvoices.value.reduce((s, i) => s + (i.total_cents - i.paid_cents), 0))

const showPay = ref(false)
const paying = ref(false)
const payForm = ref({ amount: 0, reference: '', description: '', pin: '', password: '' })

function openPay() {
  if (!selectedInvoices.value.length) { showError('Select at least one invoice.'); return }
  if (!sameSupplier.value) { showError('Select invoices from a single supplier.'); return }
  payForm.value = { amount: selectedTotal.value / 100, reference: '', description: '', pin: '', password: '' }
  showPay.value = true
}

async function submitPay() {
  paying.value = true
  try {
    const amountCents = Math.round(payForm.value.amount * 100)
    const allocations = selectedInvoices.value.map((i) => ({ invoice_id: i.id, amount_cents: Math.min(i.total_cents - i.paid_cents, amountCents) }))
    const res = await createSupplierPayment(props.isBranch, {
      supplier_id: selectedInvoices.value[0].supplier_id,
      amount_cents: amountCents,
      reference: payForm.value.reference || undefined,
      description: payForm.value.description || undefined,
      allocations,
      pin: payForm.value.pin || undefined,
      password: payForm.value.password || undefined,
    })
    showPay.value = false
    selected.value = {}
    showSuccess(res.status === 'approval_required' ? 'Payment submitted for owner approval.' : 'Payment queued for execution.')
    load()
  } catch (err) { showError(extractErrorMessage(err)) } finally { paying.value = false }
}

function supplierRoute(id: string) {
  return props.branchId
    ? { name: 'branch-supplier-detail', params: { orgId: props.orgId, branchId: props.branchId, supplierId: id } }
    : { name: 'org-supplier-detail', params: { orgId: props.orgId, supplierId: id } }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <section v-if="summary" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total outstanding</p><p class="text-xl font-bold text-text-primary mt-1">KES {{ formatMoney(summary.outstanding_cents) }}</p></AppCard>
      <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Due this week</p><p class="text-xl font-bold text-warning mt-1">KES {{ formatMoney(summary.due_this_week_cents) }}</p></AppCard>
      <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Overdue</p><p class="text-xl font-bold text-error mt-1">KES {{ formatMoney(summary.overdue_cents) }}</p></AppCard>
      <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Open invoices</p><p class="text-xl font-bold text-text-primary mt-1">{{ summary.open_invoice_count }}</p></AppCard>
    </section>

    <div class="flex items-center justify-between">
      <p class="text-sm text-text-muted">{{ selectedInvoices.length }} selected · KES {{ formatMoney(selectedTotal) }}</p>
      <AppButton variant="primary" size="md" :disabled="!selectedInvoices.length" @click="openPay">Pay selected</AppButton>
    </div>

    <AppCard padding="none">
      <div class="overflow-x-auto">
        <table class="w-full min-w-160 text-sm">
          <thead><tr class="bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
            <th class="px-4 py-3 w-10"></th><th class="px-4 py-3">Supplier</th><th class="px-4 py-3">Invoice</th>
            <th class="px-4 py-3">Due</th><th class="px-4 py-3 text-right">Outstanding</th><th class="px-4 py-3">Status</th>
          </tr></thead>
          <tbody v-if="loading"><tr><td colspan="6" class="px-4 py-10 text-center text-text-muted">Loading…</td></tr></tbody>
          <tbody v-else-if="!invoices.length"><tr><td colspan="6" class="px-4 py-10 text-center text-text-muted">No outstanding invoices.</td></tr></tbody>
          <tbody v-else>
            <tr v-for="inv in invoices" :key="inv.id" class="border-b border-border last:border-0">
              <td class="px-4 py-3.5"><input type="checkbox" v-model="selected[inv.id]" /></td>
              <td class="px-4 py-3.5"><RouterLink :to="supplierRoute(inv.supplier_id)" class="font-semibold text-text-primary hover:text-primary">{{ inv.supplier?.legal_name ?? '—' }}</RouterLink></td>
              <td class="px-4 py-3.5">{{ inv.invoice_number }}</td>
              <td class="px-4 py-3.5 text-text-secondary">{{ inv.due_date ? formatDate(inv.due_date) : '—' }}</td>
              <td class="px-4 py-3.5 text-right font-semibold">KES {{ formatMoney(inv.total_cents - inv.paid_cents) }}</td>
              <td class="px-4 py-3.5"><AppBadge :variant="inv.status === 'PARTIALLY_PAID' ? 'info' : 'warning'" size="sm">{{ inv.status }}</AppBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <AppModal v-model="showPay" title="Pay supplier" size="lg">
      <p v-if="!sameSupplier" class="text-sm text-error-text mb-3">Select invoices from a single supplier.</p>
      <div v-else class="flex flex-col gap-4">
        <p class="text-sm text-text-muted">
          Paying <span class="font-semibold text-text-primary">{{ selectedInvoices[0]?.supplier?.legal_name }}</span>
          across {{ selectedInvoices.length }} invoice(s). Runs through your payout pipeline (fraud checks, limits).
        </p>
        <AppInput v-model.number="payForm.amount" label="Amount (KES)" type="number" />
        <AppInput v-model="payForm.reference" label="Reference" />
        <AppInput v-model="payForm.description" label="Description" />
        <AppInput v-if="isOwnerSession" v-model="payForm.pin" label="Transaction PIN" type="password" />
        <AppInput v-else v-model="payForm.password" label="Account password" type="password" />
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="ghost" @click="showPay = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="paying" :disabled="!sameSupplier" @click="submitPay">Submit payment</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
