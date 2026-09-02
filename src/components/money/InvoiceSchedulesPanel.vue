<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  createInvoiceSchedule, fetchInvoiceSchedules, patchInvoiceSchedule,
  type InvoiceScheduleRecipientInput, type InvoiceSchedule,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { useRecipientHistory } from '@/composables/useRecipientHistory'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, TrashIcon, RepeatIcon } from 'lucide-vue-next'

const props = defineProps<{ isBranch?: boolean; branchId?: string }>()

const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const { recipients: recipientHistory, loadRecipientHistory } = useRecipientHistory(props.isBranch)

const loading = ref(true)
const schedules = ref<InvoiceSchedule[]>([])

async function load() {
  loading.value = true
  try {
    schedules.value = (await fetchInvoiceSchedules(props.isBranch)) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const summary = computed(() => {
  const active = schedules.value.filter((s) => s.status === 'active').length
  const perRun = schedules.value
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.recipients ?? []).reduce((n, r) => n + r.amount_cents, 0), 0)
  return { total: schedules.value.length, active, perRun }
})

interface EditableRecipient {
  key: number
  email: string
  name: string
  amount_kes: string
  due_offset_days: string
  description: string
  tax_category: string
}

const TAX_CATEGORY_OPTIONS = [
  { value: 'EXEMPT', label: 'Exempt (no VAT)' },
  { value: 'A', label: 'Taxable (16% VAT)' },
]

let nextKey = 1
function blankRecipient(): EditableRecipient {
  return { key: nextKey++, email: '', name: '', amount_kes: '', due_offset_days: '7', description: '', tax_category: 'EXEMPT' }
}
const recipients = ref<EditableRecipient[]>([blankRecipient()])
function addRecipient() { recipients.value.push(blankRecipient()) }
function removeRecipient(key: number) { recipients.value = recipients.value.filter((r) => r.key !== key) }

const name = ref('')
const nextRunDate = ref('')
const showCreate = ref(false)
const formError = ref<string | null>(null)
const creating = ref(false)

function openCreate() {
  name.value = ''
  nextRunDate.value = ''
  nextKey = 1
  recipients.value = [blankRecipient()]
  formError.value = null
  showCreate.value = true
  loadRecipientHistory()
}

function pickRecipient(row: EditableRecipient) {
  const match = recipientHistory.value.find((r) => r.email === row.email.trim())
  if (match && match.name && !row.name.trim()) row.name = match.name
}

function buildRecipients(): InvoiceScheduleRecipientInput[] | null {
  const out: InvoiceScheduleRecipientInput[] = []
  for (let i = 0; i < recipients.value.length; i++) {
    const r = recipients.value[i]
    if (!r.email.trim() && !r.amount_kes) continue
    const amountCents = Math.round(Number(r.amount_kes) * 100)
    if (!amountCents || amountCents < 100) { formError.value = `Row ${i + 1}: enter a valid amount (min KES 1).`; return null }
    if (!r.email.trim()) { formError.value = `Row ${i + 1}: email is required.`; return null }
    out.push({
      email: r.email.trim(),
      name: r.name.trim() || undefined,
      amount_cents: amountCents,
      due_offset_days: Number(r.due_offset_days) || 7,
      description: r.description.trim() || undefined,
      tax_category: r.tax_category,
    })
  }
  return out
}

