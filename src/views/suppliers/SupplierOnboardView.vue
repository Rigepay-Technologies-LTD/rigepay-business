<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchSupplierOnboard,
  submitSupplierOnboard,
  type SupplierOnboardInfo,
  type SupplierPayoutMethodKind,
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
const info = ref<SupplierOnboardInfo | null>(null)
const submitting = ref(false)

const form = ref<{
  method: SupplierPayoutMethodKind
  phone_number: string
  bank_code: string
  bank_account_number: string
  account_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  registration_number: string
  tax_number: string
}>({
  method: 'MOBILE_MONEY',
  phone_number: '',
  bank_code: '',
  bank_account_number: '',
  account_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  registration_number: '',
  tax_number: '',
})

onMounted(async () => {
  try {
    info.value = await fetchSupplierOnboard(token)
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
    await submitSupplierOnboard(token, {
      payout_method: {
        method: form.value.method,
        phone_number: form.value.phone_number || undefined,
        bank_code: form.value.bank_code || undefined,
        bank_account_number: form.value.bank_account_number || undefined,
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
    <!-- Subtle RigePay ambient background -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        class="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
      />
    </div>

    <div class="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto w-full max-w-3xl">

        <!-- Header -->
        <header class="mb-6 flex items-center justify-between">
          <AppLogo size="sm" />

          <div class="hidden items-center gap-2 text-xs text-text-muted sm:flex">
            <span class="h-2 w-2 rounded-full bg-primary" />
            Secure supplier onboarding
          </div>
        </header>

        <!-- Loading -->
        <div
          v-if="loading"
          class="rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10"
        >
          <div class="animate-pulse space-y-6">
            <div class="h-7 w-52 rounded-lg bg-bg" />
            <div class="h-4 w-80 max-w-full rounded bg-bg" />

            <div class="space-y-3 pt-4">
              <div class="h-12 rounded-xl bg-bg" />
              <div class="h-12 rounded-xl bg-bg" />
              <div class="h-12 rounded-xl bg-bg" />
            </div>
          </div>
        </div>

        <!-- Success -->
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
              Thank you. Your payout details have been securely submitted
              to the buyer for review.
            </p>
          </div>

          <div class="border-t border-border bg-bg/50 px-6 py-4 text-center">
            <p class="text-xs text-text-muted">
              Powered by RigePay
            </p>
          </div>
        </div>

        <!-- Invalid link -->
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
                  d="M12 9v4m0 4h.01M10.3 3.7 2.8 17a2 2 0 0 0 1.7 0L13.7 3.7a2 2 0 0 0-3.4 0Z"
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

        <!-- Supplier onboarding -->
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
                      d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 12h.01M2 10l10 5 10-5M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wider text-primary">
                    Supplier onboarding
                  </p>

                  <h1
                    class="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl"
                  >
                    Set up your payouts
                  </h1>

                  <p class="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    Provide your payout and business details for
                    <span class="font-semibold text-text-primary">
                      {{ info.legal_name }}
                    </span>
                    regarding
                    <span class="font-semibold text-text-primary">
                      {{ info.category }}
                    </span>
                    purchases in
                    <span class="font-semibold text-text-primary">
                      {{ info.preferred_currency }}
                    </span>.
                  </p>
                </div>
              </div>
            </div>

            <!-- Error -->
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

            <!-- Form -->
            <div class="space-y-8 px-6 py-7 sm:px-10 sm:py-9">

              <!-- Payout -->
              <section>
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Payout details
                  </h2>

                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Choose where payments from the buyer should be sent.
                  </p>
                </div>

                <div
                  class="rounded-xl border border-border bg-bg/40 p-4 sm:p-5"
                >
                  <AppSelect
                    v-model="form.method"
                    label="Payout method"
                    :options="[
                      { value: 'MOBILE_MONEY', label: 'Mobile money' },
                      { value: 'BANK', label: 'Bank account' },
                      { value: 'PAYBILL', label: 'Paybill' },
                      { value: 'TILL', label: 'Till' },
                    ]"
                  />

                  <!-- Bank -->
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

                  <!-- Mobile / Paybill / Till -->
                  <div v-else class="mt-4">
                    <AppInput
                      v-model="form.phone_number"
                      label="Phone number"
                    />
                  </div>
                </div>
              </section>

              <!-- Contact -->
              <section class="border-t border-border pt-7">
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Primary contact
                    <span class="font-normal text-text-muted">
                      · Optional
                    </span>
                  </h2>

                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Add a contact person for payout or purchasing enquiries.
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

              <!-- Business information -->
              <section class="border-t border-border pt-7">
                <div class="mb-4">
                  <h2 class="text-sm font-bold text-text-primary">
                    Business information
                  </h2>

                  <p class="mt-1 text-xs leading-5 text-text-muted">
                    Provide your registration and tax details.
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
                </div>
              </section>

              <!-- Submit -->
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

            <!-- Footer -->
            <div
              class="border-t border-border bg-bg/40 px-6 py-4 sm:px-10"
            >
              <div
                class="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
              >
                <p class="text-xs text-text-muted">
                  Your payout information is submitted securely.
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
