<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchCrmCustomers, fetchCrmCustomersSummary, createCrmCustomer,
  type CrmCustomer, type CrmCustomerInput, type CrmCustomerListResponse, type CrmCustomerSummary,
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
import { PlusIcon, SearchIcon, UsersIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string }>()

const router = useRouter()
const auth = useAuthStore()
const { showError, showSuccess } = useResponseModal()

const useBranchApi = computed(() => auth.meta?.memberType === 'branch_member')
const branchScope = computed(() => (useBranchApi.value ? undefined : props.branchId))

const loading = ref(true)
const data = ref<CrmCustomerListResponse | null>(null)
const summary = ref<CrmCustomerSummary | null>(null)
const search = ref('')
const statusFilter = ref('')
const verificationFilter = ref('')
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    data.value = await fetchCrmCustomers(useBranchApi.value, {
      q: search.value.trim() || undefined,
      status: statusFilter.value || undefined,
      verification: verificationFilter.value || undefined,
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

async function loadSummary() {
  try {
    summary.value = await fetchCrmCustomersSummary(useBranchApi.value, branchScope.value)
  } catch {
    summary.value = null
  }
}

onMounted(() => { load(); loadSummary() })
watch([statusFilter, verificationFilter, page], load)
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
})

const customers = computed(() => data.value?.customers ?? [])
const totalPages = computed(() => data.value?.total_pages ?? 1)

