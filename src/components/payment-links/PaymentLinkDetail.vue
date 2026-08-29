<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchPaymentLink, fetchPaymentLinkPayments, fetchPaymentLinkSession,
  pausePaymentLink, resumePaymentLink, closePaymentLink,
  updatePaymentLinkAppearance, uploadPaymentLinkImage,
  type OrgPaymentLink, type PaymentLinkStats, type PaymentLinkPayment,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { CopyIcon, CheckIcon, PauseIcon, PlayIcon, BanIcon, ImageIcon, Loader2Icon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; linkId: string; listRouteName: string }>()
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const isBranch = computed(() => !!props.branchId)

const link = ref<OrgPaymentLink | null>(null)
const stats = ref<PaymentLinkStats | null>(null)
const loading = ref(true)
const tab = ref<'overview' | 'payments' | 'sessions' | 'activity'>('overview')

const payments = ref<PaymentLinkPayment[]>([])
const paymentsLoaded = ref(false)
const session = ref<Record<string, unknown> | null>(null)
const sessionLoaded = ref(false)
const busy = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await fetchPaymentLink(props.linkId, isBranch.value)
    link.value = res.link
    stats.value = res.stats
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function selectTab(t: typeof tab.value) {
  tab.value = t
  if (t === 'payments' && !paymentsLoaded.value) {
    try {
      payments.value = (await fetchPaymentLinkPayments(props.linkId, isBranch.value)).payments
      paymentsLoaded.value = true
    } catch (err) { showError(extractErrorMessage(err)) }
  }
  if (t === 'sessions' && !sessionLoaded.value) {
    try {
      session.value = await fetchPaymentLinkSession(props.linkId, isBranch.value)
      sessionLoaded.value = true
    } catch (err) { showError(extractErrorMessage(err)) }
  }
}

const activity = computed(() => {
  if (!link.value) return []
  const items: { at: string; label: string }[] = [{ at: link.value.created_at, label: 'Payment link created' }]
  for (const p of payments.value) {
    items.push({ at: p.created_at, label: `Payment ${p.status.toLowerCase()} — KES ${formatMoney(p.amount_cents)}${p.payer_phone ? ' from ' + p.payer_phone : ''}` })
  }
  return items.sort((a, b) => +new Date(b.at) - +new Date(a.at))
})

