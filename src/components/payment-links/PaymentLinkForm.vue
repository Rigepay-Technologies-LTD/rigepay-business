<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createPaymentLink, uploadPaymentLinkImage, fetchOrgCustomersLite,
  type CreatePaymentLinkInput, type OrgCustomerLite,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { ImageIcon, Loader2Icon, XIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; detailRouteName: string }>()
const router = useRouter()
const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const form = reactive({
  name: '',
  linkType: 'STANDARD' as 'STANDARD' | 'INVOICE' | 'CUSTOMER' | 'DONATION',
  description: '',
  amountMode: 'FIXED' as 'FIXED' | 'OPEN' | 'OPTIONAL_PRESET',
  currency: 'KES',
  amountKes: '',
  paymentImageUrl: '',
  headerBannerUrl: '',
  imageAlt: '',
  whoCanPay: 'anyone' as 'anyone' | 'specific',
  customerId: '',
  collectName: false,
  collectPhone: true,
  collectEmail: false,
  requireReference: false,
  allowMessage: false,
  methodMobile: true,
  methodCard: true,
  methodBank: true,
  singleUse: false,
  expiresAt: '',
  redirectUrl: '',
  cancelUrl: '',
})

const uploading = reactive({ payment_image: false, header_banner: false })
const submitting = ref(false)
const errorMsg = ref('')

const customers = ref<OrgCustomerLite[]>([])
const customersLoaded = ref(false)
watch(() => form.whoCanPay, async (v) => {
  if (v === 'specific' && !customersLoaded.value) {
    customersLoaded.value = true
    try { customers.value = await fetchOrgCustomersLite() }
    catch (err) { showError(extractErrorMessage(err)) }
  }
})

async function handleUpload(e: Event, purpose: 'payment_image' | 'header_banner') {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('Image must be PNG, JPEG or WebP.')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    showError('Image must be 5 MB or smaller.')
    return
  }
  uploading[purpose] = true
  try {
    const url = await uploadPaymentLinkImage(file, purpose, isBranch.value)
    if (purpose === 'payment_image') form.paymentImageUrl = url
    else form.headerBannerUrl = url
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    uploading[purpose] = false
  }
}

function daysUntil(dateStr: string): number | undefined {
  if (!dateStr) return undefined
  const target = new Date(dateStr + 'T23:59:59')
  const diff = Math.ceil((target.getTime() - Date.now()) / 86_400_000)
  return diff > 0 ? diff : undefined
}

