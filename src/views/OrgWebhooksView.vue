<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  fetchOrgWebhookEndpoints, createOrgWebhookEndpoint, deleteOrgWebhookEndpoint,
  fetchOrgWebhookStats, fetchOrgWebhookEventTypes, fetchOrgAllWebhookDeliveries,
  setOrgWebhookEndpointActive, updateOrgWebhookEndpoint, testOrgWebhookEndpoint,
  type OrgWebhookEndpoint, type WebhookStats, type WebhookEventTypeInfo, type OrgWebhookDelivery,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  PlusIcon, RefreshCwIcon, WebhookIcon, TrashIcon, CopyIcon,
  RadioTowerIcon, CheckCircle2Icon, AlertCircleIcon, RotateCwIcon, GaugeIcon,
} from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const endpoints = ref<OrgWebhookEndpoint[]>([])
const stats = ref<WebhookStats | null>(null)
const eventTypes = ref<WebhookEventTypeInfo[]>([])
const deliveries = ref<OrgWebhookDelivery[]>([])
const loading = ref(true)
const tab = ref<'endpoints' | 'deliveries' | 'event-types'>('endpoints')
const deliveryStatusFilter = ref('')

async function load() {
  loading.value = true
  try {
    const [e, s, et] = await Promise.all([
      fetchOrgWebhookEndpoints(), fetchOrgWebhookStats(), fetchOrgWebhookEventTypes(),
    ])
    endpoints.value = e ?? []
    stats.value = s
    eventTypes.value = et ?? []
    if (tab.value === 'deliveries') deliveries.value = (await fetchOrgAllWebhookDeliveries()) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function selectTab(t: typeof tab.value) {
  tab.value = t
  if (t === 'deliveries' && !deliveries.value.length) {
    try { deliveries.value = (await fetchOrgAllWebhookDeliveries()) ?? [] }
    catch (err) { showError(extractErrorMessage(err)) }
  }
}

const filteredDeliveries = computed(() => {
  if (!deliveryStatusFilter.value) return deliveries.value
  return deliveries.value.filter((d) => d.status === deliveryStatusFilter.value)
})

// --- Create endpoint ---
const showForm = ref(false)
const creating = ref(false)
const formName = ref('')
const formDescription = ref('')
const formUrl = ref('')
const formEvents = ref<string[]>([])
const revealedSecret = ref<{ url: string; secret: string } | null>(null)

function webhookUrlError(raw: string): string | null {
  const u = raw.trim()
  if (!u) return 'Endpoint URL is required.'
  let parsed: URL
  try { parsed = new URL(u) } catch { return 'Enter a valid URL.' }
  if (parsed.protocol !== 'https:') return 'Webhook URL must use https://'
  const h = parsed.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '127.0.0.1' || h === '0.0.0.0' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.'))
    return 'Webhook URL cannot point to localhost or a private address.'
  return null
}

function openForm() {
  formName.value = ''
  formDescription.value = ''
  formUrl.value = ''
  formEvents.value = eventTypes.value.map((et) => et.event_type)
  showForm.value = true
}

async function createEndpoint() {
  const urlErr = webhookUrlError(formUrl.value)
  if (urlErr) { showError(urlErr); return }
  if (!formEvents.value.length) { showError('Select at least one event type.'); return }
  creating.value = true
  try {
    const result = await createOrgWebhookEndpoint({
      name: formName.value.trim() || undefined,
      description: formDescription.value.trim() || undefined,
      url: formUrl.value.trim(),
      event_types: formEvents.value,
    })
    revealedSecret.value = { url: result.url, secret: result.secret }
    if (result.test) {
      if (result.test.reachable) showSuccess(`Endpoint verified — responded in ${result.test.duration_ms} ms.`)
      else showError(`Endpoint saved, but the test event could not be delivered: ${result.test.error || 'unreachable'}. Fix your endpoint and use "Send test".`)
    }
    showForm.value = false
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    creating.value = false
  }
}

const testingId = ref<string | null>(null)
async function sendTest(ep: OrgWebhookEndpoint) {
  testingId.value = ep.id
  try {
    const r = await testOrgWebhookEndpoint(ep.id)
    if (r.reachable) showSuccess(`${ep.name || ep.url} is reachable (HTTP ${r.status_code}, ${r.duration_ms} ms).`)
    else showError(`Test failed for ${ep.name || ep.url}: ${r.error || 'unreachable'}.`)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    testingId.value = null
  }
}

async function toggleActive(ep: OrgWebhookEndpoint) {
  try {
    await setOrgWebhookEndpointActive(ep.id, !ep.is_active)
    await load()
  } catch (err) { showError(extractErrorMessage(err)) }
}

async function removeEndpoint(ep: OrgWebhookEndpoint) {
  const ok = await confirmAction({ title: 'Delete this endpoint?', message: `${ep.url} will stop receiving events.`, confirmLabel: 'Delete', danger: true })
  if (!ok) return
  try {
    await deleteOrgWebhookEndpoint(ep.id)
    await load()
  } catch (err) { showError(extractErrorMessage(err)) }
}

const editing = ref<OrgWebhookEndpoint | null>(null)
const editName = ref('')
const editDescription = ref('')
function startEdit(ep: OrgWebhookEndpoint) {
  editing.value = ep
  editName.value = ep.name || ''
  editDescription.value = ep.description || ''
}
async function saveEdit() {
  if (!editing.value) return
  try {
    await updateOrgWebhookEndpoint(editing.value.id, { name: editName.value.trim(), description: editDescription.value.trim() })
    editing.value = null
    showSuccess('Endpoint updated')
    await load()
  } catch (err) { showError(extractErrorMessage(err)) }
}

function health(ep: OrgWebhookEndpoint): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  if (!ep.is_active) return { label: 'Disabled', variant: 'neutral' }
  if (ep.last_success_at) return { label: 'Healthy', variant: 'success' }
  return { label: 'Untested', variant: 'warning' }
}
function deliveryVariant(s: string): 'success' | 'error' | 'warning' | 'neutral' {
  if (s === 'delivered') return 'success'
  if (['failed', 'exhausted'].includes(s)) return 'error'
  return 'warning'
}
function eventCategory(et: string): string {
  const p = et.split('.')[0]
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function copy(s: string) { navigator.clipboard?.writeText(s) }

const tiles = computed(() => [
  { label: 'Active endpoints', value: String(stats.value?.active_endpoints ?? 0), icon: RadioTowerIcon },
  { label: 'Successful deliveries', value: String(stats.value?.successful_deliveries ?? 0), icon: CheckCircle2Icon },
  { label: 'Failed deliveries', value: String(stats.value?.failed_deliveries ?? 0), icon: AlertCircleIcon },
  { label: 'Pending retries', value: String(stats.value?.pending_retries ?? 0), icon: RotateCwIcon },
  { label: 'Success rate', value: `${(stats.value?.success_rate ?? 0).toFixed(2)}%`, icon: GaugeIcon },
])
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Webhooks">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Developers</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Webhooks</h1>
          <p class="text-sm text-text-muted mt-0.5">Manage webhook endpoints, deliveries and supported event types.</p>
        </div>
        <div class="flex items-center gap-2">
          <select disabled class="h-9 rounded-lg border border-border bg-surface-2 px-3 text-xs font-semibold text-text-secondary">
            <option>LIVE</option>
          </select>
          <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
            <template #icon><RefreshCwIcon class="w-4 h-4" /></template>Refresh
          </AppButton>
          <AppButton size="sm" @click="openForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Create endpoint
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <AppCard v-for="t in tiles" :key="t.label" padding="sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{{ t.label }}</p>
              <p class="text-lg font-bold text-text-primary">{{ t.value }}</p>
            </div>
            <component :is="t.icon" class="w-4 h-4 text-primary/60 shrink-0" />
          </div>
        </AppCard>
      </div>

      <div class="flex gap-1 border-b border-border">
        <button
          v-for="t in (['endpoints','deliveries','event-types'] as const)" :key="t"
          class="px-3 py-2 text-sm font-semibold -mb-px border-b-2"
          :class="tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
          @click="selectTab(t)"
        >{{ t === 'event-types' ? 'Endpoint Event Types' : t.charAt(0).toUpperCase() + t.slice(1) }}</button>
      </div>

      <!-- Endpoints -->
      <AppCard v-if="tab === 'endpoints'" padding="none">
        <p v-if="loading" class="text-sm text-text-muted px-5 py-8">Loading…</p>
        <div v-else-if="!endpoints.length" class="flex flex-col items-center text-center gap-2 py-12">
          <WebhookIcon class="w-8 h-8 text-text-muted/40" />
          <p class="text-sm font-bold text-text-primary">No webhook endpoints yet</p>
          <p class="text-sm text-text-muted">Create one to start receiving events.</p>
          <AppButton size="sm" class="mt-2" @click="openForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Create endpoint
          </AppButton>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2.5">Name</th>
                <th class="px-5 py-2.5">URL</th>
                <th class="px-5 py-2.5">Environment</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5">Health</th>
                <th class="px-5 py-2.5">Last success</th>
                <th class="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ep in endpoints" :key="ep.id" class="border-b border-border last:border-0">
                <td class="px-5 py-3">
                  <p class="font-medium text-text-primary">{{ ep.name || '—' }}</p>
                  <p v-if="ep.description" class="text-xs text-text-muted">{{ ep.description }}</p>
                </td>
                <td class="px-5 py-3 font-mono text-xs text-text-muted max-w-xs truncate">{{ ep.url }}</td>
                <td class="px-5 py-3 text-text-secondary">{{ ep.environment || 'LIVE' }}</td>
                <td class="px-5 py-3"><AppBadge :variant="ep.is_active ? 'success' : 'neutral'" size="sm">{{ ep.is_active ? 'Active' : 'Disabled' }}</AppBadge></td>
                <td class="px-5 py-3"><AppBadge :variant="health(ep).variant" size="sm">{{ health(ep).label }}</AppBadge></td>
                <td class="px-5 py-3 text-text-muted text-xs">{{ ep.last_success_at ? new Date(ep.last_success_at).toLocaleString() : '—' }}</td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <button class="text-xs font-semibold text-primary hover:underline mr-3 disabled:opacity-50" :disabled="testingId === ep.id" @click="sendTest(ep)">
                    {{ testingId === ep.id ? 'Testing…' : 'Send test' }}
                  </button>
                  <button class="text-xs font-semibold text-text-muted hover:text-primary mr-3" @click="startEdit(ep)">Edit</button>
                  <button class="text-xs font-semibold text-text-muted hover:text-primary mr-3" @click="toggleActive(ep)">{{ ep.is_active ? 'Disable' : 'Enable' }}</button>
                  <button class="text-error hover:opacity-70" @click="removeEndpoint(ep)"><TrashIcon class="w-4 h-4 inline" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Deliveries -->
      <template v-else-if="tab === 'deliveries'">
        <div class="flex justify-end">
          <select
            v-model="deliveryStatusFilter"
            class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
          >
            <option value="">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="exhausted">Exhausted</option>
          </select>
        </div>
        <AppCard padding="none">
          <p v-if="!filteredDeliveries.length" class="text-sm text-text-muted px-5 py-8">No webhook deliveries found.</p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                  <th class="px-5 py-2.5">Delivery</th>
                  <th class="px-5 py-2.5">Status</th>
                  <th class="px-5 py-2.5 text-right">Attempts</th>
                  <th class="px-5 py-2.5">HTTP</th>
                  <th class="px-5 py-2.5">Next attempt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredDeliveries" :key="d.id" class="border-b border-border last:border-0">
                  <td class="px-5 py-2.5">
                    <p class="font-mono text-xs text-text-primary">{{ d.event_type }}</p>
                    <p class="text-[11px] text-text-muted">{{ new Date(d.created_at).toLocaleString() }}</p>
                  </td>
                  <td class="px-5 py-2.5"><AppBadge :variant="deliveryVariant(d.status)" size="sm">{{ d.status }}</AppBadge></td>
                  <td class="px-5 py-2.5 text-right text-text-muted">{{ d.attempt_count }}</td>
                  <td class="px-5 py-2.5 text-text-muted">{{ d.last_response_code ?? '—' }}</td>
                  <td class="px-5 py-2.5 text-text-muted text-xs">{{ d.next_retry_at ? new Date(d.next_retry_at).toLocaleString() : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </template>

      <!-- Event types -->
      <AppCard v-else padding="none">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2.5">Event type</th>
                <th class="px-5 py-2.5">Category</th>
                <th class="px-5 py-2.5">Version</th>
                <th class="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="et in eventTypes" :key="et.event_type" class="border-b border-border last:border-0">
                <td class="px-5 py-3">
                  <p class="font-mono text-xs font-semibold text-text-primary">{{ et.event_type }}</p>
                  <p class="text-xs text-text-muted">{{ et.description }}</p>
                </td>
                <td class="px-5 py-3 text-text-secondary">{{ eventCategory(et.event_type) }}</td>
                <td class="px-5 py-3 text-text-muted">v1</td>
                <td class="px-5 py-3"><AppBadge variant="success" size="sm">Enabled</AppBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showForm" title="Create endpoint" size="md">
      <div class="flex flex-col gap-4">
        <AppInput v-model="formName" label="Name" placeholder="Production payment events" />
        <AppInput
          v-model="formUrl" label="Endpoint URL"
          placeholder="https://api.example.com/rigepay/webhooks"
          hint="Must be a public HTTPS URL. A test event is sent on save to confirm it's reachable."
          required
        />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Description</label>
          <textarea v-model="formDescription" rows="2" class="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex items-center gap-3">
          <select disabled class="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-text-secondary">
            <option>LIVE</option>
          </select>
          <p class="text-xs text-text-muted">Deliveries retry with exponential backoff for up to 24 hours.</p>
        </div>
        <div>
          <p class="text-[13px] font-medium text-text-secondary mb-2">Subscribed events</p>
          <div class="flex flex-col gap-1.5">
            <label v-for="et in eventTypes" :key="et.event_type" class="flex items-center gap-2 text-sm text-text-primary">
              <input v-model="formEvents" type="checkbox" :value="et.event_type" class="w-4 h-4 rounded" />
              <span class="font-mono text-xs">{{ et.event_type }}</span>
              <span class="text-xs text-text-muted">— {{ et.description }}</span>
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showForm = false">Cancel</AppButton>
          <AppButton :loading="creating" @click="createEndpoint">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Create
          </AppButton>
        </div>
      </template>
    </AppModal>

    <AppModal :model-value="!!revealedSecret" title="Signing secret" size="md" @update:model-value="revealedSecret = null">
      <div v-if="revealedSecret" class="flex flex-col gap-3">
        <p class="text-sm text-text-secondary">Store this signing secret now — it will not be shown again. Use it to verify the <code>X-RigePay-Signature</code> header on every delivery.</p>
        <div class="flex items-center gap-2 bg-surface-2 rounded-lg p-3">
          <code class="text-xs break-all flex-1">{{ revealedSecret.secret }}</code>
          <button class="text-text-muted hover:text-primary" @click="copy(revealedSecret.secret)"><CopyIcon class="w-4 h-4" /></button>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end"><AppButton @click="revealedSecret = null">Done</AppButton></div>
      </template>
    </AppModal>

    <AppModal :model-value="!!editing" title="Edit endpoint" size="sm" @update:model-value="editing = null">
      <div class="flex flex-col gap-4">
        <AppInput v-model="editName" label="Name" placeholder="Endpoint name" />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Description</label>
          <textarea v-model="editDescription" rows="2" class="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="editing = null">Cancel</AppButton>
          <AppButton @click="saveEdit">Save</AppButton>
        </div>
      </template>
    </AppModal>
  </DashboardLayout>
</template>
