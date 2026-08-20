<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgExpenses, createOrgExpense, uploadExpenseReceipt,
  fetchTags, fetchTagsForSubject, assignTag, unassignTag,
  type OrgExpense, type OrgTag,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, ReceiptIcon, PaperclipIcon, ChevronRightIcon, TagIcon, XIcon, FileTextIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const expenses = ref<OrgExpense[]>([])
const totalCount = ref(0)

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchOrgExpenses()
    expenses.value = result.expenses
    totalCount.value = result.totalCount
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

const amountKes = ref('')
const category = ref('')
const vendor = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const notes = ref('')
const receiptUrl = ref('')
const uploadingReceipt = ref(false)
const receiptFileInput = ref<HTMLInputElement | null>(null)

async function handleReceiptChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  createError.value = null
  uploadingReceipt.value = true
  try {
    receiptUrl.value = await uploadExpenseReceipt(file)
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    uploadingReceipt.value = false
  }
}

async function submitCreate() {
  createError.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!amountCents || amountCents <= 0) {
    createError.value = 'Enter a valid amount.'
    return
  }
  if (!category.value.trim() || !vendor.value.trim()) {
    createError.value = 'Category and vendor are required.'
    return
  }
  creating.value = true
  try {
    await createOrgExpense({
      amount_cents: amountCents,
      category: category.value.trim(),
      vendor: vendor.value.trim(),
      date: date.value,
      notes: notes.value.trim() || undefined,
      receipt_url: receiptUrl.value || undefined,
    })
    amountKes.value = ''
    category.value = ''
    vendor.value = ''
    notes.value = ''
    receiptUrl.value = ''
    if (receiptFileInput.value) receiptFileInput.value.value = ''
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const selectedExpense = ref<OrgExpense | null>(null)
const allTags = ref<OrgTag[]>([])
const assignedTags = ref<OrgTag[]>([])
const tagToAssign = ref('')
const assigningTag = ref(false)

async function openDetails(exp: OrgExpense) {
  selectedExpense.value = exp
  tagToAssign.value = ''
  try {
    const [tags, assigned] = await Promise.all([
      allTags.value.length ? Promise.resolve(allTags.value) : fetchTags(),
      fetchTagsForSubject('expense', exp.id),
    ])
    allTags.value = tags
    assignedTags.value = assigned
  } catch {
    assignedTags.value = []
  }
}

async function handleAssignTag() {
  if (!tagToAssign.value || !selectedExpense.value) return
  assigningTag.value = true
  try {
    await assignTag(tagToAssign.value, 'expense', selectedExpense.value.id)
    assignedTags.value = await fetchTagsForSubject('expense', selectedExpense.value.id)
    tagToAssign.value = ''
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    assigningTag.value = false
  }
}

async function handleUnassignTag(tag: OrgTag) {
  if (!selectedExpense.value) return
  try {
    await unassignTag(tag.id, 'expense', selectedExpense.value.id)
    assignedTags.value = assignedTags.value.filter((t) => t.id !== tag.id)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const availableTagsToAssign = () => allTags.value.filter((t) => !assignedTags.value.some((a) => a.id === t.id))
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Expenses">
    <div class="flex flex-col gap-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1">
            <ReceiptIcon class="w-3.5 h-3.5 text-primary" />Bookkeeping
          </span>
          <h2 class="text-base font-bold text-text-primary">Expenses</h2>
          <p class="text-xs text-text-muted mt-0.5">Record business spend for your records — {{ totalCount }} logged.</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Log expense
        </AppButton>
      </div>

      <div v-if="showCreateForm" class="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/3 p-5">
        <span class="block text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted mb-4">New expense</span>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="submitCreate">
          <AppInput v-model="amountKes" type="number" label="Amount (KES)" required />
          <AppInput v-model="category" label="Category" placeholder="e.g. Utilities" required />
          <AppInput v-model="vendor" label="Vendor" placeholder="e.g. Kenya Power" required />
          <AppInput v-model="date" type="date" label="Date" required />
          <AppInput v-model="notes" label="Notes (optional)" />

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Receipt (optional)</label>
            <input
              ref="receiptFileInput" type="file" accept="image/jpeg,image/png,application/pdf"
              class="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-muted file:text-primary hover:file:opacity-90"
              @change="handleReceiptChange"
            />
            <p v-if="uploadingReceipt" class="text-xs text-text-muted">Uploading…</p>
            <p v-else-if="receiptUrl" class="text-xs text-success-text flex items-center gap-1">
              <PaperclipIcon class="w-3 h-3" /> Receipt attached
            </p>
          </div>

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating" :disabled="uploadingReceipt">Save expense</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </div>

      <div v-if="loading" class="flex flex-col gap-2">
        <div v-for="i in 4" :key="i" class="h-16 rounded-2xl bg-border/30 animate-pulse" />
      </div>

      <AppCard v-else-if="!expenses.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-3 py-6">
          <span class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <ReceiptIcon class="w-6 h-6 text-primary" />
          </span>
          <p class="text-sm font-semibold text-text-primary">No expenses logged yet</p>
          <p class="text-xs text-text-muted">Track money spent outside the system for your records.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="exp in expenses" :key="exp.id" padding="none">
          <button
            type="button"
            class="flex items-center gap-3 px-5 py-3.5 w-full text-left hover:bg-primary-muted/40 transition-colors"
            @click="openDetails(exp)"
          >
            <span class="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {{ exp.category?.[0]?.toUpperCase() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text-primary truncate">{{ exp.vendor }}</p>
              <p class="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                {{ exp.category }} · {{ formatDate(exp.occurred_at) }}
                <PaperclipIcon v-if="exp.receipt_url" class="w-3 h-3 text-text-muted shrink-0" />
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold text-text-primary tabular-nums">KES {{ formatMoney(exp.amount_cents) }}</span>
              <ChevronRightIcon class="w-4 h-4 text-text-muted" />
            </div>
          </button>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!selectedExpense" title="Expense details" size="sm" @update:model-value="selectedExpense = null">
      <div v-if="selectedExpense" class="flex flex-col gap-4 p-6">
        <div>
          <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1">{{ selectedExpense.vendor }}</span>
          <p class="text-3xl font-bold text-text-primary tracking-tight tabular-nums">KES {{ formatMoney(selectedExpense.amount_cents) }}</p>
        </div>

        <dl class="flex flex-col divide-y divide-border text-sm">
          <div class="flex justify-between py-2"><dt class="text-text-muted">Vendor</dt><dd class="font-medium text-text-primary">{{ selectedExpense.vendor }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-text-muted">Category</dt><dd class="font-medium text-text-primary">{{ selectedExpense.category }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-text-muted">Date</dt><dd class="font-medium text-text-primary">{{ formatDate(selectedExpense.occurred_at) }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-text-muted">Payment method</dt><dd class="font-medium text-text-primary">{{ selectedExpense.payment_method }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-text-muted">Status</dt><dd class="font-medium text-text-primary">{{ selectedExpense.status }}</dd></div>
          <div v-if="selectedExpense.reference_code" class="flex justify-between py-2"><dt class="text-text-muted">Reference</dt><dd class="font-medium text-text-primary">{{ selectedExpense.reference_code }}</dd></div>
          <div v-if="selectedExpense.tax_amount_cents" class="flex justify-between py-2"><dt class="text-text-muted">Tax</dt><dd class="font-medium text-text-primary">KES {{ formatMoney(selectedExpense.tax_amount_cents) }}</dd></div>
        </dl>

        <p v-if="selectedExpense.notes" class="text-xs text-text-muted border-t border-border pt-3">{{ selectedExpense.notes }}</p>

        <div class="border-t border-border pt-3">
          <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted mb-2.5">
            <TagIcon class="w-3.5 h-3.5" />Tags
          </span>
          <div class="flex flex-wrap gap-1.5 mb-2.5">
            <span v-if="!assignedTags.length" class="text-xs text-text-muted">No tags yet</span>
            <span
              v-for="tag in assignedTags" :key="tag.id"
              class="flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-xs font-semibold"
              :style="{ backgroundColor: (tag.color || '#9CA3AF') + '22', color: tag.color || '#6B7280' }"
            >
              {{ tag.name }}
              <button type="button" class="hover:opacity-70 rounded-full p-0.5" @click="handleUnassignTag(tag)">
                <XIcon class="w-3 h-3" />
              </button>
            </span>
          </div>
          <div v-if="availableTagsToAssign().length" class="flex items-center gap-2">
            <select v-model="tagToAssign" class="h-8 flex-1 rounded-lg border border-input-border bg-input-bg px-2 text-xs">
              <option value="" disabled>Add a tag…</option>
              <option v-for="tag in availableTagsToAssign()" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
            <AppButton size="sm" variant="ghost" :loading="assigningTag" :disabled="!tagToAssign" @click="handleAssignTag">Add</AppButton>
          </div>
        </div>

        <div v-if="selectedExpense.receipt_url" class="border-t border-border pt-3">
          <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted mb-2.5">
            <FileTextIcon class="w-3.5 h-3.5" />Receipt
          </span>
          <a :href="selectedExpense.receipt_url" target="_blank" rel="noopener" class="block">
            <img
              v-if="!selectedExpense.receipt_url.endsWith('.pdf')"
              :src="selectedExpense.receipt_url" alt="Receipt"
              class="rounded-xl border border-border max-h-64 w-auto"
            />
            <span v-else class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              <FileTextIcon class="w-3.5 h-3.5" />View receipt PDF
            </span>
          </a>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>