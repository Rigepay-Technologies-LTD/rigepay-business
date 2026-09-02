<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchSupplier, updateSupplier, setSupplierStatus, rescreenSupplier, setSupplierVerification,
  fetchSupplierPayoutMethods, replaceSupplierPayoutMethods,
  fetchSupplierContacts, createSupplierContact, deleteSupplierContact,
  type Supplier, type SupplierPayoutMethod, type SupplierPayoutMethodInput,
  type SupplierContact, type SupplierContactInput,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import SupplierDocTabs from '@/components/suppliers/SupplierDocTabs.vue'
import {
  ArrowLeftIcon, RefreshCwIcon, ShieldCheckIcon, BanIcon, PlusIcon, Trash2Icon,
} from 'lucide-vue-next'

const props = defineProps<{
  orgId: string
  branchId?: string
  supplierId: string
}>()

const auth = useAuthStore()


const isBranch = computed(() => auth.meta?.memberType === 'branch_member')
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const isOwner = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType === 'org_member')

const loading = ref(true)
const supplier = ref<Supplier | null>(null)
const acting = ref(false)
const tab = ref<'overview' | 'invoices' | 'pos' | 'payments' | 'statement' | 'payout' | 'contacts' | 'risk'>('overview')
const docTabKeys = ['invoices', 'pos', 'payments', 'statement'] as const
const tabLabel: Record<string, string> = {
  overview: 'Overview', invoices: 'Invoices', pos: 'Purchase orders', payments: 'Payments',
  statement: 'Statement', payout: 'Payout details', contacts: 'Contacts', risk: 'Risk',
}

