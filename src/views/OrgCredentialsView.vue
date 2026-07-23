<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgCredentials, createOrgCredential, revokeOrgCredential,
  fetchOrgApiKeys, createOrgApiKey, revokeOrgApiKey,
  fetchOrgBranches,
  type OrgCredential, type OrgApiKey, type BranchSummary,
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

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const credentials = ref<OrgCredential[]>([])
const apiKeys = ref<OrgApiKey[]>([])
const branches = ref<BranchSummary[]>([])

const availableScopes = ['payouts:write', 'collections:write']

async function load() {
  loading.value = true
  error.value = null
  try {
    const [c, k, b] = await Promise.all([fetchOrgCredentials(), fetchOrgApiKeys(), fetchOrgBranches()])
    credentials.value = c
    apiKeys.value = k
    branches.value = b.branches
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showKeyForm = ref(false)
const creatingKey = ref(false)
const keyError = ref<string | null>(null)
const revealedKey = ref<{ name: string; full_key: string } | null>(null)
const newKeyName = ref('')
const newKeyBranchId = ref('')
const newKeyScopes = ref<string[]>([])

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
    })
    revealedKey.value = { name: result.name, full_key: result.full_key }
    newKeyName.value = ''
    newKeyBranchId.value = ''
    newKeyScopes.value = []
    showKeyForm.value = false
    await load()
  } catch (err) {
    keyError.value = extractErrorMessage(err)
  } finally {
    creatingKey.value = false
  }
}

async function revokeKey(id: string) {
  try {
    await revokeOrgApiKey(id)
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
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
    credError.value = extractErrorMessage(err)
  } finally {
    creatingCred.value = false
  }
}

async function revokeCred(id: string) {
  try {
    await revokeOrgCredential(id)
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
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
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>
      <p class="text-xs text-text-muted -mt-2">
        These credentials are for machine-to-machine integration (your own systems calling the RigePay API directly) —
        not for logging into this dashboard.
      </p>

      <!-- API keys -->
      <div v-if="revealedKey" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">API key "{{ revealedKey.name }}" created.</p>
        <p>Key: <span class="font-mono font-bold break-all">{{ revealedKey.full_key }}</span></p>
        <p class="text-xs">Copy this now — it will not be shown again.</p>
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
          <template #cell-scopes="{ value }">
            <span class="text-xs">{{ (value as string[]).join(', ') }}</span>
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="value === 'active' ? 'success' : 'neutral'" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
        </AppTable>
        <div v-if="apiKeys.length" class="flex flex-col gap-1 mt-3">
          <button
            v-for="k in apiKeys.filter((k) => k.status === 'active')"
            :key="k.id"
            type="button"
            class="text-xs text-error-text hover:underline text-left"
            @click="revokeKey(k.id)"
          >
            Revoke "{{ k.name }}"
          </button>
        </div>
      </AppCard>

      <!-- OAuth credentials -->
      <div v-if="revealedCred" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">Credential created.</p>
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
        <div v-if="credentials.length" class="flex flex-col gap-1 mt-3">
          <button
            v-for="c in credentials.filter((c) => c.status === 'active')"
            :key="c.id"
            type="button"
            class="text-xs text-error-text hover:underline text-left"
            @click="revokeCred(c.id)"
          >
            Revoke {{ c.client_id }}
          </button>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
