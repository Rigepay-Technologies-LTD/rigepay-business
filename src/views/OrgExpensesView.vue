<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchOrgExpenses, createOrgExpense, uploadExpenseReceipt,
  type OrgExpense,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, ReceiptIcon, PaperclipIcon, RefreshCwIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const router = useRouter()
const { showError, showSuccess } = useResponseModal()

const loading = ref(true)
const expenses = ref<OrgExpense[]>([])
const totalCount = ref(0)
const page = ref(1)

async function load() {
  loading.value = true
  try {
    const result = await fetchOrgExpenses(page.value)
    expenses.value = result.expenses
    totalCount.value = result.totalCount
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const totalSpend = computed(() => expenses.value.reduce((s, e) => s + e.amount_cents, 0))

const showCreate = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const form = ref({ amountKes: '', category: '', vendor: '', date: new Date().toISOString().slice(0, 10), notes: '', receiptUrl: '' })
const uploadingReceipt = ref(false)
const receiptFileInput = ref<HTMLInputElement | null>(null)

function openCreate() {
  form.value = { amountKes: '', category: '', vendor: '', date: new Date().toISOString().slice(0, 10), notes: '', receiptUrl: '' }
  createError.value = null
  showCreate.value = true
}

async function handleReceiptChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingReceipt.value = true
  try {
    form.value.receiptUrl = await uploadExpenseReceipt(file)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    uploadingReceipt.value = false
  }
}

async function submitCreate() {
  createError.value = null
  const amountCents = Math.round(Number(form.value.amountKes) * 100)
  if (!amountCents || amountCents <= 0) { createError.value = 'Enter a valid amount.'; return }
  if (!form.value.category.trim() || !form.value.vendor.trim()) { createError.value = 'Category and vendor are required.'; return }
  creating.value = true
  try {
    const created = await createOrgExpense({
      amount_cents: amountCents,
      category: form.value.category.trim(),
      vendor: form.value.vendor.trim(),
      date: form.value.date,
      notes: form.value.notes.trim() || undefined,
      receipt_url: form.value.receiptUrl || undefined,
    })
    if (receiptFileInput.value) receiptFileInput.value.value = ''
    showCreate.value = false
    showSuccess('Expense logged.')
    router.push({ name: 'org-expense-detail', params: { orgId: props.orgId, expenseId: created.id } })
  } catch (err) {
    createError.value = extractErrorMessage(err)
    showError(createError.value)
  } finally {
    creating.value = false
  }
}

function openDetail(exp: OrgExpense) {
  router.push({ name: 'org-expense-detail', params: { orgId: props.orgId, expenseId: exp.id } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Expenses">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Bookkeeping</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Expenses</h1>
          <p class="text-sm text-text-muted mt-0.5">Record business spend that happens outside the platform.</p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
            <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
            Refresh
          </AppButton>
          <AppButton size="sm" @click="openCreate">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Log expense
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppCard>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Logged expenses</p>
          <p class="text-lg font-bold text-text-primary mt-1">{{ totalCount }}</p>
        </AppCard>
        <AppCard>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-text-muted">This page total</p>
          <p class="text-lg font-bold text-text-primary mt-1">KES {{ formatMoney(totalSpend) }}</p>
        </AppCard>
      </div>

      <AppCard padding="none">
        <p v-if="loading" class="text-sm text-text-muted px-5 py-10 text-center">Loading expenses…</p>
        <div v-else-if="!expenses.length" class="flex flex-col items-center text-center gap-3 py-14">
          <div class="w-12 h-12 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
            <ReceiptIcon class="w-6 h-6" />
          </div>
          <p class="text-sm font-semibold text-text-primary">No expenses logged yet</p>
          <p class="text-xs text-text-muted">Track money spent outside the system for your records.</p>
          <AppButton size="sm" class="mt-1" @click="openCreate">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            Log expense
          </AppButton>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Date</th>
                <th class="px-5 py-3">Vendor</th>
                <th class="px-5 py-3">Category</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3">Receipt</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="exp in expenses" :key="exp.id"
                class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer"
                @click="openDetail(exp)"
              >
                <td class="px-5 py-3 text-text-secondary whitespace-nowrap">{{ formatDate(exp.occurred_at) }}</td>
                <td class="px-5 py-3 font-medium text-text-primary">{{ exp.vendor }}</td>
                <td class="px-5 py-3 text-text-secondary">{{ exp.category }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">KES {{ formatMoney(exp.amount_cents) }}</td>
                <td class="px-5 py-3">
                  <PaperclipIcon v-if="exp.receipt_url" class="w-4 h-4 text-text-muted" />
                  <span v-else class="text-text-muted text-xs">—</span>
                </td>
                <td class="px-5 py-3">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-surface-2 text-text-secondary">{{ exp.status || 'RECORDED' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!loading && totalCount > 25" class="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <p class="text-xs text-text-muted">{{ totalCount }} total</p>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--; load()">Previous</AppButton>
            <AppButton size="sm" variant="secondary" :disabled="expenses.length < 25" @click="page++; load()">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showCreate" title="Log expense" size="md">
      <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppInput v-model="form.amountKes" type="number" label="Amount (KES)" required />
          <AppInput v-model="form.date" type="date" label="Date" required />
          <AppInput v-model="form.category" label="Category" placeholder="e.g. Utilities" required />
          <AppInput v-model="form.vendor" label="Vendor" placeholder="e.g. Kenya Power" required />
        </div>
        <AppInput v-model="form.notes" label="Notes (optional)" />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Receipt (optional)</label>
          <input
            ref="receiptFileInput" type="file" accept="image/jpeg,image/png,application/pdf"
            class="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-muted file:text-primary hover:file:opacity-90"
            @change="handleReceiptChange"
          />
          <p v-if="uploadingReceipt" class="text-xs text-text-muted">Uploading…</p>
          <p v-else-if="form.receiptUrl" class="text-xs text-success flex items-center gap-1">
            <PaperclipIcon class="w-3 h-3" /> Receipt attached
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton type="submit" :loading="creating" :disabled="uploadingReceipt">Save expense</AppButton>
          <AppButton type="button" variant="ghost" @click="showCreate = false">Cancel</AppButton>
        </div>
      </form>
    </AppModal>
  </DashboardLayout>
</template>
