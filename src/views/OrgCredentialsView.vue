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
import { PlusIcon } from 'lucide-vue-next'
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
    revealedCred.value = { client_id: cred.client_id, client_secret: result.client_secret }
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
    revealedWebhookSecret.value = { url: result.url, secret: result.secret }
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
    <div class="flex flex-col gap-6">
      <p class="text-xs text-text-muted -mt-2">
        These credentials are for machine-to-machine integration (your own systems calling the RigePay API directly) —
        not for logging into this dashboard.
      </p>

      <!-- API keys -->
      <div v-if="revealedKey" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">API key "{{ revealedKey.name }}" — new secret ready.</p>
        <template v-if="revealedKey.auth_scheme === 'hmac'">
          <p>Key ID: <span class="font-mono font-bold break-all">{{ revealedKey.key_id }}</span></p>
          <p>Secret: <span class="font-mono font-bold break-all">{{ revealedKey.secret }}</span></p>
          <p class="text-xs">Copy the secret now — it will not be shown again. Use it to sign requests (see docs for the X-RigePay-Key-Id / Timestamp / Request-Id / Signature headers) — never send it directly.</p>
        </template>
        <template v-else>
          <p>Key: <span class="font-mono font-bold break-all">{{ revealedKey.full_key }}</span></p>
          <p class="text-xs">Copy this now — it will not be shown again.</p>
        </template>
      </div>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">API keys</h2>
          <AppButton size="sm" @click="showKeyForm = !showKeyForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New API key
          </AppButton>
        </div>

        <AppCard v-if="showKeyForm" class="mb-4">
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
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Scopes</label>
              <label v-for="s in availableScopes" :key="s" class="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" :checked="newKeyScopes.includes(s)" class="w-4 h-4 rounded border-input-border" @change="toggleKeyScope(s)" />
                {{ s }}
              </label>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingKey">Create key</AppButton>
              <AppButton type="button" variant="ghost" @click="showKeyForm = false">Cancel</AppButton>
            </div>
          </form>
        </AppCard>

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
        <div v-if="apiKeys.length" class="flex flex-col gap-1.5 mt-3">
          <div v-for="k in apiKeys.filter((k) => k.status === 'active')" :key="k.id" class="flex items-center gap-3">
            <button
              type="button"
              class="text-xs text-text-secondary hover:underline"
              :disabled="rotatingKeyId === k.id"
              @click="rotateKey(k)"
            >
              {{ rotatingKeyId === k.id ? 'Rotating…' : `Rotate "${k.name}"` }}
            </button>
            <button
              type="button"
              class="text-xs text-error-text hover:underline"
              @click="revokeKey(k.id)"
            >
              Revoke "{{ k.name }}"
            </button>
          </div>
        </div>
      </AppCard>

      <!-- OAuth credentials -->
      <div v-if="revealedCred" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">Credential — new secret ready.</p>
        <p>Client ID: <span class="font-mono font-bold">{{ revealedCred.client_id }}</span></p>
        <p>Client secret: <span class="font-mono font-bold break-all">{{ revealedCred.client_secret }}</span></p>
        <p class="text-xs">Copy the secret now — it will not be shown again.</p>
      </div>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">OAuth credentials</h2>
          <AppButton size="sm" @click="showCredForm = !showCredForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New credential
          </AppButton>
        </div>

        <AppCard v-if="showCredForm" class="mb-4">
          <div v-if="credError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ credError }}</div>
          <form class="flex flex-col gap-4" @submit.prevent="createCred">
            <AppSelect
              v-model="newCredBranchId"
              label="Branch (optional — leave unset for org-wide)"
              :options="[{ value: '', label: 'Org-wide' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]"
            />
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Scopes</label>
              <label v-for="s in availableScopes" :key="s" class="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" :checked="newCredScopes.includes(s)" class="w-4 h-4 rounded border-input-border" @change="toggleCredScope(s)" />
                {{ s }}
              </label>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingCred">Create credential</AppButton>
              <AppButton type="button" variant="ghost" @click="showCredForm = false">Cancel</AppButton>
            </div>
          </form>
        </AppCard>

        <AppTable :columns="credColumns" :rows="credentials" :loading="loading" empty-message="No OAuth credentials yet.">
          <template #cell-scopes="{ value }">
            <span class="text-xs">{{ (value as string[]).join(', ') }}</span>
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="value === 'active' ? 'success' : 'neutral'" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
        </AppTable>
        <div v-if="credentials.length" class="flex flex-col gap-1.5 mt-3">
          <div v-for="c in credentials.filter((c) => c.status === 'active')" :key="c.id" class="flex items-center gap-3">
            <button
              type="button"
              class="text-xs text-text-secondary hover:underline"
              :disabled="rotatingCredId === c.id"
              @click="rotateCred(c)"
            >
              {{ rotatingCredId === c.id ? 'Rotating…' : `Rotate ${c.client_id}` }}
            </button>
            <button
              type="button"
              class="text-xs text-error-text hover:underline"
              @click="revokeCred(c.id)"
            >
              Revoke {{ c.client_id }}
            </button>
          </div>
        </div>
      </AppCard>

      <!-- Webhook endpoints -->
      <div v-if="revealedWebhookSecret" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">Webhook endpoint created for {{ revealedWebhookSecret.url }}.</p>
        <p>Signing secret: <span class="font-mono font-bold break-all">{{ revealedWebhookSecret.secret }}</span></p>
        <p class="text-xs">Copy this now — it will not be shown again. Use it to verify the X-RigePay-Signature header on every delivery.</p>
      </div>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-text-primary">Webhook endpoints</h2>
          <AppButton size="sm" @click="showWebhookForm = !showWebhookForm">
            <template #icon><PlusIcon class="w-4 h-4" /></template>
            New endpoint
          </AppButton>
        </div>
        <p class="text-xs text-text-muted -mt-2 mb-4">
          RigePay POSTs an event to your URL whenever something you've subscribed to happens (a collection settles, a payout completes, a transfer finishes). Every delivery is HMAC-signed and retried on failure.
        </p>

        <AppCard v-if="showWebhookForm" class="mb-4">
          <div v-if="webhookError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ webhookError }}</div>
          <form class="flex flex-col gap-4" @submit.prevent="createWebhook">
            <AppInput v-model="newWebhookUrl" label="Endpoint URL" placeholder="https://your-system.example.com/webhooks/rigepay" required />
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Event types</label>
              <label v-for="e in WEBHOOK_EVENT_TYPES" :key="e" class="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" :checked="newWebhookEvents.includes(e)" class="w-4 h-4 rounded border-input-border" @change="toggleWebhookEvent(e)" />
                {{ e }}
              </label>
            </div>
            <div class="flex gap-2">
              <AppButton type="submit" :loading="creatingWebhook">Create endpoint</AppButton>
              <AppButton type="button" variant="ghost" @click="showWebhookForm = false">Cancel</AppButton>
            </div>
          </form>
        </AppCard>

        <div v-if="!webhookEndpoints.length && !loading" class="text-sm text-text-muted py-4 text-center">No webhook endpoints yet.</div>
        <div v-for="ep in webhookEndpoints" :key="ep.id" class="border border-border rounded-xl p-4 mb-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-text-primary font-mono">{{ ep.url }}</p>
              <p class="text-xs text-text-muted mt-1">{{ ep.event_types.join(', ') }} · {{ formatDate(ep.created_at) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <AppBadge :variant="ep.is_active ? 'success' : 'neutral'" size="sm">{{ ep.is_active ? 'active' : 'inactive' }}</AppBadge>
              <button type="button" class="text-xs text-text-secondary hover:underline" @click="toggleDeliveries(ep.id)">
                {{ expandedWebhookId === ep.id ? 'Hide' : 'View' }} deliveries
              </button>
              <button type="button" class="text-xs text-error-text hover:underline" @click="deleteWebhook(ep.id)">Delete</button>
            </div>
          </div>
          <div v-if="expandedWebhookId === ep.id" class="mt-3 pt-3 border-t border-border">
            <div v-if="!webhookDeliveries[ep.id]?.length" class="text-xs text-text-muted">No deliveries yet.</div>
            <div v-for="d in webhookDeliveries[ep.id]" :key="d.id" class="flex items-center justify-between text-xs py-1.5">
              <span class="font-mono">{{ d.event_type }}</span>
              <span class="text-text-muted">attempt {{ d.attempt_count }}{{ d.last_response_code ? ` · HTTP ${d.last_response_code}` : '' }}</span>
              <AppBadge
                :variant="d.status === 'delivered' ? 'success' : d.status === 'exhausted' ? 'error' : 'neutral'"
                size="sm"
              >{{ d.status }}</AppBadge>
              <span class="text-text-muted">{{ formatDate(d.created_at) }}</span>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
