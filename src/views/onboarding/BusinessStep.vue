<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { onboardingHttp } from '@/lib/http'
import { extractErrorMessage } from '@/lib/errors'
import { useOnboardingStore } from '@/stores/onboarding'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import ErrorBanner from '@/components/auth/ErrorBanner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const onboarding = useOnboardingStore()

const businessName = ref('')
const kraPin = ref('')
const brsRegistrationNumber = ref('')
const businessType = ref('')
const phone = ref('')
const country = ref('Kenya')
const county = ref('')
const subCounty = ref('')
const region = ref('')
const location = ref('')
const nearestLandmark = ref('')
const yearOfRegistration = ref('')


const website = ref('')
const industry = ref('')
const employeeCount = ref('')
const annualRevenueKes = ref('')
const taxResidencyCountry = ref('Kenya')
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

const loading = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  if (!onboarding.onboardingToken) {
    router.replace({ name: 'onboard-email' })
  }
})

function isValidE164(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(value)
}

async function submit() {
  error.value = null

  if (businessName.value.trim().length < 2) {
    error.value = 'Business name must be at least 2 characters.'
    return
  }
  if (kraPin.value.trim().length < 5) {
    error.value = 'KRA PIN must be at least 5 characters.'
    return
  }
  if (!brsRegistrationNumber.value.trim()) {
    error.value = 'BRS registration number is required for an organization account.'
    return
  }
  if (!businessType.value.trim()) {
    error.value = 'Please select a business type.'
    return
  }
  if (!isValidE164(phone.value.trim())) {
    error.value = 'Phone number must be in international format, e.g. +254712345678.'
    return
  }
  if (!county.value.trim() || !subCounty.value.trim() || !region.value.trim() || !location.value.trim()) {
    error.value = 'Please fill in all location fields.'
    return
  }

  loading.value = true
  try {
    await onboardingHttp(onboarding.onboardingToken!).put('/onboard/business-details', {
      account_type: 'organization',
      business_name: businessName.value.trim(),
      kra_pin: kraPin.value.trim(),
      brs_registration_number: brsRegistrationNumber.value.trim(),
      business_type: businessType.value.trim(),
      phone: phone.value.trim(),
      country: country.value.trim(),
      county: county.value.trim(),
      sub_county: subCounty.value.trim(),
      region: region.value.trim(),
      location: location.value.trim(),
      nearest_landmark: nearestLandmark.value.trim() || undefined,
      year_of_registration: yearOfRegistration.value ? Number(yearOfRegistration.value) : undefined,
      website: website.value.trim() || undefined,
      industry: industry.value.trim() || undefined,
      employee_count: employeeCount.value ? Number(employeeCount.value) : undefined,
      annual_revenue_cents: annualRevenueKes.value ? Math.round(Number(annualRevenueKes.value) * 100) : undefined,
      tax_residency_country: taxResidencyCountry.value.trim() || undefined,
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
    router.push({ name: 'onboard-security' })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Organization details" subtitle="Step 4 of 5 — tell us about your business">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <AppInput v-model="businessName" label="Business / organization name" required />

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="kraPin" label="KRA PIN" required
          tooltip="Found on your KRA PIN certificate, downloadable from iTax (itax.kra.go.ke) under Registration → PIN Checker." />
        <AppInput v-model="brsRegistrationNumber" label="BRS registration number" required
          tooltip="Your Certificate of Incorporation number, issued by the Business Registration Service (BRS) — usually formatted like PVT-XXXXXXXX or C.XXXXXX." />
      </div>

      <AppInput v-model="businessType" label="Business type" placeholder="e.g. Limited Company" required />
      <AppInput v-model="phone" label="Business phone" placeholder="+254712345678" required />

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="country" label="Country" required />
        <AppInput v-model="county" label="County" required />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="subCounty" label="Sub-county" required />
        <AppInput v-model="region" label="Region" required />
      </div>
      <AppInput v-model="location" label="Location / address" required />
      <AppInput v-model="nearestLandmark" label="Nearest landmark" placeholder="Optional" />

      <div class="mt-2">
        <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Additional details (optional)</p>
        <p class="text-xs text-text-muted mt-1">
          Nothing below is required to continue. Fill in what you have now — you can add or correct the rest anytime
          from your Organization Profile after signing up, and documents (certificates, shareholder registry, etc.)
          are uploaded separately once you're in the dashboard.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="yearOfRegistration" type="number" label="Year of registration" placeholder="e.g. 2020" />
        <AppInput v-model="industry" label="Industry / sector" placeholder="e.g. Retail" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="tradingName" label="Trading name / DBA" placeholder="If different from legal name" />
        <AppInput v-model="entityType" label="Entity type"
          tooltip="Your registered legal structure, e.g. Private Limited Company, Sole Proprietorship, Partnership — shown on your Certificate of Incorporation." />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="dateOfIncorporation" type="date" label="Date of incorporation" />
        <AppInput v-model="mccCode" label="Sector / MCC code"
          tooltip="A 4-digit Merchant Category Code describing your business type. Not sure? Leave blank — support can help assign one." />
      </div>
      <AppInput v-model="website" label="Website" placeholder="https://example.com" />
      <AppInput v-model="businessEmail" type="email" label="Business email" placeholder="compliance@yourbusiness.com" />
      <AppInput v-model="registeredOfficeAddress" label="Registered office address"
        tooltip="The official registered address on file with BRS — may differ from where you actually operate." />
      <AppInput v-model="principalPlaceOfBusiness" label="Principal place of business"
        tooltip="Where you actually operate day-to-day, if different from your registered office." />
      <AppInput v-model="natureOfBusinessDescription" label="Nature of business" placeholder="Briefly describe what your business does" />
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="employeeCount" type="number" label="Number of employees" placeholder="e.g. 12" />
        <AppInput v-model="annualRevenueKes" type="number" label="Est. annual revenue (KES)" placeholder="e.g. 5000000" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="estimatedMonthlyVolumeKes" type="number" label="Est. monthly transaction volume (KES)"
          tooltip="Roughly how much money you expect to move through RigePay per month — helps us set sensible limits from day one." />
        <AppInput v-model="estimatedTransactionCount" type="number" label="Est. monthly transaction count" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="regulatoryLicenseNumber" label="Regulatory license number"
          tooltip="If your business holds a specific regulatory license (e.g. CBK, CMA, IRA) relevant to your industry, enter its number here." />
        <AppInput v-model="regulatoryLicenseExpiry" type="date" label="License expiry date" />
      </div>
      <AppInput v-model="taxResidencyCountry" label="Tax residency country" />

      <ErrorBanner :message="error" />

      <AppButton type="submit" :loading="loading" block>Continue</AppButton>
    </form>
  </AuthLayout>
</template>
