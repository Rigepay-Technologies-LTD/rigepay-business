<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgProfile, updateOrgProfile,
  requestOrgIdentityChange, fetchOrgIdentityChangeRequests,
  type ProfileResponse, type OrgIdentityChangeField, type OrgIdentityChangeRequest,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const saved = ref(false)
const profile = ref<ProfileResponse | null>(null)

const website = ref('')
const industry = ref('')
const employeeCount = ref('')
const annualRevenueKes = ref('')
const taxResidencyCountry = ref('')
const memberPhone = ref('')
const memberNationalId = ref('')
const tradingName = ref('')
const entityType = ref('')
const dateOfIncorporation = ref('')
const registeredOfficeAddress = ref('')
const principalPlaceOfBusiness = ref('')
const businessEmail = ref('')
const mccCode = ref('')
const natureOfBusinessDescription = ref('')
const estimatedMonthlyVolumeKes = ref('')
const estimatedTransactionCount = ref('')
const regulatoryLicenseNumber = ref('')
const regulatoryLicenseExpiry = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    profile.value = await fetchOrgProfile()
    website.value = profile.value.organization.website ?? ''
    industry.value = profile.value.organization.industry ?? ''
    employeeCount.value = profile.value.organization.employee_count?.toString() ?? ''
    annualRevenueKes.value = profile.value.organization.annual_revenue_cents ? String(profile.value.organization.annual_revenue_cents / 100) : ''
    taxResidencyCountry.value = profile.value.organization.tax_residency_country ?? ''
    memberPhone.value = profile.value.member.phone ?? ''
    memberNationalId.value = ''
    tradingName.value = profile.value.organization.trading_name ?? ''
    entityType.value = profile.value.organization.entity_type ?? ''
    dateOfIncorporation.value = profile.value.organization.date_of_incorporation ?? ''
    registeredOfficeAddress.value = profile.value.organization.registered_office_address ?? ''
    principalPlaceOfBusiness.value = profile.value.organization.principal_place_of_business ?? ''
    businessEmail.value = profile.value.organization.business_email ?? ''
    mccCode.value = profile.value.organization.mcc_code ?? ''
    natureOfBusinessDescription.value = profile.value.organization.nature_of_business_description ?? ''
    estimatedMonthlyVolumeKes.value = profile.value.organization.estimated_monthly_volume_cents ? String(profile.value.organization.estimated_monthly_volume_cents / 100) : ''
    estimatedTransactionCount.value = profile.value.organization.estimated_transaction_count?.toString() ?? ''
    regulatoryLicenseNumber.value = profile.value.organization.regulatory_license_number ?? ''
    regulatoryLicenseExpiry.value = profile.value.organization.regulatory_license_expiry ?? ''
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function save() {
  error.value = null
  saved.value = false
  saving.value = true
  try {
    await updateOrgProfile({
      website: website.value.trim() || undefined,
      industry: industry.value.trim() || undefined,
      employee_count: employeeCount.value ? Number(employeeCount.value) : undefined,
      annual_revenue_cents: annualRevenueKes.value ? Math.round(Number(annualRevenueKes.value) * 100) : undefined,
      tax_residency_country: taxResidencyCountry.value.trim() || undefined,
      member_phone: memberPhone.value.trim() || undefined,
      member_national_id_number: memberNationalId.value.trim() || undefined,
      trading_name: tradingName.value.trim() || undefined,
      entity_type: entityType.value.trim() || undefined,
      date_of_incorporation: dateOfIncorporation.value || undefined,
      registered_office_address: registeredOfficeAddress.value.trim() || undefined,
      principal_place_of_business: principalPlaceOfBusiness.value.trim() || undefined,
      business_email: businessEmail.value.trim() || undefined,
      mcc_code: mccCode.value.trim() || undefined,
      nature_of_business_description: natureOfBusinessDescription.value.trim() || undefined,
      estimated_monthly_volume_cents: estimatedMonthlyVolumeKes.value ? Math.round(Number(estimatedMonthlyVolumeKes.value) * 100) : undefined,
      estimated_transaction_count: estimatedTransactionCount.value ? Number(estimatedTransactionCount.value) : undefined,
      regulatory_license_number: regulatoryLicenseNumber.value.trim() || undefined,
      regulatory_license_expiry: regulatoryLicenseExpiry.value || undefined,
    })
    saved.value = true
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const identityRequests = ref<OrgIdentityChangeRequest[]>([])
const identityRequestsLoading = ref(false)
const identityField = ref<OrgIdentityChangeField>('legal_name')
const identityNewValue = ref('')
const identityRequestError = ref<string | null>(null)
const identityRequestSuccess = ref<string | null>(null)
const identityRequestSubmitting = ref(false)

const identityFieldOptions = [
  { value: 'legal_name', label: 'Legal name' },
  { value: 'brs_registration_number', label: 'BRS registration number' },
  { value: 'kra_pin', label: 'KRA PIN' },
]

async function loadIdentityRequests() {
  identityRequestsLoading.value = true
  try {
    identityRequests.value = await fetchOrgIdentityChangeRequests()
  } catch (err) {
    identityRequestError.value = extractErrorMessage(err)
  } finally {
    identityRequestsLoading.value = false
  }
}

async function submitIdentityChangeRequest() {
  identityRequestError.value = null
  identityRequestSuccess.value = null
  if (!identityNewValue.value.trim()) {
    identityRequestError.value = 'Enter the new value.'
    return
  }
  identityRequestSubmitting.value = true
  try {
    await requestOrgIdentityChange(identityField.value, identityNewValue.value.trim())
    identityRequestSuccess.value = 'Change request submitted for compliance review.'
    identityNewValue.value = ''
    await loadIdentityRequests()
  } catch (err) {
    identityRequestError.value = extractErrorMessage(err)
  } finally {
    identityRequestSubmitting.value = false
  }
}

function identityFieldLabel(field: string): string {
  return identityFieldOptions.find((f) => f.value === field)?.label ?? field
}

onMounted(() => {
  load()
  loadIdentityRequests()
})

function statusVariant(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'warning'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Organization profile">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>
      <div v-if="saved" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3">Profile updated.</div>
      <p v-if="loading" class="text-sm text-text-muted">Loading profile…</p>

      <AppCard v-if="profile && !loading">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-text-primary">{{ profile.organization.legal_name }}</h2>
            <p class="text-xs text-text-muted mt-1">
              KRA PIN: {{ profile.organization.kra_pin ?? '—' }} · BRS: {{ profile.organization.brs_registration_number ?? '—' }}
            </p>
          </div>
          <AppBadge :variant="statusVariant(profile.organization.status)" size="sm">{{ profile.organization.status }}</AppBadge>
        </div>
        <p class="text-xs text-text-muted">
          {{ profile.organization.location }}, {{ profile.organization.county }}, {{ profile.organization.country }}
        </p>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Request an identity change</h2>
        <p class="text-xs text-text-muted mb-4">
          Legal name, BRS registration number, and KRA PIN are locked once your organization is approved — changing
          them requires compliance review. Submit a request below; an admin will approve or reject it.
        </p>
        <div v-if="identityRequestError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ identityRequestError }}</div>
        <div v-if="identityRequestSuccess" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ identityRequestSuccess }}</div>
        <form class="flex flex-col sm:flex-row gap-3 sm:items-end" @submit.prevent="submitIdentityChangeRequest">
          <AppSelect v-model="identityField" label="Field" :options="identityFieldOptions" class="sm:w-56" />
          <AppInput v-model="identityNewValue" label="New value" placeholder="Enter the new value" class="flex-1" />
          <AppButton type="submit" :loading="identityRequestSubmitting" class="shrink-0">Submit request</AppButton>
        </form>

        <div v-if="identityRequests.length" class="flex flex-col gap-2 mt-5 pt-5 border-t border-border">
          <p class="text-xs font-bold text-text-muted uppercase tracking-wide">Request history</p>
          <div v-for="r in identityRequests" :key="r.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
            <div class="min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ identityFieldLabel(r.field) }} → {{ r.new_value }}</p>
              <p class="text-xs text-text-muted mt-0.5">Requested {{ formatDate(r.created_at) }}<template v-if="r.reason"> · {{ r.reason }}</template></p>
            </div>
            <AppBadge :variant="statusVariant(r.status)" size="sm">{{ r.status }}</AppBadge>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Business details</h2>
        <p class="text-xs text-text-muted mb-4">Editable — legal name, KRA PIN, and BRS number require a compliance review to change.</p>
        <form class="flex flex-col gap-4" @submit.prevent="save">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="tradingName" label="Trading name / DBA" placeholder="If different from legal name" />
            <AppInput v-model="entityType" label="Entity type"
              tooltip="Your registered legal structure, e.g. Private Limited Company, Sole Proprietorship, Partnership — shown on your Certificate of Incorporation." />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="industry" label="Industry / sector" placeholder="e.g. Retail" />
            <AppInput v-model="mccCode" label="Sector / MCC code"
              tooltip="A 4-digit Merchant Category Code describing your business type. Not sure? Leave blank — support can help assign one." />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="website" label="Website" placeholder="https://example.com" />
            <AppInput v-model="businessEmail" type="email" label="Business email" placeholder="compliance@yourbusiness.com" />
          </div>
          <AppInput v-model="dateOfIncorporation" type="date" label="Date of incorporation" />
          <AppInput v-model="registeredOfficeAddress" label="Registered office address"
            tooltip="The official registered address on file with BRS — may differ from where you actually operate." />
          <AppInput v-model="principalPlaceOfBusiness" label="Principal place of business"
            tooltip="Where you actually operate day-to-day, if different from your registered office." />
          <AppInput v-model="natureOfBusinessDescription" label="Nature of business" placeholder="Briefly describe what your business does" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="employeeCount" type="number" label="Number of employees" />
            <AppInput v-model="annualRevenueKes" type="number" label="Est. annual revenue (KES)" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="estimatedMonthlyVolumeKes" type="number" label="Est. monthly transaction volume (KES)"
              tooltip="Roughly how much money you expect to move through RigePay per month — helps us set sensible limits from day one." />
            <AppInput v-model="estimatedTransactionCount" type="number" label="Est. monthly transaction count" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="regulatoryLicenseNumber" label="Regulatory license number"
              tooltip="If your business holds a specific regulatory license (e.g. CBK, CMA, IRA) relevant to your industry, enter its number here." />
            <AppInput v-model="regulatoryLicenseExpiry" type="date" label="License expiry date" />
          </div>
          <AppInput v-model="taxResidencyCountry" label="Tax residency country" />

          <div class="border-t border-border pt-4 mt-1">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Your contact details</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AppInput v-model="memberPhone" label="Phone" placeholder="+254712345678" />
              <AppInput v-model="memberNationalId" label="National ID number" />
            </div>
          </div>

          <AppButton type="submit" :loading="saving" class="self-start">Save changes</AppButton>
        </form>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