function detailRoute(c: CrmCustomer) {
  return props.branchId
    ? { name: 'branch-customer-detail', params: { orgId: props.orgId, branchId: props.branchId, customerId: c.id } }
    : { name: 'org-customer-detail', params: { orgId: props.orgId, customerId: c.id } }
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

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NGO', label: 'NGO / non-profit' },
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
const creditLimitKes = ref('')
const form = ref<CrmCustomerInput>({
  customer_type: 'BUSINESS',
  category: 'GENERAL',
  legal_name: '',
  trading_name: '',
  registration_number: '',
  tax_number: '',
  customer_code: '',
  country: 'KE',
  preferred_currency: 'KES',
  email: '',
  phone: '',
  billing_address: '',
  payment_terms_days: 30,
})

function resetForm() {
  form.value = {
    customer_type: 'BUSINESS', category: 'GENERAL', legal_name: '', trading_name: '',
    registration_number: '', tax_number: '', customer_code: '', country: 'KE',
    preferred_currency: 'KES', email: '', phone: '', billing_address: '', payment_terms_days: 30,
  }
  creditLimitKes.value = ''
}

async function submitAdd() {
  if (!form.value.legal_name?.trim()) {
    showError(form.value.customer_type === 'INDIVIDUAL' ? 'Full name is required.' : 'Business name is required.')
    return
  }
  saving.value = true
  try {
    const created = await createCrmCustomer(useBranchApi.value, {
      ...form.value,
      branch_id: branchScope.value,
      credit_limit_cents: creditLimitKes.value.trim() ? Math.round(Number(creditLimitKes.value) * 100) : undefined,
    })
    showSuccess('Customer added.')
    showAdd.value = false
    resetForm()
    void loadSummary()
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
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Relationships</p>
      <h1 class="text-lg font-bold text-text-primary mt-0.5">Customers</h1>
      <p class="text-sm text-text-muted mt-0.5">
        The businesses and people your {{ branchId ? 'branch' : 'organization' }} bills — terms, credit limits,
        contacts and saved payment details.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Customers</p>
        <p class="text-lg font-bold text-text-primary">{{ summary?.total_customers ?? '—' }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Verified</p>
        <p class="text-lg font-bold text-success">{{ summary?.verified_customers ?? '—' }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Outstanding</p>
        <p class="text-lg font-bold text-text-primary">{{ summary ? `KES ${formatMoney(summary.outstanding_cents)}` : '—' }}</p>
      </AppCard>
      <AppCard padding="sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Overdue</p>
        <p class="text-lg font-bold" :class="summary && summary.overdue_count > 0 ? 'text-error' : 'text-text-primary'">
          {{ summary ? `KES ${formatMoney(summary.overdue_cents)}` : '—' }}
        </p>
      </AppCard>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-56">
          <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            v-model="search"
            type="text"
            placeholder="Search name, code, email or phone"
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
      </div>
      <AppButton variant="primary" size="md" @click="showAdd = true">
        <template #icon><PlusIcon class="w-4 h-4" /></template>
        Add customer
      </AppButton>
    </div>

    <AppCard padding="none">
      <div class="overflow-x-auto">
        <table class="w-full min-w-160 text-sm">
          <thead>
            <tr class="bg-surface-2 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="px-4 py-2.5">Customer</th>
              <th class="px-4 py-2.5">Code</th>
              <th class="px-4 py-2.5">Category</th>
              <th class="px-4 py-2.5 text-right">Outstanding</th>
              <th class="px-4 py-2.5">Terms</th>
              <th class="px-4 py-2.5 text-right">Credit limit</th>
              <th class="px-4 py-2.5">Verification</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5">Last invoice</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="n in 5" :key="n" class="border-b border-border last:border-0">
              <td v-for="c in 9" :key="c" class="px-4 py-3.5"><div class="h-4 rounded-lg bg-skeleton animate-pulse" /></td>
            </tr>
          </tbody>
          <tbody v-else-if="!customers.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
                    <UsersIcon class="w-5 h-5 text-text-disabled" />
                  </div>
                  <p class="text-sm text-text-muted font-medium">
                    {{ search || statusFilter || verificationFilter ? 'No customers match this filter.' : 'No customers yet.' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="c in customers"
              :key="c.id"
              class="border-b border-border last:border-0 hover:bg-surface-2 transition-colors cursor-pointer"
              @click="router.push(detailRoute(c))"
            >
              <td class="px-4 py-3.5">
                <p class="font-semibold text-text-primary">{{ c.trading_name || c.legal_name }}</p>
                <p class="text-xs text-text-muted">{{ c.email || c.phone || '—' }}</p>
              </td>
              <td class="px-4 py-3.5 font-mono text-xs text-text-muted">{{ c.customer_code || '—' }}</td>
              <td class="px-4 py-3.5 text-text-secondary">{{ c.category }}</td>
              <td class="px-4 py-3.5 text-right font-semibold" :class="c.outstanding_cents ? 'text-text-primary' : 'text-text-muted'">
                {{ c.outstanding_cents ? `KES ${formatMoney(c.outstanding_cents)}` : '—' }}
              </td>
              <td class="px-4 py-3.5 text-text-secondary">{{ c.payment_terms_days }} days</td>
              <td class="px-4 py-3.5 text-right text-text-secondary">
                {{ c.credit_limit_cents ? `KES ${formatMoney(c.credit_limit_cents)}` : '—' }}
              </td>
              <td class="px-4 py-3.5"><AppBadge :variant="verificationVariant(c.verification_status)" size="sm">{{ c.verification_status }}</AppBadge></td>
              <td class="px-4 py-3.5"><AppBadge :variant="statusVariant(c.status)" size="sm">{{ c.status }}</AppBadge></td>
              <td class="px-4 py-3.5 text-text-muted text-xs">{{ c.last_invoice_at ? new Date(c.last_invoice_at).toLocaleDateString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data && data.total > 20" class="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-text-muted">
        <span>{{ data.total }} customers</span>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 rounded-lg hover:bg-surface-2 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="px-2 py-1 rounded-lg hover:bg-surface-2 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
        </div>
      </div>
    </AppCard>

    <AppModal v-model="showAdd" title="Add customer" size="lg">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          v-model="form.customer_type"
          label="Customer type"
          :options="[{ value: 'BUSINESS', label: 'Business' }, { value: 'INDIVIDUAL', label: 'Individual' }]"
        />
        <AppSelect v-model="form.category" label="Category" :options="CATEGORY_OPTIONS" />
        <AppInput v-model="form.legal_name" :label="form.customer_type === 'INDIVIDUAL' ? 'Full name' : 'Business name'" required />
        <AppInput v-model="form.trading_name" label="Trading / display name" />
        <AppInput v-model="form.registration_number" label="Registration number" />
        <AppInput v-model="form.customer_code" label="Customer code (auto if blank)" />
        <AppInput v-model="form.tax_number" label="Tax number (KRA PIN)" />
        <AppSelect v-model="form.country" label="Country" :options="COUNTRY_OPTIONS" />
        <AppSelect v-model="form.preferred_currency" label="Preferred currency" :options="CURRENCY_OPTIONS" />
        <AppInput v-model="form.email" label="Email" type="email" />
        <AppInput v-model="form.phone" label="Phone" />
        <AppInput v-model.number="form.payment_terms_days" label="Payment terms (days)" type="number" />
        <AppInput v-model="creditLimitKes" label="Credit limit (KES)" type="number" placeholder="0 = none" />
      </div>
      <AppInput v-model="form.billing_address" label="Billing address" class="mt-4" />
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="ghost" @click="showAdd = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="saving" @click="submitAdd">Add customer</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