async function submit() {
  errorMsg.value = ''
  const amountCents = Math.round(Number(form.amountKes) * 100)
  if (form.amountMode !== 'OPEN' && (!amountCents || amountCents < 100)) {
    errorMsg.value = form.amountMode === 'OPTIONAL_PRESET'
      ? 'Enter a preset amount of at least KES 1 (the payer can still change it).'
      : 'Enter an amount of at least KES 1, or switch the amount mode to Open.'
    return
  }
  if (!form.name.trim()) {
    errorMsg.value = 'Give the payment link a name.'
    return
  }
  if (form.whoCanPay === 'specific' && !form.customerId) {
    errorMsg.value = 'Select the customer who can pay, or switch back to "Anyone with this link".'
    return
  }
  const methods: string[] = []
  if (form.methodMobile) methods.push('mobile_money')
  if (form.methodCard) methods.push('card')
  if (form.methodBank) methods.push('bank')
  if (!methods.length) {
    errorMsg.value = 'Enable at least one payment method.'
    return
  }

  const payload: CreatePaymentLinkInput = {
    name: form.name.trim(),
    amount_cents: form.amountMode === 'OPEN' ? 0 : amountCents,
    currency: form.currency,
    description: form.description.trim() || undefined,
    allow_open_amount: form.amountMode !== 'FIXED',
    link_type: form.linkType,
    customer_id: form.whoCanPay === 'specific' ? form.customerId : undefined,
    is_reusable: !form.singleUse,
    expires_in_days: daysUntil(form.expiresAt),
    payment_image_url: form.paymentImageUrl || undefined,
    header_banner_url: form.headerBannerUrl || undefined,
    image_alt: form.imageAlt.trim() || undefined,
    collect_name: form.collectName,
    collect_phone: form.collectPhone,
    collect_email: form.collectEmail,
    require_reference: form.requireReference,
    allow_message: form.allowMessage,
    payment_methods: methods.length === 3 ? '' : methods.join(','),
    redirect_url: form.redirectUrl.trim() || undefined,
    cancel_url: form.cancelUrl.trim() || undefined,
  }
  if (props.branchId) payload.branch_id = props.branchId

  submitting.value = true
  try {
    const result = await createPaymentLink(payload, isBranch.value)
    router.push({ name: props.detailRouteName, params: props.branchId
      ? { orgId: props.orgId, branchId: props.branchId, linkId: result.data.id }
      : { orgId: props.orgId, linkId: result.data.id } })
  } catch (err) {
    errorMsg.value = extractErrorMessage(err)
    showError(errorMsg.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-6 max-w-3xl" @submit.prevent="submit">
    <p v-if="errorMsg" class="text-sm text-error-text bg-error-light rounded-lg px-3 py-2">{{ errorMsg }}</p>

    <!-- Basic details -->
    <AppCard>
      <h2 class="text-sm font-bold text-text-primary mb-4">Basic details</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <AppInput v-model="form.name" label="Name" placeholder="e.g. Medical fundraiser" required />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Link type</label>
          <select v-model="form.linkType" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
            <option value="STANDARD">STANDARD</option>
            <option value="INVOICE">INVOICE</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="DONATION">DONATION</option>
          </select>
        </div>
        <AppInput v-model="form.description" label="Description" placeholder="Optional" class="sm:col-span-2" />
      </div>

      <div class="mt-5 border-t border-border pt-4">
        <p class="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Amount</p>
        <div class="grid sm:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Amount mode</label>
            <select v-model="form.amountMode" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
              <option value="FIXED">FIXED</option>
              <option value="OPEN">OPEN</option>
              <option value="OPTIONAL_PRESET">OPTIONAL_PRESET</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Currency</label>
            <select v-model="form.currency" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <AppInput
            v-model="form.amountKes" type="number"
            :label="form.amountMode === 'OPEN' ? 'Amount (payer decides)' : form.amountMode === 'OPTIONAL_PRESET' ? 'Preset amount (editable at checkout)' : 'Amount'"
            :placeholder="form.amountMode === 'OPEN' ? 'Not required' : '0.00'"
            :disabled="form.amountMode === 'OPEN'"
          />
        </div>
      </div>
    </AppCard>

    <!-- Checkout appearance -->
    <AppCard>
      <h2 class="text-sm font-bold text-text-primary mb-1">Checkout appearance</h2>
      <p class="text-xs text-text-muted mb-4">Optional imagery shown on the hosted payment page.</p>

      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <p class="text-xs font-semibold text-text-secondary mb-1">Payment image</p>
          <p class="text-[11px] text-text-muted mb-2">Show the product, service, event or payment purpose.</p>
          <div class="rounded-xl border border-dashed border-border p-3 flex items-center gap-3">
            <div class="w-16 h-16 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
              <img v-if="form.paymentImageUrl" :src="form.paymentImageUrl" alt="" class="w-full h-full object-cover" />
              <ImageIcon v-else class="w-5 h-5 text-text-muted" />
            </div>
            <div class="min-w-0">
              <label class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary border border-primary/40 cursor-pointer hover:bg-primary/5">
                <Loader2Icon v-if="uploading.payment_image" class="w-3.5 h-3.5 animate-spin" />
                {{ form.paymentImageUrl ? 'Replace' : 'Upload image' }}
                <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => handleUpload(e, 'payment_image')" />
              </label>
              <button v-if="form.paymentImageUrl" type="button" class="ml-2 text-xs text-error inline-flex items-center gap-1" @click="form.paymentImageUrl = ''">
                <XIcon class="w-3 h-3" /> Remove
              </button>
              <p class="text-[11px] text-text-muted mt-1">PNG, JPEG or WebP. Max 5 MB.</p>
            </div>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-text-secondary mb-1">Checkout header banner</p>
          <p class="text-[11px] text-text-muted mb-2">Used as the hosted payment form header background.</p>
          <div class="rounded-xl border border-dashed border-border p-3 flex items-center gap-3">
            <div class="w-16 h-16 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
              <img v-if="form.headerBannerUrl" :src="form.headerBannerUrl" alt="" class="w-full h-full object-cover" />
              <ImageIcon v-else class="w-5 h-5 text-text-muted" />
            </div>
            <div class="min-w-0">
              <label class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary border border-primary/40 cursor-pointer hover:bg-primary/5">
                <Loader2Icon v-if="uploading.header_banner" class="w-3.5 h-3.5 animate-spin" />
                {{ form.headerBannerUrl ? 'Replace' : 'Upload image' }}
                <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => handleUpload(e, 'header_banner')" />
              </label>
              <button v-if="form.headerBannerUrl" type="button" class="ml-2 text-xs text-error inline-flex items-center gap-1" @click="form.headerBannerUrl = ''">
                <XIcon class="w-3 h-3" /> Remove
              </button>
              <p class="text-[11px] text-text-muted mt-1">PNG, JPEG or WebP. Max 5 MB.</p>
            </div>
          </div>
        </div>
      </div>

      <AppInput v-model="form.imageAlt" label="Image alternative text" placeholder="Optional" class="mt-4 max-w-md" />
    </AppCard>

    <!-- Customer and collection -->
    <AppCard>
      <h2 class="text-sm font-bold text-text-primary mb-4">Customer and collection</h2>
      <div class="grid sm:grid-cols-2 gap-4 max-w-xl mb-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Who can pay</label>
          <select v-model="form.whoCanPay" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
            <option value="anyone">Anyone with this link</option>
            <option value="specific">Specific customer</option>
          </select>
        </div>
        <div v-if="form.whoCanPay === 'specific'" class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Customer</label>
          <select v-model="form.customerId" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
            <option value="">Select a customer…</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">
              {{ c.display_name ? `${c.display_name} · ${c.phone}` : c.phone }}
            </option>
          </select>
          <p v-if="customersLoaded && !customers.length" class="text-[11px] text-text-muted">No saved customers yet.</p>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-2.5">
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.collectName" class="w-4 h-4 rounded" /> Collect customer name</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.collectPhone" class="w-4 h-4 rounded" /> Collect phone</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.collectEmail" class="w-4 h-4 rounded" /> Collect email</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.requireReference" class="w-4 h-4 rounded" /> Require customer reference</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.allowMessage" class="w-4 h-4 rounded" /> Allow customer message</label>
      </div>
    </AppCard>

    <!-- Payment methods -->
    <AppCard>
      <h2 class="text-sm font-bold text-text-primary mb-4">Payment methods</h2>
      <div class="grid sm:grid-cols-3 gap-2.5">
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.methodMobile" class="w-4 h-4 rounded" /> Mobile money</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.methodCard" class="w-4 h-4 rounded" /> Card</label>
        <label class="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" v-model="form.methodBank" class="w-4 h-4 rounded" /> Bank</label>
      </div>
    </AppCard>

    <!-- Controls -->
    <AppCard>
      <h2 class="text-sm font-bold text-text-primary mb-4">Controls</h2>
      <label class="flex items-center gap-2 text-sm text-text-primary mb-4"><input type="checkbox" v-model="form.singleUse" class="w-4 h-4 rounded" /> Single use</label>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Expires at</label>
          <input v-model="form.expiresAt" type="date" class="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary" />
        </div>
        <div />
        <AppInput v-model="form.redirectUrl" label="Redirect URL" placeholder="https://…" />
        <AppInput v-model="form.cancelUrl" label="Cancel URL" placeholder="https://…" />
      </div>
    </AppCard>

    <div class="flex gap-2">
      <AppButton type="submit" :loading="submitting">Create and activate</AppButton>
      <AppButton type="button" variant="ghost" @click="router.back()">Cancel</AppButton>
    </div>
  </form>
</template>