async function submitCreate() {
  formError.value = null
  if (!nextRunDate.value) { formError.value = 'First run date is required.'; return }
  const built = buildRecipients()
  if (!built) return
  if (built.length === 0) { formError.value = 'Add at least one recipient.'; return }
  creating.value = true
  try {
    await createInvoiceSchedule({
      branch_id: props.isBranch ? props.branchId : undefined,
      name: name.value.trim() || undefined,
      recurrence: 'monthly',
      next_run_date: nextRunDate.value,
      recipients: built,
    }, props.isBranch)
    showSuccess('Recurring invoice schedule created.')
    showCreate.value = false
    await load()
  } catch (err) {
    formError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const actionLoading = ref<string | null>(null)

async function runAction(s: InvoiceSchedule, action: 'pause' | 'resume' | 'cancel') {
  if (action === 'cancel') {
    const ok = await confirmAction({
      title: 'Cancel this schedule?',
      message: `"${s.name || 'This recurring invoice schedule'}" will stop running. This cannot be undone.`,
      confirmLabel: 'Cancel schedule',
      cancelLabel: 'Keep it',
      danger: true,
    })
    if (!ok) return
  }
  actionLoading.value = s.id
  try {
    await patchInvoiceSchedule(s.id, { action }, props.isBranch)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    actionLoading.value = null
  }
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'paused_insufficient_funds' || status === 'paused_manual') return 'warning'
  if (status === 'cancelled') return 'error'
  return 'neutral'
}
function statusLabel(status: string): string {
  return { active: 'Active', paused_insufficient_funds: 'Paused — low balance', paused_manual: 'Paused', cancelled: 'Cancelled' }[status] ?? status
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Billing</p>
        <h1 class="text-lg font-bold text-text-primary mt-0.5">Invoice schedules</h1>
        <p class="text-sm text-text-muted mt-0.5 max-w-xl">
          Automatically create and send a recipient list every month
          {{ props.isBranch ? "from this branch's wallet" : '' }}. A run is paused automatically if the balance
          can't cover it — you'll be notified.
        </p>
      </div>
      <AppButton size="sm" @click="openCreate">
        <template #icon><PlusIcon class="w-4 h-4" /></template>
        New schedule
      </AppButton>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Schedules</p>
        <p class="text-lg font-bold text-text-primary">{{ summary.total }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Active</p>
        <p class="text-lg font-bold text-success">{{ summary.active }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Value per month</p>
        <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(summary.perRun) }}</p>
      </AppCard>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Loading schedules…</p>
    <AppCard v-else-if="!schedules.length" padding="none">
      <div class="px-5 py-12 text-center">
        <RepeatIcon class="w-8 h-8 mx-auto text-text-muted/40" />
        <p class="text-sm text-text-muted mt-2">No recurring schedules yet.</p>
        <AppButton size="sm" class="mt-4" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New schedule
        </AppButton>
      </div>
    </AppCard>

    <div v-else class="flex flex-col gap-3">
      <AppCard v-for="s in schedules" :key="s.id">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">{{ s.name || 'Untitled schedule' }}</p>
            <p class="text-xs text-text-muted mt-0.5">
              {{ s.recipients?.length ?? 0 }} recipient(s) · monthly · next run {{ formatDate(s.next_run_date) }}
            </p>
            <p class="text-xs text-text-muted mt-0.5">
              Total per run: KES {{ formatMoney((s.recipients ?? []).reduce((sum, r) => sum + r.amount_cents, 0)) }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <AppBadge :variant="statusVariant(s.status)" size="sm">{{ statusLabel(s.status) }}</AppBadge>
            <AppButton v-if="s.status === 'active'" size="sm" variant="secondary" :loading="actionLoading === s.id" @click="runAction(s, 'pause')">Pause</AppButton>
            <AppButton v-if="s.status === 'paused_manual' || s.status === 'paused_insufficient_funds'" size="sm" variant="secondary" :loading="actionLoading === s.id" @click="runAction(s, 'resume')">Resume</AppButton>
            <AppButton v-if="s.status !== 'cancelled'" size="sm" variant="ghost" :loading="actionLoading === s.id" @click="runAction(s, 'cancel')">Cancel</AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showCreate" title="New recurring schedule" size="full">
      <div class="flex flex-col gap-4">
        <div v-if="formError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ formError }}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppInput v-model="name" label="Schedule name (optional)" placeholder="e.g. Monthly rent roll" />
          <AppInput v-model="nextRunDate" type="date" label="First run date" required />
        </div>

        <datalist id="invoice-schedule-recipient-history">
          <option v-for="r in recipientHistory" :key="r.email" :value="r.email">{{ r.name || r.email }}</option>
        </datalist>

        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border bg-surface-2/40">
                <th class="px-3 py-2 w-10">#</th>
                <th class="px-3 py-2">Email</th>
                <th class="px-3 py-2">Name</th>
                <th class="px-3 py-2 w-28">Amount (KES)</th>
                <th class="px-3 py-2 w-28">Due (days after run)</th>
                <th class="px-3 py-2">Description</th>
                <th class="px-3 py-2 w-32">VAT</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in recipients" :key="r.key" class="border-b border-border last:border-0 align-top">
                <td class="px-3 py-2.5 text-text-muted">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 min-w-50"><AppInput v-model="r.email" placeholder="jane@example.com" list="invoice-schedule-recipient-history" @change="pickRecipient(r)" /></td>
                <td class="px-3 py-2.5 min-w-35"><AppInput v-model="r.name" placeholder="Optional" /></td>
                <td class="px-3 py-2.5 min-w-27.5"><AppInput v-model="r.amount_kes" type="number" placeholder="0" /></td>
                <td class="px-3 py-2.5 min-w-27.5"><AppInput v-model="r.due_offset_days" type="number" placeholder="7" /></td>
                <td class="px-3 py-2.5 min-w-40"><AppInput v-model="r.description" placeholder="e.g. Unit 4B rent" /></td>
                <td class="px-3 py-2.5 min-w-32"><AppSelect v-model="r.tax_category" :options="TAX_CATEGORY_OPTIONS" /></td>
                <td class="px-3 py-2.5">
                  <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors" :disabled="recipients.length <= 1" @click="removeRecipient(r.key)">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppButton type="button" size="sm" variant="secondary" class="self-start" @click="addRecipient">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Add recipient
        </AppButton>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="ghost" @click="showCreate = false">Cancel</AppButton>
          <AppButton type="button" :loading="creating" @click="submitCreate">Create schedule</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