const copied = ref(false)
function copyUrl() {
  if (!link.value?.checkout_url) return
  navigator.clipboard?.writeText(link.value.checkout_url)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
function shareUrl() {
  if (!link.value?.checkout_url) return
  if (navigator.share) navigator.share({ url: link.value.checkout_url, title: link.value.name || 'Payment link' }).catch(() => {})
  else copyUrl()
}

async function doPause() {
  busy.value = true
  try { await pausePaymentLink(props.linkId, isBranch.value); await load() }
  catch (err) { showError(extractErrorMessage(err)) }
  finally { busy.value = false }
}
async function doResume() {
  busy.value = true
  try { await resumePaymentLink(props.linkId, isBranch.value); await load() }
  catch (err) { showError(extractErrorMessage(err)) }
  finally { busy.value = false }
}
async function doDisable() {
  const ok = await confirmAction({ title: 'Disable this payment link?', message: 'It will stop accepting payments permanently.', confirmLabel: 'Disable', danger: true })
  if (!ok) return
  busy.value = true
  try { await closePaymentLink(props.linkId, isBranch.value); await load() }
  catch (err) { showError(extractErrorMessage(err)) }
  finally { busy.value = false }
}

// --- Checkout appearance editing ---
const editingAppearance = ref(false)
const appForm = ref({ payment_image_url: '', header_banner_url: '', image_alt: '', brand_color: '', redirect_url: '', cancel_url: '' })
const appUploading = ref<'' | 'payment_image' | 'header_banner'>('')

function startEditAppearance() {
  if (!link.value) return
  appForm.value = {
    payment_image_url: link.value.payment_image_url || '',
    header_banner_url: link.value.header_banner_url || '',
    image_alt: link.value.image_alt || '',
    brand_color: link.value.brand_color || '',
    redirect_url: link.value.redirect_url || '',
    cancel_url: link.value.cancel_url || '',
  }
  editingAppearance.value = true
}

async function uploadAppImage(e: Event, purpose: 'payment_image' | 'header_banner') {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  appUploading.value = purpose
  try {
    const url = await uploadPaymentLinkImage(file, purpose, isBranch.value)
    if (purpose === 'payment_image') appForm.value.payment_image_url = url
    else appForm.value.header_banner_url = url
  } catch (err) { showError(extractErrorMessage(err)) }
  finally { appUploading.value = '' }
}

async function saveAppearance() {
  busy.value = true
  try {
    await updatePaymentLinkAppearance(props.linkId, {
      payment_image_url: appForm.value.payment_image_url || null,
      header_banner_url: appForm.value.header_banner_url || null,
      image_alt: appForm.value.image_alt || null,
      brand_color: appForm.value.brand_color || null,
      redirect_url: appForm.value.redirect_url || null,
      cancel_url: appForm.value.cancel_url || null,
    }, isBranch.value)
    editingAppearance.value = false
    showSuccess('Checkout appearance updated')
    await load()
  } catch (err) { showError(extractErrorMessage(err)) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink :to="{ name: props.listRouteName, params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId } }" class="text-xs font-semibold text-text-muted hover:text-primary">← Payment links</RouterLink>

    <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

    <template v-else-if="link">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold text-text-primary">{{ link.name || link.description || 'Payment link' }}</h1>
            <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="link.display_status === 'ACTIVE' ? 'bg-success-muted text-success' : link.display_status === 'PAUSED' ? 'bg-warning-muted text-warning' : 'bg-surface-2 text-text-muted'">
              {{ link.display_status ?? link.status }}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1.5">
            <a :href="link.checkout_url" target="_blank" rel="noopener" class="text-xs font-semibold text-primary underline break-all">{{ link.checkout_url }}</a>
            <button class="text-text-muted hover:text-primary" @click="copyUrl"><CheckIcon v-if="copied" class="w-3.5 h-3.5 text-success" /><CopyIcon v-else class="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" @click="shareUrl">Share</AppButton>
          <AppButton v-if="link.display_status === 'PAUSED'" size="sm" variant="secondary" :loading="busy" @click="doResume">
            <template #icon><PlayIcon class="w-4 h-4" /></template>Resume
          </AppButton>
          <AppButton v-else-if="link.display_status === 'ACTIVE'" size="sm" variant="secondary" :loading="busy" @click="doPause">
            <template #icon><PauseIcon class="w-4 h-4" /></template>Pause
          </AppButton>
          <AppButton v-if="link.display_status === 'ACTIVE' || link.display_status === 'PAUSED'" size="sm" variant="danger" :loading="busy" @click="doDisable">
            <template #icon><BanIcon class="w-4 h-4" /></template>Disable
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Collected</p><p class="text-lg font-bold text-success">KES {{ formatMoney(stats?.collected_cents ?? 0) }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Successful</p><p class="text-lg font-bold text-text-primary">{{ stats?.successful_count ?? 0 }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Pending</p><p class="text-lg font-bold text-warning">{{ stats?.pending_count ?? 0 }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Failed</p><p class="text-lg font-bold text-error">{{ stats?.failed_count ?? 0 }}</p></AppCard>
        <AppCard padding="sm"><p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Conversion</p><p class="text-lg font-bold text-text-primary">{{ (stats?.conversion_pct ?? 0).toFixed(2) }}%</p></AppCard>
      </div>

      <div class="flex gap-1 border-b border-border">
        <button v-for="t in (['overview','payments','sessions','activity'] as const)" :key="t"
          class="px-3 py-2 text-sm font-semibold capitalize -mb-px border-b-2"
          :class="tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
          @click="selectTab(t)">{{ t }}</button>
      </div>

      <!-- Overview -->
      <AppCard v-if="tab === 'overview'">
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
          <div class="flex justify-between"><dt class="text-text-muted">Code</dt><dd class="font-mono text-text-primary">{{ link.code }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Type</dt><dd class="text-text-primary">STANDARD</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Amount mode</dt><dd class="text-text-primary">{{ link.allow_open_amount ? 'OPEN' : 'FIXED' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Amount</dt><dd class="text-text-primary">{{ link.allow_open_amount ? 'Open' : `KES ${formatMoney(link.amount_cents)}` }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Customer</dt><dd class="text-text-primary">{{ link.customer_label || 'Anyone with link' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Single use</dt><dd class="text-text-primary">{{ link.is_reusable ? 'No' : 'Yes' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Usage limit</dt><dd class="text-text-primary">{{ link.max_uses ? `${link.use_count ?? 0} / ${link.max_uses}` : 'None' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Expiry</dt><dd class="text-text-primary">{{ new Date(link.expires_at).toLocaleString() }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Description</dt><dd class="text-text-primary">{{ link.description || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">Methods</dt><dd class="text-text-primary">{{ link.payment_methods || 'All' }}</dd></div>
          <div v-if="link.redirect_url" class="flex justify-between gap-4"><dt class="text-text-muted">Redirect</dt><dd class="text-text-primary truncate">{{ link.redirect_url }}</dd></div>
          <div v-if="link.cancel_url" class="flex justify-between gap-4"><dt class="text-text-muted">Cancel URL</dt><dd class="text-text-primary truncate">{{ link.cancel_url }}</dd></div>
        </dl>

        <div class="border-t border-border mt-5 pt-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-xs font-bold text-text-primary uppercase tracking-wide">Checkout appearance</p>
              <p class="text-[11px] text-text-muted">Optional imagery shown on the hosted payment page.</p>
            </div>
            <AppButton v-if="!editingAppearance" size="sm" variant="secondary" @click="startEditAppearance">Edit</AppButton>
          </div>

          <div v-if="!editingAppearance" class="grid sm:grid-cols-2 gap-4">
            <div>
              <p class="text-[11px] font-semibold text-text-muted mb-1">Payment image</p>
              <img v-if="link.payment_image_url" :src="link.payment_image_url" :alt="link.image_alt || ''" class="w-32 h-32 rounded-lg object-cover border border-border" />
              <p v-else class="text-xs text-text-muted">No payment image</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold text-text-muted mb-1">Header banner</p>
              <img v-if="link.header_banner_url" :src="link.header_banner_url" alt="" class="w-full max-w-xs h-20 rounded-lg object-cover border border-border" />
              <p v-else class="text-xs text-text-muted">Default RigePay header</p>
            </div>
          </div>

          <div v-else class="flex flex-col gap-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <p class="text-[11px] font-semibold text-text-secondary mb-1">Payment image</p>
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
                    <img v-if="appForm.payment_image_url" :src="appForm.payment_image_url" alt="" class="w-full h-full object-cover" />
                    <ImageIcon v-else class="w-5 h-5 text-text-muted" />
                  </div>
                  <label class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary border border-primary/40 cursor-pointer hover:bg-primary/5">
                    <Loader2Icon v-if="appUploading === 'payment_image'" class="w-3.5 h-3.5 animate-spin" /> Upload
                    <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => uploadAppImage(e, 'payment_image')" />
                  </label>
                </div>
              </div>
              <div>
                <p class="text-[11px] font-semibold text-text-secondary mb-1">Header banner</p>
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
                    <img v-if="appForm.header_banner_url" :src="appForm.header_banner_url" alt="" class="w-full h-full object-cover" />
                    <ImageIcon v-else class="w-5 h-5 text-text-muted" />
                  </div>
                  <label class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary border border-primary/40 cursor-pointer hover:bg-primary/5">
                    <Loader2Icon v-if="appUploading === 'header_banner'" class="w-3.5 h-3.5 animate-spin" /> Upload
                    <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => uploadAppImage(e, 'header_banner')" />
                  </label>
                </div>
              </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <AppInput v-model="appForm.image_alt" label="Image alt text" placeholder="Optional" />
              <AppInput v-model="appForm.brand_color" label="Brand colour (hex)" placeholder="#0F62FE" />
              <AppInput v-model="appForm.redirect_url" label="Redirect URL" placeholder="https://…" />
              <AppInput v-model="appForm.cancel_url" label="Cancel URL" placeholder="https://…" />
            </div>
            <div class="flex gap-2">
              <AppButton size="sm" :loading="busy" @click="saveAppearance">Save</AppButton>
              <AppButton size="sm" variant="ghost" @click="editingAppearance = false">Cancel</AppButton>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Payments -->
      <AppCard v-else-if="tab === 'payments'" padding="none">
        <p v-if="!payments.length" class="text-sm text-text-muted px-5 py-8">No payments yet.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2.5">Payer</th><th class="px-5 py-2.5">Method</th><th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5 text-right">Amount</th><th class="px-5 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments" :key="p.id" class="border-b border-border last:border-0">
                <td class="px-5 py-2.5 text-text-primary">{{ p.payer_phone || p.payer_email || '—' }}</td>
                <td class="px-5 py-2.5 text-text-secondary">{{ p.method }}</td>
                <td class="px-5 py-2.5">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="['PAID','COMPLETED','SUCCESS'].includes(p.status) ? 'bg-success-muted text-success' : ['FAILED','CANCELLED'].includes(p.status) ? 'bg-error-muted text-error' : 'bg-surface-2 text-text-muted'">
                    {{ p.status }}
                  </span>
                </td>
                <td class="px-5 py-2.5 text-right font-semibold text-text-primary">KES {{ formatMoney(p.amount_cents) }}</td>
                <td class="px-5 py-2.5 text-text-muted">{{ new Date(p.created_at).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Sessions -->
      <AppCard v-else-if="tab === 'sessions'">
        <p v-if="!session" class="text-sm text-text-muted">No checkout sessions. Sessions are created for developer-API checkouts.</p>
        <pre v-else class="text-xs bg-surface-2 rounded-lg p-4 overflow-x-auto">{{ JSON.stringify(session, null, 2) }}</pre>
      </AppCard>

      <!-- Activity -->
      <AppCard v-else-if="tab === 'activity'" padding="none">
        <ul class="divide-y divide-border">
          <li v-for="(a, i) in activity" :key="i" class="px-5 py-3 flex items-center justify-between text-sm">
            <span class="text-text-primary">{{ a.label }}</span>
            <span class="text-xs text-text-muted">{{ new Date(a.at).toLocaleString() }}</span>
          </li>
        </ul>
      </AppCard>
    </template>
  </div>
</template>
