
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchCustomerOnboard,
  submitCustomerOnboard,
  type CustomerOnboardInfo,
  type CrmPaymentMethodKind,
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
  method: 'MOBILE_MONEY',
  phone_number: '',
  bank_code: '',
  bank_account_number: '',
  paybill_number: '',
  till_number: '',
  account_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  registration_number: '',
  tax_number: '',
  billing_address: '',
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
      contact: form.value.contact_name
        ? {
            name: form.value.contact_name,
            email: form.value.contact_email || undefined,
            phone: form.value.contact_phone || undefined,
          }
        : undefined,
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
  <div class="min-h-screen bg-bg">
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
      />
    </div>

    <div class="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto w-full max-w-3xl">
        <header class="mb-6 flex items-center justify-between">
          <AppLogo size="sm" />

          <div class="hidden items-center gap-2 text-xs text-text-muted sm:flex">
            <span class="h-2 w-2 rounded-full bg-primary" />
            Secure onboarding
          </div>
        </header>
        <div
          v-if="loading"
          class="rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10"
        >
          <div class="animate-pulse space-y-6">
            <div class="h-7 w-48 rounded-lg bg-bg" />
            <div class="h-4 w-72 max-w-full rounded bg-bg" />

            <div class="space-y-3 pt-4">
              <div class="h-12 rounded-xl bg-bg" />
              <div class="h-12 rounded-xl bg-bg" />
              <div class="h-12 rounded-xl bg-bg" />
            </div>
          </div>
        </div>
        <div
          v-else-if="done"
          class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div class="px-6 py-14 text-center sm:px-10">
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
            >
              <svg
                class="h-8 w-8 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m5 12 4 4L19 6"
                />
              </svg>
            </div>

            <h1 class="mt-6 text-2xl font-bold tracking-tight text-text-primary">
              Details submitted
            </h1>

            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Thank you. Your details have been securely submitted to the business
              for review.
            </p>
          </div>

          <div class="border-t border-border bg-bg/50 px-6 py-4 text-center">
            <p class="text-xs text-text-muted">
              Powered by RigePay
            </p>
          </div>
        </div>
        <div
          v-else-if="error && !info"
          class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div class="px-6 py-14 text-center sm:px-10">
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-light"
            >
              <svg
                class="h-8 w-8 text-error-text"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v4m0 4h.01M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </div>

            <h1 class="mt-6 text-xl font-bold text-text-primary">
              Link not available
            </h1>

            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              {{ error }}
            </p>
          </div>
        </div>
        <template v-else-if="info">
          <div
            class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
          >
            <!-- Hero -->
            <div class="border-b border-border px-6 py-7 sm:px-10 sm:py-8">
              <div class="flex items-start gap-4">
                <div
                  class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex"
                >
                  <svg
                    class="h-6 w-6 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wider text-primary">
                    Customer onboarding
                  </p>

                  <h1
                    class="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl"
                  >
                    Confirm your details
                  </h1>

                  <p class="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    Please provide your payment and business details for
                    <span class="font-semibold text-text-primary">
                      {{ info.legal_name }}
                    </span>.
                    Billing will be handled in
                    <span class="font-semibold text-text-primary">
                      {{ info.preferred_currency }}
                    </span>.
                  </p>
                </div>
              </div>
            </div>
            <div v-if="error" class="px-6 pt-6 sm:px-10">
              <div
                class="flex items-start gap-3 rounded-xl border border-error-text/10 bg-error-light px-4 py-3"
              >
                <svg
                  class="mt-0.5 h-5 w-5 shrink-0 text-error-text"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v4m0 4h.01M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
                  />
                </svg>

                <p class="text-sm leading-5 text-error-text">
                  {{ error }}
                </p>
              </div>
            </div>
            <div class="space-y-8 px-6 py-7 sm:px-10 sm:py-9">
              <section>
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Payment details
                  </h2>
                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Choose how payments should be processed for your account.
                  </p>
                </div>

                <div
                  class="rounded-xl border border-border bg-bg/40 p-4 sm:p-5"
                >
                  <AppSelect
                    v-model="form.method"
                    label="Preferred payment method"
                    :options="[
                      { value: 'MOBILE_MONEY', label: 'Mobile money' },
                      { value: 'BANK', label: 'Bank account' },
                      { value: 'PAYBILL', label: 'Paybill' },
                      { value: 'TILL', label: 'Till' },
                      { value: 'CARD', label: 'Card' },
                    ]"
                  />

                  <div
                    v-if="form.method === 'BANK'"
                    class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                  >
                    <AppInput
                      v-model="form.bank_code"
                      label="Bank code"
                    />

                    <AppInput
                      v-model="form.bank_account_number"
                      label="Account number"
                    />

                    <div class="sm:col-span-2">
                      <AppInput
                        v-model="form.account_name"
                        label="Account name"
                      />
                    </div>
                  </div>

                  <div v-else class="mt-4">
                    <AppInput
                      v-if="form.method === 'PAYBILL'"
                      v-model="form.paybill_number"
                      label="Paybill number"
                    />

                    <AppInput
                      v-else-if="form.method === 'TILL'"
                      v-model="form.till_number"
                      label="Till number"
                    />

                    <AppInput
                      v-else-if="form.method === 'MOBILE_MONEY'"
                      v-model="form.phone_number"
                      label="Phone number"
                    />
                  </div>
                </div>
              </section>
              <section class="border-t border-border pt-7">
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Primary contact
                    <span class="font-normal text-text-muted">
                      · Optional
                    </span>
                  </h2>

                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Add someone the business can contact regarding billing.
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AppInput
                    v-model="form.contact_name"
                    label="Name"
                  />

                  <AppInput
                    v-model="form.contact_email"
                    label="Email"
                    type="email"
                  />

                  <div class="sm:col-span-2">
                    <AppInput
                      v-model="form.contact_phone"
                      label="Phone"
                    />
                  </div>
                </div>
              </section>
              <section class="border-t border-border pt-7">
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Business information
                  </h2>

                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Help us keep your billing records accurate.
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AppInput
                    v-model="form.registration_number"
                    label="Registration number"
                  />

                  <AppInput
                    v-model="form.tax_number"
                    label="Tax number (KRA PIN)"
                  />

                  <div class="sm:col-span-2">
                    <AppInput
                      v-model="form.billing_address"
                      label="Billing address"
                    />
                  </div>
                </div>
              </section>
              <section class="border-t border-border pt-7">
                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div class="max-w-md">
                    <p class="text-xs leading-5 text-text-muted">
                      By submitting these details, you confirm that the
                      information provided is accurate.
                    </p>
                  </div>

                  <div class="shrink-0 sm:w-48">
                    <AppButton
                      variant="primary"
                      block
                      :loading="submitting"
                      @click="submit"
                    >
                      Submit details
                    </AppButton>
                  </div>
                </div>
              </section>
            </div>
            <div
              class="border-t border-border bg-bg/40 px-6 py-4 sm:px-10"
            >
              <div
                class="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
              >
                <p class="text-xs text-text-muted">
                  Your information is submitted securely.
                </p>

                <p class="text-xs font-medium text-text-muted">
                  Powered by RigePay
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

