<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgPaymentLinks, createOrgPaymentLink, closeOrgPaymentLink,
  type OrgPaymentLink,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, LinkIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const links = ref<OrgPaymentLink[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    links.value = await fetchOrgPaymentLinks()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createdUrl = ref<string | null>(null)

const amountKes = ref('')
const description = ref('')
const isReusable = ref(false)
const allowOpenAmount = ref(false)

async function submitCreate() {
  createError.value = null
  createdUrl.value = null
  const amountCents = Math.round(Number(amountKes.value) * 100)
  if (!allowOpenAmount.value && (!amountCents || amountCents < 100)) {
    createError.value = 'Enter a valid amount (min KES 1), or turn on "Let payer choose amount".'
    return
  }
  creating.value = true
  try {
    const result = await createOrgPaymentLink({
      amount_cents: amountCents || 0,
      description: description.value.trim() || undefined,
      is_reusable: isReusable.value,
      allow_open_amount: allowOpenAmount.value,
    })
    createdUrl.value = result.url
    amountKes.value = ''
    description.value = ''
    isReusable.value = false
    allowOpenAmount.value = false
    await load()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const copiedId = ref<string | null>(null)
function copyLink(link: OrgPaymentLink) {
  const url = `${link.code}` // fallback if we don't have the full base URL client-side
  navigator.clipboard?.writeText(linkUrl(link)).catch(() => navigator.clipboard?.writeText(url))
  copiedId.value = link.id
  setTimeout(() => { if (copiedId.value === link.id) copiedId.value = null }, 2000)
}

// The API only returns the full URL at creation time; for existing links we
// reconstruct it from the code using the same checkout domain.
function linkUrl(link: OrgPaymentLink): string {
  return `https://pay.rigepay.co.ke/${link.code}`
}

const closingId = ref<string | null>(null)
async function handleClose(link: OrgPaymentLink) {
  if (!confirm('Close this payment link? It will no longer accept payments.')) return
  closingId.value = link.id
  try {
    await closeOrgPaymentLink(link.id)
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    closingId.value = null
  }
}

function statusVariant(status: string) {
  if (status === 'PAID') return 'success'
  if (status === 'EXPIRED') return 'neutral'
  return 'warning'
}

const selectedLink = ref<OrgPaymentLink | null>(null)
function openDetails(link: OrgPaymentLink) {
  selectedLink.value = link
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payment links">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Payment links</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Shareable links people can pay via M-Pesa STK, paybill, bank transfer, or card. Hosted at
            pay.rigepay.co.ke.
          </p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New link
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New payment link</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <div v-if="createdUrl" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3 break-all">
          Link created: <a :href="createdUrl" target="_blank" class="font-semibold underline">{{ createdUrl }}</a>
        </div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="submitCreate">
          <label class="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input type="checkbox" v-model="allowOpenAmount" class="w-4 h-4 rounded" />
            Let payer choose the amount
          </label>
          <AppInput
            v-model="amountKes" type="number"
            :label="allowOpenAmount ? 'Minimum amount (KES)' : 'Amount (KES)'"
            placeholder="Min 1" :required="!allowOpenAmount"
          />
          <AppInput v-model="description" label="Description (optional)" placeholder="e.g. Consulting retainer" />
          <label class="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input type="checkbox" v-model="isReusable" class="w-4 h-4 rounded" />
            Reusable — accept payments from more than one person
          </label>
          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create link</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading payment links…</p>
      <AppCard v-else-if="!links.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <LinkIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No payment links yet</p>
          <p class="text-xs text-text-muted">Create one to start collecting payments by link.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <AppCard v-for="link in links" :key="link.id" padding="none">
          <div
            class="flex items-center justify-between gap-3 px-5 py-3.5 cursor-pointer hover:bg-primary-muted/40 transition-colors"
            @click="openDetails(link)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <AppBadge :variant="statusVariant(link.status)" size="sm">{{ link.status }}</AppBadge>
                <AppBadge v-if="link.is_reusable" variant="neutral" size="sm">Reusable</AppBadge>
                <AppBadge v-if="link.allow_open_amount" variant="neutral" size="sm">Open amount</AppBadge>
              </div>
              <p class="text-sm font-semibold text-text-primary mt-1 truncate">
                {{ link.description || 'Payment link' }} — KES {{ formatMoney(link.amount_cents) }}
                <span v-if="link.allow_open_amount" class="font-normal text-text-muted">min</span>
              </p>
              <p class="text-xs text-text-muted mt-0.5">
                {{ linkUrl(link) }} · created {{ formatDate(link.created_at) }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button" class="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
                title="Copy link" @click.stop="copyLink(link)"
              >
                <CheckIcon v-if="copiedId === link.id" class="w-4 h-4 text-success" />
                <CopyIcon v-else class="w-4 h-4" />
              </button>
              <AppButton
                v-if="link.status !== 'EXPIRED'" size="sm" variant="ghost"
                :loading="closingId === link.id" @click.stop="handleClose(link)"
              >Close</AppButton>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <AppModal :model-value="!!selectedLink" title="Payment link details" size="sm" @update:model-value="selectedLink = null">
      <div v-if="selectedLink" class="flex flex-col gap-3 p-6">
        <div class="flex items-center gap-2">
          <AppBadge :variant="statusVariant(selectedLink.status)" size="sm">{{ selectedLink.status }}</AppBadge>
          <AppBadge v-if="selectedLink.is_reusable" variant="neutral" size="sm">Reusable</AppBadge>
          <AppBadge v-if="selectedLink.allow_open_amount" variant="neutral" size="sm">Open amount</AppBadge>
        </div>
        <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(selectedLink.amount_cents) }}</p>
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between"><dt class="text-text-muted">Description</dt><dd class="font-medium text-text-primary">{{ selectedLink.description || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Code</dt><dd class="font-mono font-medium text-text-primary">{{ selectedLink.code }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Created</dt><dd class="font-medium text-text-primary">{{ formatDate(selectedLink.created_at) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Expires</dt><dd class="font-medium text-text-primary">{{ formatDate(selectedLink.expires_at) }}</dd></div>
        </dl>
        <div class="border-t border-border pt-3 flex items-center justify-between gap-2">
          <a :href="linkUrl(selectedLink)" target="_blank" rel="noopener" class="text-xs font-semibold text-primary underline break-all">{{ linkUrl(selectedLink) }}</a>
          <button type="button" class="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-muted transition-colors" @click="copyLink(selectedLink)">
            <CheckIcon v-if="copiedId === selectedLink.id" class="w-4 h-4 text-success" />
            <CopyIcon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppModal>
  </DashboardLayout>
</template>
