<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgCredentials, createOrgCredential, revokeOrgCredential,
  fetchOrgApiKeys, createOrgApiKey, revokeOrgApiKey,
  fetchOrgBranches,
  fetchOrgWebhookEndpoints, createOrgWebhookEndpoint, deleteOrgWebhookEndpoint, fetchOrgWebhookDeliveries,
  rotateOrgCredential, rotateOrgApiKey,
  WEBHOOK_EVENT_TYPES,
  type OrgCredential, type OrgApiKey, type ApiKeyAuthScheme, type BranchSummary, type OrgWebhookEndpoint, type OrgWebhookDelivery,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  PlusIcon, ShieldCheckIcon, KeyRoundIcon, FingerprintIcon, WebhookIcon,
  CheckCircle2Icon, RefreshCwIcon, BanIcon, Trash2Icon, EyeIcon, EyeOffIcon,
} from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const credentials = ref<OrgCredential[]>([])
const apiKeys = ref<OrgApiKey[]>([])
const branches = ref<BranchSummary[]>([])
const webhookEndpoints = ref<OrgWebhookEndpoint[]>([])

const availableScopes = [
  'payouts:write',
  'payouts:read',
  'collections:write',
  'collections:read',
  'balance:read',
  'transactions:read',
  'transfers:write',
  'transfers:read',
  'checkout:write',
  'checkout:read',
  'utils:read',
  'screening:read',
]

