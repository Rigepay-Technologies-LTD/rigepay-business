<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchCrmCustomer, updateCrmCustomer, setCrmCustomerStatus, setCrmCustomerVerification,
  fetchCrmCustomerContacts, createCrmCustomerContact, deleteCrmCustomerContact,
  fetchCrmCustomerPaymentMethods, replaceCrmCustomerPaymentMethods,
  fetchCrmCustomerStatement, fetchCrmCustomerInvites, inviteCrmCustomer,
  type CrmCustomer, type CrmCustomerContact, type CrmCustomerPaymentMethod, type CrmPaymentMethodInput,
  type CrmCustomerStatement, type CrmCustomerInvite,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ChevronLeftIcon, ShieldCheckIcon, BanIcon, PlusIcon, Trash2Icon, SendIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; customerId: string; listRouteName: string }>()

const router = useRouter()
const auth = useAuthStore()
const isBranch = computed(() => auth.meta?.memberType === 'branch_member')
const isOwner = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType === 'org_member')
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const loading = ref(true)
const acting = ref(false)
const customer = ref<CrmCustomer | null>(null)
const contacts = ref<CrmCustomerContact[]>([])
const methods = ref<CrmCustomerPaymentMethod[]>([])

const tab = ref<'overview' | 'contacts' | 'payment' | 'statement' | 'activity' | 'settings'>('overview')
const tabLabel: Record<string, string> = {
  overview: 'Overview', contacts: 'Contacts', payment: 'Payment details',
  statement: 'Statement', activity: 'Activity', settings: 'Settings',
}

const statement = ref<CrmCustomerStatement | null>(null)
const statementLoading = ref(false)
async function loadStatement() {
  if (statement.value) return
  statementLoading.value = true
  try {
    statement.value = await fetchCrmCustomerStatement(isBranch.value, props.customerId)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    statementLoading.value = false
  }
}

const invites = ref<CrmCustomerInvite[]>([])
async function loadInvites() {
  try {
    invites.value = await fetchCrmCustomerInvites(isBranch.value, props.customerId)
  } catch { /* ignore */ }
}

const inviting = ref(false)
async function sendInvite() {
  inviting.value = true
  try {
    const res = await inviteCrmCustomer(isBranch.value, props.customerId, customer.value?.email || undefined)
    showSuccess(`Invite sent. Link: ${res.link}`)
    await loadInvites()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    inviting.value = false
  }
}

function inviteStatusVariant(s: string) {
  if (s === 'ACCEPTED') return 'success'
  if (s === 'PENDING') return 'warning'
  return 'neutral'
}

