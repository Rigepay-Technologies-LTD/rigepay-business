<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchSuppliers, createSupplier, createSupplierInvite,
  type Supplier, type SupplierInput, type SupplierListResponse,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, SearchIcon, TruckIcon } from 'lucide-vue-next'

const props = defineProps<{
  branchId?: string
  orgId: string
}>()

const router = useRouter()
const auth = useAuthStore()
const { showError, showSuccess } = useResponseModal()


const useBranchApi = computed(() => auth.meta?.memberType === 'branch_member')
const branchScope = computed(() => (useBranchApi.value ? undefined : props.branchId))

const loading = ref(true)
const data = ref<SupplierListResponse | null>(null)
const search = ref('')
const statusFilter = ref('')
const verificationFilter = ref('')
const readinessFilter = ref('')
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    data.value = await fetchSuppliers(useBranchApi.value, {
      q: search.value.trim() || undefined,
      status: statusFilter.value || undefined,
      verification: verificationFilter.value || undefined,
      readiness: readinessFilter.value || undefined,
      branch_id: branchScope.value,
      page: page.value,
      page_size: 20,
    })
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([statusFilter, verificationFilter, readinessFilter, page], load)
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
})

const suppliers = computed(() => data.value?.suppliers ?? [])
const totalPages = computed(() => data.value?.total_pages ?? 1)

