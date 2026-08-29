<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchOrgCredentials, createOrgCredential, revokeOrgCredential, rotateOrgCredential,
  fetchOrgApiKeys, createOrgApiKey, revokeOrgApiKey, rotateOrgApiKey,
  fetchOrgBranches, API_CLIENT_SCOPES,
  type OrgCredential, type OrgApiKey, type ApiKeyAuthScheme, type BranchSummary,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  PlusIcon, KeyRoundIcon, SearchIcon, RefreshCwIcon, BanIcon, ChevronRightIcon,
  WebhookIcon, CheckCircle2Icon,
} from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'

const { showError } = useResponseModal()
const { confirmAction } = useConfirmModal()
const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const credentials = ref<OrgCredential[]>([])
const apiKeys = ref<OrgApiKey[]>([])
const branches = ref<BranchSummary[]>([])

const search = ref('')
const statusFilter = ref('')

async function load() {
  loading.value = true
  try {
    const [c, k, b] = await Promise.all([fetchOrgCredentials(), fetchOrgApiKeys(), fetchOrgBranches()])
    credentials.value = c
    apiKeys.value = k
    branches.value = b.branches
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filteredCredentials = computed(() => {
  const q = search.value.trim().toLowerCase()
  return credentials.value.filter((c) => {
    if (statusFilter.value && c.status !== statusFilter.value) return false
    if (!q) return true
    return (c.name || '').toLowerCase().includes(q) || c.client_id.toLowerCase().includes(q)
  })
})

// ── create API client ──
const showCreate = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const form = ref<{ name: string; description: string; branch_id: string; scopes: string[] }>({
  name: '', description: '', branch_id: '', scopes: ['collections:read'],
})
const revealedCred = ref<{ client_id: string; client_secret: string } | null>(null)

function openCreate() {
  form.value = { name: '', description: '', branch_id: '', scopes: ['collections:read'] }
  createError.value = null
  showCreate.value = true
}
function toggleScope(scope: string) {
  const i = form.value.scopes.indexOf(scope)
  if (i >= 0) form.value.scopes.splice(i, 1)
  else form.value.scopes.push(scope)
}

async function submitCreate() {
  createError.value = null
  if (!form.value.name.trim()) { createError.value = 'Name is required.'; return }
  if (form.value.scopes.length === 0) { createError.value = 'Select at least one scope.'; return }
  creating.value = true
  try {
    const result = await createOrgCredential({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      branch_ids: form.value.branch_id ? [form.value.branch_id] : undefined,
      scopes: form.value.scopes,
    })
    revealedCred.value = { client_id: result.client_id, client_secret: result.client_secret }
    showCreate.value = false
    await load()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
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
    showError(extractErrorMessage(err))
  } finally {
    rotatingCredId.value = null
  }
}
async function revokeCred(cred: OrgCredential) {
  const ok = await confirmAction({
    title: 'Revoke this API client?', message: `Any integration using ${cred.client_id} will stop working immediately.`,
    confirmLabel: 'Revoke', danger: true,
  })
  if (!ok) return
  try {
    await revokeOrgCredential(cred.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

const showIntegrationExample = ref(false)
const tokenSnippet = `curl --request POST \\
  "https://api.rigepay.co.ke/api/v1/oauth/token" \\
  --header "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "grant_type=client_credentials" \\
  --data-urlencode "client_id=YOUR_CLIENT_ID" \\
  --data-urlencode "client_secret=YOUR_CLIENT_SECRET" \\
  --data-urlencode "scope=collections:read payouts:write"`
const callSnippet = `curl --request GET \\
  "https://api.rigepay.co.ke/api/v1/collections" \\
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN"`

// ── API keys (kept) ──
const showKeyModal = ref(false)
const creatingKey = ref(false)
const keyError = ref<string | null>(null)
const revealedKey = ref<{ name: string; auth_scheme: ApiKeyAuthScheme; full_key?: string; key_id?: string; secret?: string } | null>(null)
const keyForm = ref<{ name: string; branch_id: string; scopes: string[]; auth_scheme: ApiKeyAuthScheme }>({
  name: '', branch_id: '', scopes: [], auth_scheme: 'bearer',
})
function openKeyModal() {
  keyForm.value = { name: '', branch_id: '', scopes: [], auth_scheme: 'bearer' }
  keyError.value = null
  showKeyModal.value = true
}
function toggleKeyScope(scope: string) {
  const i = keyForm.value.scopes.indexOf(scope)
  if (i >= 0) keyForm.value.scopes.splice(i, 1)
  else keyForm.value.scopes.push(scope)
}
async function createKey() {
  keyError.value = null
  if (!keyForm.value.name.trim() || keyForm.value.scopes.length === 0) {
    keyError.value = 'Name and at least one scope are required.'
    return
  }
  creatingKey.value = true
  try {
    const result = await createOrgApiKey({
      name: keyForm.value.name.trim(),
      branch_id: keyForm.value.branch_id || undefined,
      scopes: keyForm.value.scopes,
      auth_scheme: keyForm.value.auth_scheme,
    })
    revealedKey.value = { name: result.name, auth_scheme: result.auth_scheme, full_key: result.full_key, key_id: result.key_id, secret: result.secret }
    showKeyModal.value = false
    await load()
  } catch (err) {
    keyError.value = extractErrorMessage(err)
  } finally {
    creatingKey.value = false
  }
}
const rotatingKeyId = ref<string | null>(null)
async function rotateKey(key: OrgApiKey) {
  rotatingKeyId.value = key.id
  try {
    const result = await rotateOrgApiKey(key.id)
    revealedKey.value = { name: key.name, auth_scheme: result.auth_scheme, full_key: result.full_key, key_id: result.key_id, secret: result.secret }
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    rotatingKeyId.value = null
  }
}
async function revokeKey(key: OrgApiKey) {
  const ok = await confirmAction({ title: 'Revoke this API key?', message: `"${key.name}" will stop working immediately.`, confirmLabel: 'Revoke', danger: true })
  if (!ok) return
  try {
    await revokeOrgApiKey(key.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

const branchOptions = computed(() => [{ value: '', label: 'Org-wide' }, ...branches.value.map((b) => ({ value: b.id, label: b.name }))])
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="API Clients">
    <div class="flex flex-col gap-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Developers</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">API Clients</h1>
          <p class="text-sm text-text-muted mt-0.5 max-w-xl">
            Create confidential clients for server-to-server RigePay API access using the OAuth2 client-credentials grant.
          </p>
        </div>
        <AppButton size="md" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Create API Client
        </AppButton>
      </div>

      <div v-if="revealedCred" class="flex items-start gap-3 rounded-xl border border-success/30 bg-success-light px-4 py-4">
        <CheckCircle2Icon class="w-4 h-4 text-success-text shrink-0 mt-0.5" />
        <div class="flex flex-col gap-1.5 min-w-0 text-sm text-success-text">
          <p class="font-semibold">API client secret ready — shown once.</p>
          <div class="rounded-lg bg-white/50 px-3 py-2 flex flex-col gap-1">
            <p class="font-mono text-xs break-all"><span class="font-sans font-semibold">Client ID </span>{{ revealedCred.client_id }}</p>
            <p class="font-mono text-xs break-all"><span class="font-sans font-semibold">Secret </span>{{ revealedCred.client_secret }}</p>
          </div>
          <button class="text-xs font-semibold self-start underline" @click="revealedCred = null">Dismiss</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-56">
          <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input v-model="search" type="text" placeholder="Search clients" class="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <AppSelect
          v-model="statusFilter"
          class="w-40"
          :options="[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'revoked', label: 'Revoked' }]"
        />
        <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
          <template #icon><RefreshCwIcon class="w-4 h-4" /></template>Refresh
        </AppButton>
      </div>

      <AppCard padding="none">
        <div v-if="loading" class="px-5 py-10 text-center text-sm text-text-muted">Loading…</div>
        <div v-else-if="!filteredCredentials.length" class="px-5 py-14 text-center">
          <KeyRoundIcon class="w-9 h-9 mx-auto text-text-muted/40" />
          <p class="text-sm font-bold text-text-primary mt-3">No API clients yet</p>
          <p class="text-sm text-text-muted mt-1">Create a client to issue OAuth2 tokens for server integrations.</p>
          <AppButton size="sm" class="mt-4" @click="openCreate">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Create API Client
          </AppButton>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2.5">Name</th>
                <th class="px-5 py-2.5">Client ID</th>
                <th class="px-5 py-2.5">Scopes</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5">Created</th>
                <th class="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredCredentials" :key="c.id" class="border-b border-border last:border-0">
                <td class="px-5 py-3">
                  <p class="font-semibold text-text-primary">{{ c.name || '—' }}</p>
                  <p v-if="c.description" class="text-xs text-text-muted">{{ c.description }}</p>
                </td>
                <td class="px-5 py-3 font-mono text-xs text-text-secondary">{{ c.client_id }}</td>
                <td class="px-5 py-3 text-xs text-text-muted max-w-60">{{ c.scopes.join(', ') }}</td>
                <td class="px-5 py-3"><AppBadge :variant="c.status === 'active' ? 'success' : 'neutral'" size="sm">{{ c.status }}</AppBadge></td>
                <td class="px-5 py-3 text-text-muted text-xs whitespace-nowrap">{{ formatDate(c.created_at) }}</td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <template v-if="c.status === 'active'">
                    <button class="text-xs font-medium text-text-secondary hover:text-primary px-2 py-1" :disabled="rotatingCredId === c.id" @click="rotateCred(c)">
                      <RefreshCwIcon class="w-3.5 h-3.5 inline" :class="{ 'animate-spin': rotatingCredId === c.id }" /> Rotate
                    </button>
                    <button class="text-xs font-medium text-error-text hover:bg-error-light rounded px-2 py-1" @click="revokeCred(c)">
                      <BanIcon class="w-3.5 h-3.5 inline" /> Revoke
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard>
        <button type="button" class="flex items-center gap-1.5 text-sm font-bold text-text-primary" @click="showIntegrationExample = !showIntegrationExample">
          <ChevronRightIcon class="w-4 h-4 transition-transform" :class="{ 'rotate-90': showIntegrationExample }" />
          Integration example
        </button>
        <div v-if="showIntegrationExample" class="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          <pre class="text-[11px] bg-[#0d1117] text-[#c9d1d9] rounded-xl p-4 overflow-x-auto">{{ tokenSnippet }}</pre>
          <pre class="text-[11px] bg-[#0d1117] text-[#c9d1d9] rounded-xl p-4 overflow-x-auto">{{ callSnippet }}</pre>
        </div>
      </AppCard>

      <!-- API keys (RigePay-specific, kept) -->
      <AppCard padding="none">
        <div class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Also available</p>
            <h2 class="text-base font-bold text-text-primary">API keys</h2>
            <p class="text-xs text-text-muted mt-0.5">Long-lived bearer tokens or HMAC-signed keys — simpler than OAuth for single integrations.</p>
          </div>
          <AppButton size="sm" variant="secondary" @click="openKeyModal">
            <template #icon><PlusIcon class="w-4 h-4" /></template>New API key
          </AppButton>
        </div>

        <div v-if="revealedKey" class="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success-light px-4 py-4">
          <CheckCircle2Icon class="w-4 h-4 text-success-text shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1.5 min-w-0 text-sm text-success-text">
            <p class="font-semibold">API key "{{ revealedKey.name }}" — new secret ready.</p>
            <div v-if="revealedKey.auth_scheme === 'hmac'" class="rounded-lg bg-white/50 px-3 py-2 flex flex-col gap-1">
              <p class="font-mono text-xs break-all"><span class="font-sans font-semibold">Key ID </span>{{ revealedKey.key_id }}</p>
              <p class="font-mono text-xs break-all"><span class="font-sans font-semibold">Secret </span>{{ revealedKey.secret }}</p>
            </div>
            <p v-else class="rounded-lg bg-white/50 px-3 py-2 font-mono text-xs break-all">{{ revealedKey.full_key }}</p>
            <button class="text-xs font-semibold self-start underline" @click="revealedKey = null">Dismiss</button>
          </div>
        </div>

        <div v-if="!loading && !apiKeys.length" class="px-5 py-8 text-sm text-text-muted">No API keys yet.</div>
        <div v-else-if="apiKeys.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-y border-border">
                <th class="px-5 py-2.5">Name</th>
                <th class="px-5 py-2.5">Scheme</th>
                <th class="px-5 py-2.5">Scopes</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5">Created</th>
                <th class="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in apiKeys" :key="k.id" class="border-b border-border last:border-0">
                <td class="px-5 py-3 font-semibold text-text-primary">{{ k.name }}</td>
                <td class="px-5 py-3"><AppBadge :variant="k.auth_scheme === 'hmac' ? 'info' : 'neutral'" size="sm">{{ k.auth_scheme === 'hmac' ? 'HMAC' : 'Bearer' }}</AppBadge></td>
                <td class="px-5 py-3 text-xs text-text-muted max-w-60">{{ k.scopes.join(', ') }}</td>
                <td class="px-5 py-3"><AppBadge :variant="k.status === 'active' ? 'success' : 'neutral'" size="sm">{{ k.status }}</AppBadge></td>
                <td class="px-5 py-3 text-text-muted text-xs whitespace-nowrap">{{ formatDate(k.created_at) }}</td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <template v-if="k.status === 'active'">
                    <button class="text-xs font-medium text-text-secondary hover:text-primary px-2 py-1" :disabled="rotatingKeyId === k.id" @click="rotateKey(k)">
                      <RefreshCwIcon class="w-3.5 h-3.5 inline" :class="{ 'animate-spin': rotatingKeyId === k.id }" /> Rotate
                    </button>
                    <button class="text-xs font-medium text-error-text hover:bg-error-light rounded px-2 py-1" @click="revokeKey(k)">
                      <BanIcon class="w-3.5 h-3.5 inline" /> Revoke
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <RouterLink
        :to="{ name: 'org-webhooks', params: { orgId: props.orgId } }"
        class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 hover:border-border-strong transition-colors"
      >
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0"><WebhookIcon class="w-4.5 h-4.5" /></span>
          <div>
            <p class="text-sm font-semibold text-text-primary">Webhooks</p>
            <p class="text-xs text-text-muted">Manage endpoints, deliveries and event types</p>
          </div>
        </div>
        <ChevronRightIcon class="w-4 h-4 text-text-muted" />
      </RouterLink>
    </div>

    <AppModal v-model="showCreate" title="Create API Client" size="md">
      <div class="flex flex-col gap-4">
        <p class="text-xs text-text-muted">Secrets are shown once after creation.</p>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</div>
        <AppInput v-model="form.name" label="Name" placeholder="e.g. Production integration" required />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Description</label>
          <textarea v-model="form.description" rows="2" class="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <AppSelect v-model="form.branch_id" label="Branch scope" :options="branchOptions" />
        <div class="flex flex-col gap-2">
          <label class="text-[13px] font-medium text-text-secondary">Scopes <span class="text-error">*</span></label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="s in API_CLIENT_SCOPES" :key="s.value"
              class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors"
              :class="form.scopes.includes(s.value) ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/30'"
            >
              <input type="checkbox" :checked="form.scopes.includes(s.value)" class="rounded border-border" @change="toggleScope(s.value)" />
              {{ s.label }}
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="showCreate = false">Cancel</AppButton>
          <AppButton :loading="creating" @click="submitCreate">
            <template #icon><PlusIcon class="w-4 h-4" /></template>Create API Client
          </AppButton>
        </div>
      </template>
    </AppModal>

    <AppModal v-model="showKeyModal" title="New API key" size="md">
      <div class="flex flex-col gap-4">
        <div v-if="keyError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ keyError }}</div>
        <AppInput v-model="keyForm.name" label="Key name" placeholder="e.g. Backend integration" required />
        <AppSelect
          v-model="keyForm.auth_scheme"
          label="Authentication scheme"
          :options="[
            { value: 'bearer', label: 'Bearer token — send the key directly (simplest)' },
            { value: 'hmac', label: 'HMAC request signing — secret never sent' },
          ]"
        />
        <AppSelect v-model="keyForm.branch_id" label="Branch scope" :options="branchOptions" />
        <div class="flex flex-col gap-2">
          <label class="text-[13px] font-medium text-text-secondary">Scopes</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="s in API_CLIENT_SCOPES" :key="s.value"
              class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors"
              :class="keyForm.scopes.includes(s.value) ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/30'"
            >
              <input type="checkbox" :checked="keyForm.scopes.includes(s.value)" class="rounded border-border" @change="toggleKeyScope(s.value)" />
              {{ s.label }}
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="showKeyModal = false">Cancel</AppButton>
          <AppButton :loading="creatingKey" @click="createKey">Create key</AppButton>
        </div>
      </template>
    </AppModal>
  </DashboardLayout>
</template>