async function load() {
  loading.value = true
  try {
    supplier.value = await fetchSupplier(isBranch.value, props.supplierId)
    payoutMethods.value = (supplier.value.payout_methods ?? await fetchSupplierPayoutMethods(isBranch.value, props.supplierId)) ?? []
    contacts.value = (supplier.value.contacts ?? await fetchSupplierContacts(isBranch.value, props.supplierId)) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function apRoute(kind: 'payables' | 'invoices' | 'purchase-orders') {
  const map = {
    payables: isBranch.value ? 'branch-supplier-payables' : 'org-supplier-payables',
    invoices: isBranch.value ? 'branch-supplier-invoices' : 'org-supplier-invoices',
    'purchase-orders': isBranch.value ? 'branch-purchase-orders' : 'org-purchase-orders',
  }
  return isBranch.value
    ? { name: map[kind], params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: map[kind], params: { orgId: props.orgId } }
}

function backRoute() {
  return isBranch.value
    ? { name: 'branch-suppliers', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-suppliers', params: { orgId: props.orgId } }
}

function statusVariant(s: string) {
  if (s === 'ACTIVE') return 'success'
  if (s === 'SUSPENDED') return 'error'
  return 'neutral'
}
function verificationVariant(v: string) {
  if (v === 'VERIFIED') return 'success'
  if (v === 'PENDING') return 'warning'
  if (v === 'REJECTED') return 'error'
  return 'neutral'
}
function riskVariant(r: string) {
  if (r === 'HIGH') return 'error'
  if (r === 'ELEVATED') return 'warning'
  return 'neutral'
}

async function toggleStatus() {
  if (!supplier.value) return
  const target = supplier.value.status === 'SUSPENDED' ? 'reactivate' : 'suspend'
  const ok = await confirmAction({
    title: target === 'suspend' ? 'Suspend supplier' : 'Reactivate supplier',
    message: target === 'suspend'
      ? `Suspend ${supplier.value.legal_name}? You won't be able to raise new payables against them until reactivated.`
      : `Reactivate ${supplier.value.legal_name}?`,
    danger: target === 'suspend',
  })
  if (!ok) return
  acting.value = true
  try {
    supplier.value = await setSupplierStatus(isBranch.value, props.supplierId, target)
    showSuccess(target === 'suspend' ? 'Supplier suspended.' : 'Supplier reactivated.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

async function rescreen() {
  acting.value = true
  try {
    await rescreenSupplier(isBranch.value, props.supplierId)
    showSuccess('Screening re-queued — refresh in a moment.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

async function decideVerification(action: 'verify' | 'reject-verification') {
  acting.value = true
  try {
    supplier.value = await setSupplierVerification(props.supplierId, action)
    showSuccess(action === 'verify' ? 'Supplier verified.' : 'Verification rejected.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

const editing = ref(false)
const editForm = ref<Record<string, string | number>>({})
function startEdit() {
  if (!supplier.value) return
  editForm.value = {
    legal_name: supplier.value.legal_name,
    trading_name: supplier.value.trading_name,
    category: supplier.value.category,
    registration_number: supplier.value.registration_number,
    tax_number: supplier.value.tax_number,
    supplier_code: supplier.value.supplier_code,
    email: supplier.value.email,
    phone: supplier.value.phone,
    payment_terms_days: supplier.value.payment_terms_days,
    notes: supplier.value.notes,
  }
  editing.value = true
}
async function saveEdit() {
  acting.value = true
  try {
    supplier.value = await updateSupplier(isBranch.value, props.supplierId, editForm.value)
    editing.value = false
    showSuccess('Supplier updated.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

const payoutMethods = ref<SupplierPayoutMethod[]>([])
const editingPayout = ref(false)
const payoutDraft = ref<SupplierPayoutMethodInput[]>([])
function startPayoutEdit() {
  payoutDraft.value = payoutMethods.value.length
    ? payoutMethods.value.map((m) => ({
      method: m.method,
      label: m.label,
      currency: m.currency,
      country: m.country,
      phone_number: m.phone_number ?? '',
      bank_code: m.bank_code ?? '',
      bank_account_number: '',
      account_name: m.account_name,
      is_primary: m.is_primary,
      }))
    : [{ method: 'MOBILE_MONEY', currency: 'KES', country: 'KE', phone_number: '', is_primary: true }]
  editingPayout.value = true
}
function addPayoutRow() {
  payoutDraft.value.push({ method: 'MOBILE_MONEY', currency: 'KES', country: 'KE', phone_number: '' })
}
async function savePayout() {
  acting.value = true
  try {
    payoutMethods.value = (await replaceSupplierPayoutMethods(isBranch.value, props.supplierId, payoutDraft.value)) ?? []
    editingPayout.value = false
    showSuccess('Payout details saved.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

const contacts = ref<SupplierContact[]>([])
const showContactForm = ref(false)
const contactForm = ref<SupplierContactInput>({ name: '', email: '', phone: '', role: '', is_primary: false })
async function addContact() {
  if (!contactForm.value.name.trim()) { showError('Contact name is required.'); return }
  acting.value = true
  try {
    await createSupplierContact(isBranch.value, props.supplierId, contactForm.value)
    contactForm.value = { name: '', email: '', phone: '', role: '', is_primary: false }
    showContactForm.value = false
    contacts.value = (await fetchSupplierContacts(isBranch.value, props.supplierId)) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}
async function removeContact(cnt: SupplierContact) {
  const ok = await confirmAction({ title: 'Remove contact', message: `Remove ${cnt.name}?`, danger: true })
  if (!ok) return
  try {
    await deleteSupplierContact(isBranch.value, props.supplierId, cnt.id)
    contacts.value = contacts.value.filter((c) => c.id !== cnt.id)
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

const riskFlags = computed(() => (supplier.value?.risk_flags ?? []) as Array<Record<string, unknown>>)
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink :to="backRoute()" class="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary">
      <ArrowLeftIcon class="w-4 h-4" /> All suppliers
    </RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading supplier…</p>

    <template v-else-if="supplier">
      <div class="rounded-xl bg-surface border border-border shadow-sm p-6 flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-widest text-text-muted">{{ supplier.supplier_code || supplier.supplier_type }}</p>
            <h1 class="text-2xl font-bold text-text-primary tracking-tight">{{ supplier.legal_name }}</h1>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <AppBadge :variant="statusVariant(supplier.status)" size="sm">{{ supplier.status }}</AppBadge>
              <AppBadge :variant="verificationVariant(supplier.verification_status)" size="sm">{{ supplier.verification_status }}</AppBadge>
              <AppBadge :variant="riskVariant(supplier.risk_level_override ?? supplier.risk_level)" size="sm">
                {{ supplier.risk_level_override ?? supplier.risk_level }} RISK
              </AppBadge>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <RouterLink :to="apRoute('payables')">
              <AppButton variant="primary" size="sm">Pay</AppButton>
            </RouterLink>
            <RouterLink :to="apRoute('invoices')">
              <AppButton variant="secondary" size="sm">Add invoice</AppButton>
            </RouterLink>
            <RouterLink :to="apRoute('purchase-orders')">
              <AppButton variant="secondary" size="sm">Create PO</AppButton>
            </RouterLink>
            <AppButton variant="secondary" size="sm" :loading="acting" @click="rescreen">
              <template #icon><RefreshCwIcon class="w-3.5 h-3.5" /></template>
              Re-screen
            </AppButton>
            <template v-if="isOwner && supplier.verification_status !== 'VERIFIED'">
              <AppButton variant="primary" size="sm" :loading="acting" @click="decideVerification('verify')">
                <template #icon><ShieldCheckIcon class="w-3.5 h-3.5" /></template>
                Verify
              </AppButton>
            </template>
            <template v-if="isOwner && supplier.verification_status === 'PENDING'">
              <AppButton variant="secondary" size="sm" :loading="acting" @click="decideVerification('reject-verification')">Reject</AppButton>
            </template>
            <AppButton
              :variant="supplier.status === 'SUSPENDED' ? 'primary' : 'danger'"
              size="sm" :loading="acting" @click="toggleStatus"
            >
              <template #icon><BanIcon class="w-3.5 h-3.5" /></template>
              {{ supplier.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend' }}
            </AppButton>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 border-b border-border overflow-x-auto">
        <button
          v-for="t in (['overview', 'invoices', 'pos', 'payments', 'statement', 'payout', 'contacts', 'risk'] as const)"
          :key="t"
          class="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap"
          :class="tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
          @click="tab = t"
        >
          {{ tabLabel[t] }}
          <span v-if="t === 'risk' && riskFlags.length" class="ml-1 text-error">({{ riskFlags.length }})</span>
        </button>
      </div>

      <SupplierDocTabs
        v-if="docTabKeys.includes(tab as any)"
        :tab="tab as 'invoices' | 'pos' | 'payments' | 'statement'"
        :is-branch="isBranch"
        :org-id="props.orgId"
        :branch-id="props.branchId"
        :supplier-id="props.supplierId"
      />

      <!-- Overview -->
      <AppCard v-if="tab === 'overview'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Commercial profile</h2>
          <AppButton v-if="!editing" variant="ghost" size="sm" @click="startEdit">Edit</AppButton>
          <div v-else class="flex gap-2">
            <AppButton variant="ghost" size="sm" @click="editing = false">Cancel</AppButton>
            <AppButton variant="primary" size="sm" :loading="acting" @click="saveEdit">Save</AppButton>
          </div>
        </div>

        <dl v-if="!editing" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div class="flex justify-between"><dt class="text-text-muted">Legal name</dt><dd class="font-semibold text-text-primary">{{ supplier.legal_name }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Trading name</dt><dd class="font-semibold text-text-primary">{{ supplier.trading_name || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Category</dt><dd class="font-semibold text-text-primary">{{ supplier.category }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Registration</dt><dd class="font-semibold text-text-primary">{{ supplier.registration_number || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Tax number</dt><dd class="font-semibold text-text-primary">{{ supplier.tax_number || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Country</dt><dd class="font-semibold text-text-primary">{{ supplier.country }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Currency</dt><dd class="font-semibold text-text-primary">{{ supplier.preferred_currency }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Payment terms</dt><dd class="font-semibold text-text-primary">{{ supplier.payment_terms_days }} days</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Email</dt><dd class="font-semibold text-text-primary">{{ supplier.email || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Phone</dt><dd class="font-semibold text-text-primary">{{ supplier.phone || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Last screened</dt><dd class="font-semibold text-text-primary">{{ supplier.screened_at ? formatDate(supplier.screened_at) : 'Not yet' }}</dd></div>
        </dl>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model="editForm.legal_name as string" label="Legal name" />
          <AppInput v-model="editForm.trading_name as string" label="Trading name" />
          <AppInput v-model="editForm.category as string" label="Category" />
          <AppInput v-model="editForm.registration_number as string" label="Registration number" />
          <AppInput v-model="editForm.tax_number as string" label="Tax number" />
          <AppInput v-model="editForm.supplier_code as string" label="Supplier code" />
          <AppInput v-model="editForm.email as string" label="Email" type="email" />
          <AppInput v-model="editForm.phone as string" label="Phone" />
          <AppInput v-model.number="editForm.payment_terms_days as number" label="Payment terms (days)" type="number" />
          <AppInput v-model="editForm.notes as string" label="Notes" />
        </div>
      </AppCard>

      <!-- Payout details -->
      <AppCard v-else-if="tab === 'payout'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Payout details</h2>
          <AppButton v-if="!editingPayout" variant="ghost" size="sm" @click="startPayoutEdit">Edit</AppButton>
          <div v-else class="flex gap-2">
            <AppButton variant="ghost" size="sm" @click="editingPayout = false">Cancel</AppButton>
            <AppButton variant="primary" size="sm" :loading="acting" @click="savePayout">Save</AppButton>
          </div>
        </div>

        <p v-if="!editingPayout && !payoutMethods.length" class="text-sm text-text-muted">No payout method set yet.</p>
        <div v-else-if="!editingPayout" class="flex flex-col gap-3">
          <div v-for="m in payoutMethods" :key="m.id" class="rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-text-primary">
                {{ m.method.replace('_', ' ') }}
                <AppBadge v-if="m.is_primary" variant="primary" size="sm" class="ml-1">Primary</AppBadge>
              </p>
              <p class="text-xs text-text-muted mt-0.5">
                {{ m.method === 'BANK' ? `${m.bank_code} · ${m.bank_account_number}` : m.phone_number }} · {{ m.currency }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col gap-4">
          <div v-for="(row, i) in payoutDraft" :key="i" class="rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect
              v-model="row.method"
              label="Method"
              :options="[
                { value: 'MOBILE_MONEY', label: 'Mobile money' },
                { value: 'BANK', label: 'Bank' },
                { value: 'PAYBILL', label: 'Paybill' },
                { value: 'TILL', label: 'Till' },
              ]"
            />
            <AppInput v-model="row.currency" label="Currency" />
            <template v-if="row.method === 'BANK'">
              <AppInput v-model="row.bank_code" label="Bank code" />
              <AppInput v-model="row.bank_account_number" label="Account number" />
              <AppInput v-model="row.account_name" label="Account name" />
            </template>
            <template v-else>
              <AppInput v-model="row.phone_number" label="Phone number" />
            </template>
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input type="radio" name="primary-payout" :checked="row.is_primary" @change="payoutDraft.forEach((r, j) => r.is_primary = j === i)" />
              Primary
            </label>
          </div>
          <AppButton variant="secondary" size="sm" @click="addPayoutRow">
            <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>
            Add method
          </AppButton>
        </div>
      </AppCard>

      <!-- Contacts -->
      <AppCard v-else-if="tab === 'contacts'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Contacts</h2>
          <AppButton variant="ghost" size="sm" @click="showContactForm = !showContactForm">
            <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>
            Add
          </AppButton>
        </div>

        <div v-if="showContactForm" class="rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <AppInput v-model="contactForm.name" label="Name" required />
          <AppInput v-model="contactForm.role" label="Role" />
          <AppInput v-model="contactForm.email" label="Email" type="email" />
          <AppInput v-model="contactForm.phone" label="Phone" />
          <div class="sm:col-span-2 flex justify-end gap-2">
            <AppButton variant="ghost" size="sm" @click="showContactForm = false">Cancel</AppButton>
            <AppButton variant="primary" size="sm" :loading="acting" @click="addContact">Save contact</AppButton>
          </div>
        </div>

        <p v-if="!contacts.length" class="text-sm text-text-muted">No contacts yet.</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="cnt in contacts" :key="cnt.id" class="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-text-primary">{{ cnt.name }} <span v-if="cnt.role" class="text-text-muted font-normal">· {{ cnt.role }}</span></p>
              <p class="text-xs text-text-muted">{{ [cnt.email, cnt.phone].filter(Boolean).join(' · ') || '—' }}</p>
            </div>
            <button class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors" @click="removeContact(cnt)">
              <Trash2Icon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </AppCard>

      <!-- Risk -->
      <AppCard v-else-if="tab === 'risk'">
        <h2 class="text-sm font-bold text-text-primary mb-1">Risk</h2>
        <p class="text-sm text-text-secondary mb-4">
          Level: <span class="font-semibold">{{ supplier.risk_level_override ?? supplier.risk_level }}</span>
          <span class="text-text-muted"> · {{ supplier.screening_match_count }} screening match(es)</span>
        </p>
        <p v-if="!riskFlags.length" class="text-sm text-text-muted">No risk flags.</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="(flag, i) in riskFlags" :key="i" class="rounded-xl bg-error-light px-4 py-3 text-sm">
            <p class="font-semibold text-error-text">{{ flag.type ?? 'FLAG' }}</p>
            <p class="text-xs text-text-secondary mt-0.5">
              <template v-if="flag.list_names">{{ (flag.list_names as string[]).join(', ') }} · </template>
              score {{ typeof flag.score === 'number' ? (flag.score as number).toFixed(2) : flag.score }}
              <template v-if="flag.matched_field"> · matched {{ flag.matched_field }}</template>
            </p>
          </div>
        </div>
      </AppCard>
    </template>
  </div>
</template>