function activityFeed() {
  const items: { at: string; text: string }[] = []
  if (customer.value) items.push({ at: customer.value.created_at, text: 'Customer added' })
  for (const inv of invites.value) {
    items.push({ at: inv.created_at, text: `Onboarding invite sent to ${inv.email || '—'}` })
    if (inv.accepted_at) items.push({ at: inv.accepted_at, text: 'Customer submitted onboarding details' })
  }
  for (const iv of statement.value?.invoices ?? []) {
    items.push({ at: iv.created_at, text: `Invoice ${iv.invoice_number} raised — ${iv.currency} ${formatMoney(iv.total_cents)}` })
    if (iv.paid_at) items.push({ at: iv.paid_at, text: `Invoice ${iv.invoice_number} paid` })
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

watch(tab, (t) => {
  if (t === 'statement' || t === 'activity') { loadStatement(); loadInvites() }
})

async function load() {
  loading.value = true
  try {
    customer.value = await fetchCrmCustomer(isBranch.value, props.customerId)
    contacts.value = customer.value.contacts ?? await fetchCrmCustomerContacts(isBranch.value, props.customerId)
    methods.value = customer.value.payment_methods ?? await fetchCrmCustomerPaymentMethods(isBranch.value, props.customerId)
    syncSettings()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function goBack() {
  router.push({
    name: props.listRouteName,
    params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId },
  })
}

function statusVariant(s?: string) {
  if (s === 'ACTIVE') return 'success'
  if (s === 'SUSPENDED') return 'error'
  return 'neutral'
}
function verificationVariant(v?: string) {
  if (v === 'VERIFIED') return 'success'
  if (v === 'PENDING') return 'warning'
  if (v === 'REJECTED') return 'error'
  return 'neutral'
}

async function changeStatus(action: 'suspend' | 'reactivate' | 'archive') {
  if (action === 'archive') {
    const ok = await confirmAction({
      title: 'Archive this customer?', message: 'They stay on record but are hidden from the active list.',
      confirmLabel: 'Archive', cancelLabel: 'Keep active', danger: true,
    })
    if (!ok) return
  }
  acting.value = true
  try {
    customer.value = await setCrmCustomerStatus(isBranch.value, props.customerId, action)
    showSuccess('Customer updated.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

async function changeVerification(action: 'verify' | 'reject-verification') {
  acting.value = true
  try {
    customer.value = await setCrmCustomerVerification(props.customerId, action)
    showSuccess(action === 'verify' ? 'Customer verified.' : 'Verification rejected.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

const overviewRows = computed(() => {
  const c = customer.value
  if (!c) return []
  return [
    { label: 'Customer code', value: c.customer_code || '—' },
    { label: 'Type', value: c.customer_type },
    { label: 'Category', value: c.category },
    { label: 'Legal name', value: c.legal_name },
    { label: 'Trading name', value: c.trading_name || '—' },
    { label: 'Registration number', value: c.registration_number || '—' },
    { label: 'Tax number', value: c.tax_number || '—' },
    { label: 'Email', value: c.email || '—' },
    { label: 'Phone', value: c.phone || '—' },
    { label: 'Country', value: c.country },
    { label: 'Preferred currency', value: c.preferred_currency },
    { label: 'Payment terms', value: `${c.payment_terms_days} days` },
    { label: 'Credit limit', value: c.credit_limit_cents ? `KES ${formatMoney(c.credit_limit_cents)}` : 'None' },
    { label: 'Outstanding', value: `KES ${formatMoney(c.outstanding_cents ?? 0)}` },
    { label: 'Billing address', value: c.billing_address || '—' },
    { label: 'Added', value: formatDate(c.created_at) },
    { label: 'Last invoice', value: c.last_invoice_at ? formatDate(c.last_invoice_at) : '—' },
  ]
})

// ── contacts ──
const newContact = reactive({ name: '', email: '', phone: '', role: '', is_primary: false })
const addingContact = ref(false)

async function addContact() {
  if (!newContact.name.trim()) { showError('Contact name is required.'); return }
  addingContact.value = true
  try {
    await createCrmCustomerContact(isBranch.value, props.customerId, { ...newContact })
    newContact.name = ''; newContact.email = ''; newContact.phone = ''; newContact.role = ''; newContact.is_primary = false
    contacts.value = await fetchCrmCustomerContacts(isBranch.value, props.customerId)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    addingContact.value = false
  }
}
async function removeContact(cnt: CrmCustomerContact) {
  const ok = await confirmAction({ title: 'Remove contact?', message: `Remove ${cnt.name}?`, confirmLabel: 'Remove', danger: true })
  if (!ok) return
  try {
    await deleteCrmCustomerContact(isBranch.value, props.customerId, cnt.id)
    contacts.value = contacts.value.filter((x) => x.id !== cnt.id)
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

// ── payment methods ──
const METHOD_OPTIONS = [
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'BANK', label: 'Bank account' },
  { value: 'PAYBILL', label: 'Paybill' },
  { value: 'TILL', label: 'Till' },
  { value: 'CARD', label: 'Card' },
]
const draftMethods = ref<CrmPaymentMethodInput[]>([])
const savingMethods = ref(false)

function syncMethods() {
  draftMethods.value = methods.value.map((m) => ({
    method: m.method, label: m.label, currency: m.currency, country: m.country,
    phone_number: m.phone_number ?? '', bank_code: m.bank_code ?? '', bank_account_number: m.bank_account_number ?? '',
    paybill_number: m.paybill_number ?? '', till_number: m.till_number ?? '', account_name: m.account_name,
    is_primary: m.is_primary,
  }))
}
function addMethod() {
  draftMethods.value.push({ method: 'MOBILE_MONEY', label: '', currency: 'KES', country: 'KE', account_name: '', is_primary: draftMethods.value.length === 0 })
}
function removeMethod(i: number) { draftMethods.value.splice(i, 1) }
async function saveMethods() {
  savingMethods.value = true
  try {
    methods.value = await replaceCrmCustomerPaymentMethods(isBranch.value, props.customerId, draftMethods.value)
    syncMethods()
    showSuccess('Payment details saved.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    savingMethods.value = false
  }
}

// ── settings ──
const settings = reactive({
  legal_name: '', trading_name: '', category: 'GENERAL', email: '', phone: '',
  billing_address: '', payment_terms_days: 30, credit_limit_kes: '', notes: '',
})
const savingSettings = ref(false)

function syncSettings() {
  const c = customer.value
  if (!c) return
  settings.legal_name = c.legal_name
  settings.trading_name = c.trading_name
  settings.category = c.category
  settings.email = c.email
  settings.phone = c.phone
  settings.billing_address = c.billing_address
  settings.payment_terms_days = c.payment_terms_days
  settings.credit_limit_kes = c.credit_limit_cents ? String(c.credit_limit_cents / 100) : ''
  settings.notes = c.notes
  syncMethods()
}

async function saveSettings() {
  savingSettings.value = true
  try {
    customer.value = await updateCrmCustomer(isBranch.value, props.customerId, {
      legal_name: settings.legal_name.trim(),
      trading_name: settings.trading_name.trim(),
      category: settings.category,
      email: settings.email.trim(),
      phone: settings.phone.trim(),
      billing_address: settings.billing_address.trim(),
      payment_terms_days: Number(settings.payment_terms_days) || 0,
      credit_limit_cents: settings.credit_limit_kes.trim() ? Math.round(Number(settings.credit_limit_kes) * 100) : 0,
      notes: settings.notes.trim(),
    })
    showSuccess('Customer saved.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    savingSettings.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary self-start" @click="goBack">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Customers
    </button>

    <p v-if="loading" class="text-sm text-text-muted">Loading customer…</p>

    <template v-else-if="customer">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {{ customer.customer_code }} · {{ customer.customer_type }}
          </p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">{{ customer.trading_name || customer.legal_name }}</h1>
          <div class="flex items-center gap-2 mt-2">
            <AppBadge :variant="statusVariant(customer.status)" size="sm">{{ customer.status }}</AppBadge>
            <AppBadge :variant="verificationVariant(customer.verification_status)" size="sm">{{ customer.verification_status }}</AppBadge>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 justify-end">
          <AppButton v-if="isOwner && customer.verification_status !== 'VERIFIED'" size="sm" variant="secondary" :loading="acting" @click="changeVerification('verify')">
            <template #icon><ShieldCheckIcon class="w-3.5 h-3.5" /></template>Verify
          </AppButton>
          <AppButton v-if="isOwner && customer.verification_status === 'PENDING'" size="sm" variant="ghost" :loading="acting" @click="changeVerification('reject-verification')">
            Reject
          </AppButton>
          <AppButton size="sm" variant="secondary" :loading="inviting" @click="sendInvite">
            <template #icon><SendIcon class="w-3.5 h-3.5" /></template>Invite
          </AppButton>
          <AppButton v-if="customer.status === 'ACTIVE'" size="sm" variant="secondary" :loading="acting" @click="changeStatus('suspend')">
            <template #icon><BanIcon class="w-3.5 h-3.5" /></template>Suspend
          </AppButton>
          <AppButton v-if="customer.status === 'SUSPENDED'" size="sm" variant="secondary" :loading="acting" @click="changeStatus('reactivate')">Reactivate</AppButton>
          <AppButton v-if="customer.status !== 'ARCHIVED'" size="sm" variant="ghost" :loading="acting" @click="changeStatus('archive')">Archive</AppButton>
        </div>
      </div>

      <div class="flex gap-1 border-b border-border">
        <button
          v-for="t in (['overview', 'contacts', 'payment', 'statement', 'activity', 'settings'] as const)"
          :key="t"
          class="px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors"
          :class="tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
          @click="tab = t"
        >{{ tabLabel[t] }}</button>
      </div>

      <AppCard v-if="tab === 'overview'">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          <div v-for="row in overviewRows" :key="row.label" class="flex flex-col">
            <dt class="text-[10px] font-bold uppercase tracking-widest text-text-muted">{{ row.label }}</dt>
            <dd class="text-sm text-text-primary break-words">{{ row.value }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard v-else-if="tab === 'contacts'">
        <div class="flex flex-col gap-3">
          <p v-if="!contacts.length" class="text-sm text-text-muted">No contacts yet.</p>
          <div v-for="cnt in contacts" :key="cnt.id" class="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-text-primary">
                {{ cnt.name }}
                <AppBadge v-if="cnt.is_primary" variant="primary" size="sm" class="ml-1">Primary</AppBadge>
              </p>
              <p class="text-xs text-text-muted">{{ [cnt.role, cnt.email, cnt.phone].filter(Boolean).join(' · ') || '—' }}</p>
            </div>
            <button class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light" @click="removeContact(cnt)">
              <Trash2Icon class="w-4 h-4" />
            </button>
          </div>

          <div class="border-t border-border pt-4 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="newContact.name" label="Name" />
            <AppInput v-model="newContact.role" label="Role" />
            <AppInput v-model="newContact.email" label="Email" type="email" />
            <AppInput v-model="newContact.phone" label="Phone" />
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="newContact.is_primary" type="checkbox" class="rounded border-border" /> Primary contact
            </label>
          </div>
          <AppButton size="sm" class="self-start" :loading="addingContact" @click="addContact">
            <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>Add contact
          </AppButton>
        </div>
      </AppCard>

      <AppCard v-else-if="tab === 'payment'">
        <div class="flex flex-col gap-4">
          <p class="text-xs text-text-muted">
            Saved payout / collection details for this customer — used to prefill payouts and refunds to them.
          </p>
          <div v-for="(m, i) in draftMethods" :key="i" class="rounded-xl border border-border p-4 flex flex-col gap-3">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AppSelect v-model="m.method" label="Method" :options="METHOD_OPTIONS" />
              <AppInput v-model="m.label" label="Label" />
              <AppInput v-model="m.account_name" label="Account name" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AppInput v-if="m.method === 'MOBILE_MONEY'" v-model="m.phone_number" label="Phone number" />
              <template v-else-if="m.method === 'BANK'">
                <AppInput v-model="m.bank_code" label="Bank code" />
                <AppInput v-model="m.bank_account_number" label="Account number" />
              </template>
              <AppInput v-else-if="m.method === 'PAYBILL'" v-model="m.paybill_number" label="Paybill number" />
              <AppInput v-else-if="m.method === 'TILL'" v-model="m.till_number" label="Till number" />
              <AppInput v-model="m.currency" label="Currency" />
            </div>
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="m.is_primary" type="checkbox" class="rounded border-border" /> Primary
              </label>
              <button class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light" @click="removeMethod(i)">
                <Trash2Icon class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" @click="addMethod">
              <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>Add method
            </AppButton>
            <AppButton size="sm" :loading="savingMethods" @click="saveMethods">Save payment details</AppButton>
          </div>
        </div>
      </AppCard>

      <template v-else-if="tab === 'statement'">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Invoiced</p>
            <p class="text-base font-bold text-text-primary">KES {{ formatMoney(statement?.total_invoiced_cents ?? 0) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Paid</p>
            <p class="text-base font-bold text-success">KES {{ formatMoney(statement?.total_paid_cents ?? 0) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Outstanding</p>
            <p class="text-base font-bold text-text-primary">KES {{ formatMoney(statement?.outstanding_cents ?? 0) }}</p>
          </AppCard>
          <AppCard padding="sm">
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Overdue</p>
            <p class="text-base font-bold text-error">KES {{ formatMoney(statement?.overdue_cents ?? 0) }}</p>
          </AppCard>
        </div>
        <AppCard padding="none" class="mt-3">
          <p v-if="statementLoading" class="text-sm text-text-muted px-5 py-6">Loading…</p>
          <p v-else-if="!statement?.invoices.length" class="text-sm text-text-muted px-5 py-6">
            No invoices raised for this customer yet. Pick this customer when creating an invoice to link it here.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                  <th class="px-5 py-2.5">Invoice</th>
                  <th class="px-5 py-2.5">Raised</th>
                  <th class="px-5 py-2.5">Due</th>
                  <th class="px-5 py-2.5">Status</th>
                  <th class="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="iv in statement.invoices" :key="iv.id" class="border-b border-border last:border-0">
                  <td class="px-5 py-2.5 font-medium text-text-primary">{{ iv.invoice_number }}</td>
                  <td class="px-5 py-2.5 text-text-muted">{{ formatDate(iv.created_at) }}</td>
                  <td class="px-5 py-2.5 text-text-muted">{{ formatDate(iv.due_date) }}</td>
                  <td class="px-5 py-2.5"><AppBadge :variant="iv.status === 'PAID' ? 'success' : iv.status === 'OVERDUE' ? 'error' : 'warning'" size="sm">{{ iv.status }}</AppBadge></td>
                  <td class="px-5 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">{{ iv.currency }} {{ formatMoney(iv.total_cents) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </template>

      <AppCard v-else-if="tab === 'activity'">
        <p v-if="statementLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="!activityFeed().length" class="text-sm text-text-muted">No activity yet.</div>
        <ol v-else class="flex flex-col gap-3">
          <li v-for="(a, i) in activityFeed()" :key="i" class="flex gap-3 text-sm">
            <span class="text-text-muted whitespace-nowrap text-xs pt-0.5 w-32 shrink-0">{{ formatDate(a.at) }}</span>
            <span class="text-text-primary">{{ a.text }}</span>
          </li>
        </ol>
        <div v-if="invites.length" class="mt-5 border-t border-border pt-4">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Onboarding invites</p>
          <div v-for="inv in invites" :key="inv.id" class="flex items-center justify-between text-sm py-1">
            <span class="text-text-secondary">{{ inv.email || '—' }} · {{ formatDate(inv.created_at) }}</span>
            <AppBadge :variant="inviteStatusVariant(inv.status)" size="sm">{{ inv.status }}</AppBadge>
          </div>
        </div>
      </AppCard>

      <AppCard v-else-if="tab === 'settings'">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model="settings.legal_name" label="Legal name" />
          <AppInput v-model="settings.trading_name" label="Trading name" />
          <AppInput v-model="settings.category" label="Category" />
          <AppInput v-model="settings.email" label="Email" type="email" />
          <AppInput v-model="settings.phone" label="Phone" />
          <AppInput v-model.number="settings.payment_terms_days" label="Payment terms (days)" type="number" />
          <AppInput v-model="settings.credit_limit_kes" label="Credit limit (KES)" type="number" />
          <AppInput v-model="settings.billing_address" label="Billing address" />
        </div>
        <AppInput v-model="settings.notes" label="Internal notes" class="mt-4" />
        <AppButton class="mt-4" :loading="savingSettings" @click="saveSettings">Save changes</AppButton>
      </AppCard>
    </template>
  </div>
</template>