async function load() {
  loading.value = true
  error.value = null
  try {
    const [c, k, b, w] = await Promise.all([fetchOrgCredentials(), fetchOrgApiKeys(), fetchOrgBranches(), fetchOrgWebhookEndpoints()])
    credentials.value = c
    apiKeys.value = k
    branches.value = b.branches
    webhookEndpoints.value = w
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showKeyForm = ref(false)
const creatingKey = ref(false)
const keyError = ref<string | null>(null)
const revealedKey = ref<{ name: string; auth_scheme: ApiKeyAuthScheme; full_key?: string; key_id?: string; secret?: string } | null>(null)
const newKeyName = ref('')
const newKeyBranchId = ref('')
const newKeyScopes = ref<string[]>([])
const newKeyAuthScheme = ref<ApiKeyAuthScheme>('bearer')

async function createKey() {
  keyError.value = null
  if (!newKeyName.value.trim() || newKeyScopes.value.length === 0) {
    keyError.value = 'Name and at least one scope are required.'
    return
  }
  creatingKey.value = true
  try {
    const result = await createOrgApiKey({
      name: newKeyName.value.trim(),
      branch_id: newKeyBranchId.value || undefined,
      scopes: newKeyScopes.value,
      auth_scheme: newKeyAuthScheme.value,
    })
    revealedKey.value = {
      name: result.name,
      auth_scheme: result.auth_scheme,
      full_key: result.full_key,
      key_id: result.key_id,
      secret: result.secret,
    }
    newKeyName.value = ''
    newKeyBranchId.value = ''
    newKeyScopes.value = []
    newKeyAuthScheme.value = 'bearer'
    showKeyForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    keyError.value = msg
    showError(msg)
  } finally {
    creatingKey.value = false
  }
}

async function revokeKey(id: string) {
  try {
    await revokeOrgApiKey(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const rotatingKeyId = ref<string | null>(null)

async function rotateKey(key: OrgApiKey) {
  rotatingKeyId.value = key.id
  try {
    const result = await rotateOrgApiKey(key.id)
    revealedKey.value = {
      name: key.name,
      auth_scheme: result.auth_scheme,
      full_key: result.full_key,
      key_id: result.key_id,
      secret: result.secret,
    }
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    rotatingKeyId.value = null
  }
}

const showCredForm = ref(false)
const creatingCred = ref(false)
const credError = ref<string | null>(null)
const revealedCred = ref<{ client_id: string; client_secret: string } | null>(null)
const newCredBranchId = ref('')
const newCredScopes = ref<string[]>([])

async function createCred() {
  credError.value = null
  if (newCredScopes.value.length === 0) {
    credError.value = 'At least one scope is required.'
    return
  }
  creatingCred.value = true
  try {
    const result = await createOrgCredential({
      branch_ids: newCredBranchId.value ? [newCredBranchId.value] : undefined,
      scopes: newCredScopes.value,
    })
    revealedCred.value = { client_id: result.client_id, client_secret: result.client_secret }
    newCredBranchId.value = ''
    newCredScopes.value = []
    showCredForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    credError.value = msg
    showError(msg)
  } finally {
    creatingCred.value = false
  }
}

async function revokeCred(id: string) {
  try {
    await revokeOrgCredential(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const rotatingCredId = ref<string | null>(null)

async function rotateCred(cred: OrgCredential) {
  rotatingCredId.value = cred.id
  try {
    const result = await rotateOrgCredential(cred.id)
    revealedCred.value = {
      client_id: cred.client_id,
      client_secret: result.client_secret
    }
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    rotatingCredId.value = null
  }
}

const showWebhookForm = ref(false)
const creatingWebhook = ref(false)
const webhookError = ref<string | null>(null)
const revealedWebhookSecret = ref<{ url: string; secret: string } | null>(null)
const newWebhookUrl = ref('')
const newWebhookEvents = ref<string[]>([])
const webhookDeliveries = ref<Record<string, OrgWebhookDelivery[]>>({})
const expandedWebhookId = ref<string | null>(null)

async function createWebhook() {
  webhookError.value = null
  if (!newWebhookUrl.value.trim() || newWebhookEvents.value.length === 0) {
    webhookError.value = 'URL and at least one event type are required.'
    return
  }
  creatingWebhook.value = true
  try {
    const result = await createOrgWebhookEndpoint({
      url: newWebhookUrl.value.trim(),
      event_types: newWebhookEvents.value,
    })
    revealedWebhookSecret.value = {
      url: result.url,
      secret: result.secret
    }
    newWebhookUrl.value = ''
    newWebhookEvents.value = []
    showWebhookForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    webhookError.value = msg
    showError(msg)
  } finally {
    creatingWebhook.value = false
  }
}

async function deleteWebhook(id: string) {
  try {
    await deleteOrgWebhookEndpoint(id)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

function toggleWebhookEvent(eventType: string) {
  const i = newWebhookEvents.value.indexOf(eventType)
  if (i >= 0) newWebhookEvents.value.splice(i, 1)
  else newWebhookEvents.value.push(eventType)
}

async function toggleDeliveries(endpointId: string) {
  if (expandedWebhookId.value === endpointId) {
    expandedWebhookId.value = null
    return
  }
  expandedWebhookId.value = endpointId
  if (!webhookDeliveries.value[endpointId]) {
    try {
      webhookDeliveries.value[endpointId] = await fetchOrgWebhookDeliveries(endpointId)
    } catch (err) {
      const msg = extractErrorMessage(err)
      error.value = msg
      showError(msg)
    }
  }
}

function toggleKeyScope(scope: string) {
  const i = newKeyScopes.value.indexOf(scope)
  if (i >= 0) newKeyScopes.value.splice(i, 1)
  else newKeyScopes.value.push(scope)
}

function toggleCredScope(scope: string) {
  const i = newCredScopes.value.indexOf(scope)
  if (i >= 0) newCredScopes.value.splice(i, 1)
  else newCredScopes.value.push(scope)
}

const apiKeyColumns = [
  { key: 'name', label: 'Name' },
  { key: 'auth_scheme', label: 'Scheme' },
  { key: 'display', label: 'Key' },
  { key: 'scopes', label: 'Scopes' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]

const credColumns = [
  { key: 'client_id', label: 'Client ID' },
  { key: 'scopes', label: 'Scopes' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="API credentials">
    <div class="flex flex-col gap-8">

      <!-- Page intro -->
      <div class="flex items-start gap-3 rounded-2xl bg-info/5 border border-info/20 px-4 py-3.5">
        <ShieldCheckIcon class="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p class="text-xs text-text-secondary leading-relaxed">
          These credentials are for <span class="font-semibold text-text-primary">machine-to-machine integration</span>
          — your own systems calling the RigePay API directly — not for logging into this dashboard.
        </p>
      </div>

      <!-- API keys -->
      <AppCard>
        <div class="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-border">
          <div>
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1">
              <KeyRoundIcon class="w-3.5 h-3.5 text-primary" />Authentication
            </span>
            <h2 class="text-base font-bold text-text-primary">API keys</h2>
            <p class="text-xs text-text-muted mt-0.5">Bearer tokens or HMAC-signed keys for direct API access.</p>
          </div>
          <AppButton size="sm" @click="showKeyForm = !showKeyForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New API key
          </AppButton>
        </div>

        <div v-if="revealedKey" class="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-light px-4 py-4 mb-4">
          <CheckCircle2Icon class="w-4 h-4 text-success-text shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1.5 min-w-0 text-sm text-success-text">
            <p class="font-semibold">API key "{{ revealedKey.name }}" — new secret ready.</p>
            <template v-if="revealedKey.auth_scheme === 'hmac'">
              <div class="rounded-lg bg-white/50 px-3 py-2 flex flex-col gap-1">
                <p class="font-mono text-xs break-all"><span class="font-sans font-semibold not-italic">Key ID </span>{{ revealedKey.key_id }}</p>
                <p class="font-mono text-xs break-all"><span class="font-sans font-semibold not-italic">Secret </span>{{ revealedKey.secret }}</p>
              </div>
              <p class="text-xs">Copy the secret now — it will not be shown again. Use it to sign requests (see docs for the X-RigePay-Key-Id / Timestamp / Request-Id / Signature headers) — never send it directly.</p>
            </template>
            <template v-else>
              <p class="rounded-lg bg-white/50 px-3 py-2 font-mono text-xs break-all">{{ revealedKey.full_key }}</p>
              <p class="text-xs">Copy this now — it will not be shown again.</p>
            </template>
          </div>
        </div>

        <div v-if="showKeyForm" class="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-5 mb-4">
          <div v-if="keyError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ keyError }}</div>
          <form class="flex flex-col gap-4" @submit.prevent="createKey">
            <AppInput v-model="newKeyName" label="Key name" placeholder="e.g. Backend integration" required />
            <AppSelect
              v-model="newKeyAuthScheme"
              label="Authentication scheme"
              :options="[
                { value: 'bearer', label: 'Bearer token — send the key directly (simplest)' },
                { value: 'hmac', label: 'HMAC request signing — sign each request, secret never sent' },
              ]"
            />
            <AppSelect
              v-model="newKeyBranchId"
              label="Branch (optional — leave unset for org-wide)"
              :options="[{ value: '', label: 'Org-wide' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]"
            />
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Scopes</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="s in availableScopes" :key="s"
                  class="cursor-pointer select-none text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                  :class="newKeyScopes.includes(s) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/30'"
                >
                  <input type="checkbox" :checked="newKeyScopes.includes(s)" class="sr-only" @change="toggleKeyScope(s)" />
                  {{ s }}
                </label>
              </div>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingKey">Create key</AppButton>
              <AppButton type="button" variant="ghost" @click="showKeyForm = false">Cancel</AppButton>
            </div>
          </form>
        </div>

        <AppTable :columns="apiKeyColumns" :rows="apiKeys" :loading="loading" empty-message="No API keys yet.">
          <template #cell-auth_scheme="{ value }">
            <AppBadge :variant="value === 'hmac' ? 'info' : 'neutral'" size="sm">{{ value === 'hmac' ? 'HMAC' : 'Bearer' }}</AppBadge>
          </template>
          <template #cell-scopes="{ value }">
            <span class="text-xs">{{ (value as string[]).join(', ') }}</span>
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="value === 'active' ? 'success' : 'neutral'" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
        </AppTable>

        <div v-if="apiKeys.some((k) => k.status === 'active')" class="flex flex-col divide-y divide-border mt-4 pt-1">
          <div v-for="k in apiKeys.filter((k) => k.status === 'active')" :key="k.id" class="flex items-center justify-between py-2.5">
            <span class="text-sm font-medium text-text-primary truncate">{{ k.name }}</span>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                :disabled="rotatingKeyId === k.id"
                @click="rotateKey(k)"
              >
                <RefreshCwIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': rotatingKeyId === k.id }" />
                {{ rotatingKeyId === k.id ? 'Rotating…' : 'Rotate' }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-error-text hover:bg-error-light rounded-lg px-2.5 py-1.5 transition-colors"
                @click="revokeKey(k.id)"
              >
                <BanIcon class="w-3.5 h-3.5" />Revoke
              </button>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- OAuth credentials -->
      <AppCard>
        <div class="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-border">
          <div>
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1">
              <FingerprintIcon class="w-3.5 h-3.5 text-primary" />Authentication
            </span>
            <h2 class="text-base font-bold text-text-primary">OAuth credentials</h2>
            <p class="text-xs text-text-muted mt-0.5">Client ID / secret pairs for OAuth 2.0 client-credentials flows.</p>
          </div>
          <AppButton size="sm" @click="showCredForm = !showCredForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New credential
          </AppButton>
        </div>

        <div v-if="revealedCred" class="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-light px-4 py-4 mb-4">
          <CheckCircle2Icon class="w-4 h-4 text-success-text shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1.5 min-w-0 text-sm text-success-text">
            <p class="font-semibold">Credential — new secret ready.</p>
            <div class="rounded-lg bg-white/50 px-3 py-2 flex flex-col gap-1">
              <p class="font-mono text-xs break-all"><span class="font-sans font-semibold not-italic">Client ID </span>{{ revealedCred.client_id }}</p>
              <p class="font-mono text-xs break-all"><span class="font-sans font-semibold not-italic">Secret </span>{{ revealedCred.client_secret }}</p>
            </div>
            <p class="text-xs">Copy the secret now — it will not be shown again.</p>
          </div>
        </div>

        <div v-if="showCredForm" class="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-5 mb-4">
          <div v-if="credError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ credError }}</div>
          <form class="flex flex-col gap-4" @submit.prevent="createCred">
            <AppSelect
              v-model="newCredBranchId"
              label="Branch (optional — leave unset for org-wide)"
              :options="[{ value: '', label: 'Org-wide' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]"
            />
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Scopes</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="s in availableScopes" :key="s"
                  class="cursor-pointer select-none text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                  :class="newCredScopes.includes(s) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/30'"
                >
                  <input type="checkbox" :checked="newCredScopes.includes(s)" class="sr-only" @change="toggleCredScope(s)" />
                  {{ s }}
                </label>
              </div>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingCred">Create credential</AppButton>
              <AppButton type="button" variant="ghost" @click="showCredForm = false">Cancel</AppButton>
            </div>
          </form>
        </div>

        <AppTable :columns="credColumns" :rows="credentials" :loading="loading" empty-message="No OAuth credentials yet.">
          <template #cell-client_id="{ value }">
            <span class="font-mono text-xs text-text-primary">{{ value }}</span>
          </template>
          <template #cell-scopes="{ value }">
            <span class="text-xs">{{ (value as string[]).join(', ') }}</span>
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="value === 'active' ? 'success' : 'neutral'" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
        </AppTable>

        <div v-if="credentials.some((c) => c.status === 'active')" class="flex flex-col divide-y divide-border mt-4 pt-1">
          <div v-for="c in credentials.filter((c) => c.status === 'active')" :key="c.id" class="flex items-center justify-between py-2.5 gap-3">
            <span class="text-sm font-mono text-text-primary truncate">{{ c.client_id }}</span>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                :disabled="rotatingCredId === c.id"
                @click="rotateCred(c)"
              >
                <RefreshCwIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': rotatingCredId === c.id }" />
                {{ rotatingCredId === c.id ? 'Rotating…' : 'Rotate' }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-error-text hover:bg-error-light rounded-lg px-2.5 py-1.5 transition-colors"
                @click="revokeCred(c.id)"
              >
                <BanIcon class="w-3.5 h-3.5" />Revoke
              </button>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Webhook endpoints -->
      <AppCard>
        <div class="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-border">
          <div>
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1">
              <WebhookIcon class="w-3.5 h-3.5 text-primary" />Events
            </span>
            <h2 class="text-base font-bold text-text-primary">Webhook endpoints</h2>
            <p class="text-xs text-text-muted mt-0.5">
              RigePay POSTs an event to your URL when something you've subscribed to happens — a collection settles, a payout completes, a transfer finishes. Every delivery is HMAC-signed and retried on failure.
            </p>
          </div>
          <AppButton size="sm" @click="showWebhookForm = !showWebhookForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New endpoint
          </AppButton>
        </div>

        <div v-if="revealedWebhookSecret" class="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-light px-4 py-4 mb-4">
          <CheckCircle2Icon class="w-4 h-4 text-success-text shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1.5 min-w-0 text-sm text-success-text">
            <p class="font-semibold">Webhook endpoint created for {{ revealedWebhookSecret.url }}.</p>
            <p class="rounded-lg bg-white/50 px-3 py-2 font-mono text-xs break-all">{{ revealedWebhookSecret.secret }}</p>
            <p class="text-xs">Copy this now — it will not be shown again. Use it to verify the X-RigePay-Signature header on every delivery.</p>
          </div>
        </div>

        <div v-if="showWebhookForm" class="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-5 mb-4">
          <div v-if="webhookError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ webhookError }}</div>
          <form class="flex flex-col gap-4" @submit.prevent="createWebhook">
            <AppInput v-model="newWebhookUrl" label="Endpoint URL" placeholder="https://your-system.example.com/webhooks/rigepay" required />
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Event types</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="e in WEBHOOK_EVENT_TYPES" :key="e"
                  class="cursor-pointer select-none text-xs font-mono font-medium px-3 py-1.5 rounded-full border transition-colors"
                  :class="newWebhookEvents.includes(e) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/30'"
                >
                  <input type="checkbox" :checked="newWebhookEvents.includes(e)" class="sr-only" @change="toggleWebhookEvent(e)" />
                  {{ e }}
                </label>
              </div>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingWebhook">Create endpoint</AppButton>
              <AppButton type="button" variant="ghost" @click="showWebhookForm = false">Cancel</AppButton>
            </div>
          </form>
        </div>

        <div v-if="!webhookEndpoints.length && !loading" class="text-sm text-text-muted py-8 text-center">No webhook endpoints yet.</div>

        <div class="flex flex-col gap-3">
          <div v-for="ep in webhookEndpoints" :key="ep.id" class="rounded-2xl border border-border overflow-hidden">
            <div class="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3 min-w-0">
                <span class="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                  <WebhookIcon class="w-4 h-4 text-primary" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary font-mono truncate">{{ ep.url }}</p>
                  <p class="text-xs text-text-muted mt-0.5">{{ ep.event_types.join(', ') }} · {{ formatDate(ep.created_at) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <AppBadge :variant="ep.is_active ? 'success' : 'neutral'" size="sm">{{ ep.is_active ? 'active' : 'inactive' }}</AppBadge>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg px-2.5 py-1.5 transition-colors"
                  @click="toggleDeliveries(ep.id)"
                >
                  <component :is="expandedWebhookId === ep.id ? EyeOffIcon : EyeIcon" class="w-3.5 h-3.5" />
                  {{ expandedWebhookId === ep.id ? 'Hide' : 'View' }} deliveries
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-error-text hover:bg-error-light rounded-lg px-2.5 py-1.5 transition-colors"
                  @click="deleteWebhook(ep.id)"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />Delete
                </button>
              </div>
            </div>
            <div v-if="expandedWebhookId === ep.id" class="border-t border-border bg-surface/60 px-4 py-3">
              <div v-if="!webhookDeliveries[ep.id]?.length" class="text-xs text-text-muted py-2">No deliveries yet.</div>
              <div v-else class="flex flex-col divide-y divide-border">
                <div v-for="d in webhookDeliveries[ep.id]" :key="d.id" class="flex items-center justify-between gap-3 text-xs py-2">
                  <span class="font-mono text-text-primary truncate">{{ d.event_type }}</span>
                  <span class="text-text-muted whitespace-nowrap">attempt {{ d.attempt_count }}{{ d.last_response_code ? ` · HTTP ${d.last_response_code}` : '' }}</span>
                  <AppBadge
                    :variant="d.status === 'delivered' ? 'success' : d.status === 'exhausted' ? 'error' : 'neutral'"
                    size="sm"
                  >{{ d.status }}</AppBadge>
                  <span class="text-text-muted whitespace-nowrap">{{ formatDate(d.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>