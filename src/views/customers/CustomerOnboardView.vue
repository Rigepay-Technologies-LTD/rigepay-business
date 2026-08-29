<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchCustomerOnboard, submitCustomerOnboard,
  type CustomerOnboardInfo, type CrmPaymentMethodKind,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import AppLogo from '@/components/ui/AppLogo.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref('')
const done = ref(false)
const info = ref<CustomerOnboardInfo | null>(null)
const submitting = ref(false)

const form = ref<{
  method: CrmPaymentMethodKind
  phone_number: string
  bank_code: string
  bank_account_number: string
  paybill_number: string
  till_number: string
  account_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  registration_number: string
  tax_number: string
  billing_address: string
}>({
  method: 'MOBILE_MONEY', phone_number: '', bank_code: '', bank_account_number: '', paybill_number: '',
  till_number: '', account_name: '', contact_name: '', contact_email: '', contact_phone: '',
  registration_number: '', tax_number: '', billing_address: '',
})

onMounted(async () => {
  try {
    info.value = await fetchCustomerOnboard(token)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await submitCustomerOnboard(token, {
      payment_method: {
        method: form.value.method,
        phone_number: form.value.phone_number || undefined,
        bank_code: form.value.bank_code || undefined,
        bank_account_number: form.value.bank_account_number || undefined,
        paybill_number: form.value.paybill_number || undefined,
        till_number: form.value.till_number || undefined,
        account_name: form.value.account_name || undefined,
      },
      contact: form.value.contact_name ? {
        name: form.value.contact_name, email: form.value.contact_email || undefined,
        phone: form.value.contact_phone || undefined,
      } : undefined,
      registration_number: form.value.registration_number || undefined,
      tax_number: form.value.tax_number || undefined,
      billing_address: form.value.billing_address || undefined,
    })
    done.value = true
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center p-5">
    <div class="w-full max-w-lg bg-surface rounded-xl shadow-md p-8">
      <AppLogo size="sm" class="mb-6" />

      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

      <div v-else-if="done" class="text-center py-8">
        <h1 class="text-xl font-bold text-text-primary">Thank you</h1>
        <p class="text-sm text-text-muted mt-2">Your details are with the business for review.</p>
      </div>

      <div v-else-if="error && !info" class="text-center py-8">
        <h1 class="text-lg font-bold text-text-primary">Link not available</h1>
        <p class="text-sm text-text-muted mt-2">{{ error }}</p>
      </div>

      <template v-else-if="info">
        <h1 class="text-xl font-bold text-text-primary">Customer onboarding</h1>
        <p class="text-sm text-text-muted mt-1">
          {{ info.legal_name }} — confirm your details for billing in <span class="font-semibold">{{ info.preferred_currency }}</span>.
        </p>

        <div v-if="error" class="mt-4 text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

        <div class="flex flex-col gap-4 mt-5">
          <AppSelect v-model="form.method" label="Preferred payment method" :options="[
            { value: 'MOBILE_MONEY', label: 'Mobile money' },
            { value: 'BANK', label: 'Bank account' },
            { value: 'PAYBILL', label: 'Paybill' },
            { value: 'TILL', label: 'Till' },
            { value: 'CARD', label: 'Card' },
          ]" />

          <template v-if="form.method === 'BANK'">
            <AppInput v-model="form.bank_code" label="Bank code" />
            <AppInput v-model="form.bank_account_number" label="Account number" />
            <AppInput v-model="form.account_name" label="Account name" />
          </template>
          <AppInput v-else-if="form.method === 'PAYBILL'" v-model="form.paybill_number" label="Paybill number" />
          <AppInput v-else-if="form.method === 'TILL'" v-model="form.till_number" label="Till number" />
          <AppInput v-else-if="form.method === 'MOBILE_MONEY'" v-model="form.phone_number" label="Phone number" />

          <div class="border-t border-border pt-4">
            <p class="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Primary contact (optional)</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AppInput v-model="form.contact_name" label="Name" />
              <AppInput v-model="form.contact_email" label="Email" type="email" />
              <AppInput v-model="form.contact_phone" label="Phone" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="form.registration_number" label="Registration number" />
            <AppInput v-model="form.tax_number" label="Tax number (KRA PIN)" />
          </div>
          <AppInput v-model="form.billing_address" label="Billing address" />

          <AppButton variant="primary" block :loading="submitting" @click="submit">Submit details</AppButton>
        </div>
      </template>
    </div>
  </div>
</template>