function detailRoute(s: Supplier) {
  return props.branchId
    ? { name: 'branch-supplier-detail', params: { orgId: props.orgId, branchId: props.branchId, supplierId: s.id } }
    : { name: 'org-supplier-detail', params: { orgId: props.orgId, supplierId: s.id } }
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
function readinessVariant(r?: string) {
  if (r === 'READY') return 'success'
  if (r === 'NOT_READY') return 'neutral'
  return 'warning'
}
function readinessLabel(r?: string) {
  switch (r) {
    case 'READY': return 'Ready'
    case 'PENDING_VERIFICATION': return 'Pending verification'
    case 'NO_PAYOUT_METHOD': return 'No payout method'
    default: return 'Not ready'
  }
}

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'LOGISTICS', label: 'Logistics & transport' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'PROFESSIONAL', label: 'Professional services' },
  { value: 'CONSTRUCTION', label: 'Construction & contractors' },
  { value: 'IT', label: 'IT & software' },
  { value: 'OTHER', label: 'Other' },
]
const COUNTRY_OPTIONS = [
  { value: 'KE', label: 'Kenya (KE)' },
  { value: 'UG', label: 'Uganda (UG)' },
  { value: 'TZ', label: 'Tanzania (TZ)' },
  { value: 'RW', label: 'Rwanda (RW)' },
  { value: 'US', label: 'United States (US)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
]
const CURRENCY_OPTIONS = [
  { value: 'KES', label: 'Kenyan shilling (KES)' },
  { value: 'USD', label: 'US dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Pound sterling (GBP)' },
]

const showAdd = ref(false)
const saving = ref(false)
const sendInvite = ref(false)
const form = ref<SupplierInput>({
  supplier_type: 'BUSINESS',
  category: 'GENERAL',
  legal_name: '',
  trading_name: '',
  registration_number: '',
  tax_number: '',
  supplier_code: '',
  country: 'KE',
  preferred_currency: 'KES',
  email: '',
  phone: '',
  payment_terms_days: 30,
})

function resetForm() {
  form.value = {
    supplier_type: 'BUSINESS', category: 'GENERAL', legal_name: '', trading_name: '',
    registration_number: '', tax_number: '', supplier_code: '', country: 'KE',
    preferred_currency: 'KES', email: '', phone: '', payment_terms_days: 30,
  }
  sendInvite.value = false
}

async function submitAdd() {
  if (!form.value.legal_name?.trim()) {
    showError('Business name is required.')
    return
  }
  if (sendInvite.value && !form.value.email?.trim()) {
    showError('An email address is required to send a supplier invitation.')
    return
  }
  saving.value = true
  try {
    const created = await createSupplier(useBranchApi.value, {
      ...form.value,
      branch_id: branchScope.value,
    })
    if (sendInvite.value) {
      try {
        await createSupplierInvite(useBranchApi.value, created.id, form.value.email?.trim())
        showSuccess('Supplier added and invitation sent.')
      } catch (inviteErr) {
        showError(`Supplier added, but the invitation failed: ${extractErrorMessage(inviteErr)}`)
      }
    } else {
      showSuccess('Supplier added.')
    }
    showAdd.value = false
    resetForm()
    router.push(detailRoute(created))
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-text-muted">
        Suppliers your {{ branchId ? 'branch' : 'organization' }} buys from — payout details, terms and verification.
      </p>
      <AppButton variant="primary" size="md" @click="showAdd = true">
        <template #icon><PlusIcon class="w-4 h-4" /></template>
        Add supplier
      </AppButton>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-56">
        <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          placeholder="Search name, code or email"
          class="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
        />
      </div>
      <AppSelect
        v-model="statusFilter"
        class="w-40"
        :options="[
          { value: '', label: 'All statuses' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'SUSPENDED', label: 'Suspended' },
          { value: 'ARCHIVED', label: 'Archived' },
        ]"
      />
      <AppSelect
        v-model="verificationFilter"
        class="w-44"
        :options="[
          { value: '', label: 'All verification' },
          { value: 'UNVERIFIED', label: 'Unverified' },
          { value: 'PENDING', label: 'Pending review' },
          { value: 'VERIFIED', label: 'Verified' },
          { value: 'REJECTED', label: 'Rejected' },
        ]"
      />
      <AppSelect
        v-model="readinessFilter"
        class="w-44"
        :options="[
          { value: '', label: 'All readiness' },
          { value: 'READY', label: 'Ready to pay' },
          { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
          { value: 'NO_PAYOUT_METHOD', label: 'No payout method' },
          { value: 'NOT_READY', label: 'Not ready' },
        ]"
      />
    </div>

    <AppCard padding="none">
      <div class="overflow-x-auto">
        <table class="w-full min-w-160 text-sm">
          <thead>
            <tr class="bg-surface-2 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="px-4 py-2.5">Supplier</th>
              <th class="px-4 py-2.5">Code</th>
              <th class="px-4 py-2.5">Category</th>
              <th class="px-4 py-2.5 text-right">Outstanding</th>
              <th class="px-4 py-2.5">Terms</th>
              <th class="px-4 py-2.5">Readiness</th>
              <th class="px-4 py-2.5">Verification</th>
              <th class="px-4 py-2.5">Risk</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5">Last payment</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="n in 5" :key="n" class="border-b border-border last:border-0">
              <td v-for="c in 10" :key="c" class="px-4 py-3.5"><div class="h-4 rounded-lg bg-skeleton animate-pulse" /></td>
            </tr>
          </tbody>
          <tbody v-else-if="!suppliers.length">
            <tr>
              <td colspan="10" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
                    <TruckIcon class="w-5 h-5 text-text-disabled" />
                  </div>
                  <p class="text-sm text-text-muted font-medium">
                    {{ search || statusFilter || verificationFilter ? 'No suppliers match this filter.' : 'No suppliers yet.' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="s in suppliers"
              :key="s.id"
              class="border-b border-border last:border-0 hover:bg-surface-2 transition-colors cursor-pointer"
              @click="router.push(detailRoute(s))"
            >
              <td class="px-4 py-3.5">
                <p class="font-semibold text-text-primary">{{ s.legal_name }}</p>
                <p class="text-xs text-text-muted">{{ s.email || '—' }}</p>
              </td>
              <td class="px-4 py-3.5 font-mono text-xs text-text-muted">{{ s.supplier_code || '—' }}</td>
              <td class="px-4 py-3.5 text-text-secondary">{{ s.category }}</td>
              <td class="px-4 py-3.5 text-right font-semibold" :class="s.outstanding_cents ? 'text-text-primary' : 'text-text-muted'">
                {{ s.outstanding_cents ? `KES ${formatMoney(s.outstanding_cents)}` : '—' }}
              </td>
              <td class="px-4 py-3.5 text-text-secondary">{{ s.payment_terms_days }} days</td>
              <td class="px-4 py-3.5"><AppBadge :variant="readinessVariant(s.readiness)" size="sm">{{ readinessLabel(s.readiness) }}</AppBadge></td>
              <td class="px-4 py-3.5"><AppBadge :variant="verificationVariant(s.verification_status)" size="sm">{{ s.verification_status }}</AppBadge></td>
              <td class="px-4 py-3.5"><AppBadge :variant="riskVariant(s.risk_level_override ?? s.risk_level)" size="sm">{{ s.risk_level_override ?? s.risk_level }}</AppBadge></td>
              <td class="px-4 py-3.5"><AppBadge :variant="statusVariant(s.status)" size="sm">{{ s.status }}</AppBadge></td>
              <td class="px-4 py-3.5 text-text-muted text-xs">{{ s.last_payment_at ? new Date(s.last_payment_at).toLocaleDateString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data && data.total > 20" class="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-text-muted">
        <span>{{ data.total }} suppliers</span>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 rounded-lg hover:bg-surface-2 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="px-2 py-1 rounded-lg hover:bg-surface-2 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
        </div>
      </div>
    </AppCard>

    <AppModal v-model="showAdd" title="Add supplier" size="lg">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          v-model="form.supplier_type"
          label="Supplier type"
          :options="[{ value: 'BUSINESS', label: 'Business' }, { value: 'INDIVIDUAL', label: 'Individual' }]"
        />
        <AppSelect v-model="form.category" label="Category" :options="CATEGORY_OPTIONS" />
        <AppInput v-model="form.legal_name" :label="form.supplier_type === 'INDIVIDUAL' ? 'Full name' : 'Business name'" required />
        <AppInput v-model="form.trading_name" label="Trading name" />
        <AppInput v-model="form.registration_number" label="Registration number" />
        <AppInput v-model="form.supplier_code" label="Supplier code" />
        <AppInput v-model="form.tax_number" label="Tax number (KRA PIN)" />
        <AppSelect v-model="form.country" label="Country" :options="COUNTRY_OPTIONS" />
        <AppSelect v-model="form.preferred_currency" label="Preferred currency" :options="CURRENCY_OPTIONS" />
        <AppInput v-model="form.email" label="Email" type="email" />
        <AppInput v-model="form.phone" label="Phone" />
        <AppInput v-model.number="form.payment_terms_days" label="Payment terms (days)" type="number" />
      </div>
      <label class="flex items-start gap-2 text-sm text-text-primary mt-4">
        <input type="checkbox" v-model="sendInvite" class="w-4 h-4 rounded mt-0.5" />
        <span>
          Send supplier invitation after saving
          <span class="block text-xs text-text-muted">Emails the supplier a link to submit their own payout &amp; KYB details.</span>
        </span>
      </label>
      <p class="text-xs text-text-muted mt-3">
        Registration and tax numbers are screened against sanctions and PEP watchlists automatically.
      </p>
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="ghost" @click="showAdd = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="saving" @click="submitAdd">Save supplier</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
