<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  fetchOrgBranches, createOrgBranch, updateOrgBranch, fetchBranchDocuments, uploadBranchDocument,
  type BranchesResponse, type CreateBranchInput, type UpdateBranchInput, type BranchDocument, type BranchSummary,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, riskTier } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import DocUploadCard from '@/components/DocUploadCard.vue'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, BuildingIcon, PencilIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<BranchesResponse | null>(null)

async function loadOverview() {
  loading.value = true
  error.value = null
  try {
    overview.value = await fetchOrgBranches()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(loadOverview)

const branchRows = computed(() => overview.value?.branches ?? [])


const branchColumns = [
  { key: 'name', label: 'Branch' },
  { key: 'branch_type', label: 'Type' },
  { key: 'collection_code', label: 'Code' },
  { key: 'status', label: 'Status' },
]

function statusVariant(status: string) {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'error'
  return 'neutral'
}

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createdResult = ref<{ name: string; collection_code: string; manager_email: string; temp_password: string } | null>(null)

const newName = ref('')
const newLocation = ref('')
const newManagerFirstName = ref('')
const newManagerLastName = ref('')
const newManagerEmail = ref('')
const newManagerPhone = ref('')
const newParentOrgIdentifier = ref('')
const newBranchType = ref('')
const newRelationshipDeclaration = ref('')
const newOperatingAddress = ref('')
const newContactPersonName = ref('')
const newContactPersonEmail = ref('')
const newContactPersonPhone = ref('')
const newSettlementMode = ref('BRANCH_WALLET')
const newSettlementBankName = ref('')
const newSettlementBankCode = ref('')
const newSettlementBankAccountNumber = ref('')
const newBranchTaxLicenseNumber = ref('')

const branchTypeOptions = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'INTERNATIONAL_SUBSIDIARY', label: 'International subsidiary' },
  { value: 'FRANCHISE', label: 'Franchise' },
  { value: 'REGIONAL_OUTLET', label: 'Regional outlet' },
]

const settlementModeOptions = [
  { value: 'BRANCH_WALLET', label: "Branch wallet (default)" },
  { value: 'CONSOLIDATED', label: "Consolidated into parent's account" },
]

function resetCreateForm() {
  newName.value = ''
  newLocation.value = ''
  newManagerFirstName.value = ''
  newManagerLastName.value = ''
  newManagerEmail.value = ''
  newManagerPhone.value = ''
  newParentOrgIdentifier.value = ''
  newBranchType.value = ''
  newRelationshipDeclaration.value = ''
  newOperatingAddress.value = ''
  newContactPersonName.value = ''
  newContactPersonEmail.value = ''
  newContactPersonPhone.value = ''
  newSettlementMode.value = 'BRANCH_WALLET'
  newSettlementBankName.value = ''
  newSettlementBankCode.value = ''
  newSettlementBankAccountNumber.value = ''
  newBranchTaxLicenseNumber.value = ''
}

async function createBranch() {
  createError.value = null
  if (!newName.value.trim() || !newManagerFirstName.value.trim() || !newManagerLastName.value.trim() ||
      !newManagerEmail.value.trim() || !newManagerPhone.value.trim()) {
    createError.value = 'Branch name and manager first name, last name, email, and phone are required.'
    return
  }
  if (newSettlementMode.value === 'CONSOLIDATED' &&
      (!newSettlementBankName.value.trim() || !newSettlementBankCode.value.trim() || !newSettlementBankAccountNumber.value.trim())) {
    createError.value = 'Consolidated settlement requires the destination bank name, code, and account number.'
    return
  }
  creating.value = true
  try {
    const input: CreateBranchInput = {
      name: newName.value.trim(),
      location: newLocation.value.trim() || undefined,
      manager_first_name: newManagerFirstName.value.trim(),
      manager_last_name: newManagerLastName.value.trim(),
      manager_email: newManagerEmail.value.trim(),
      manager_phone: newManagerPhone.value.trim(),
      parent_organization_identifier: newParentOrgIdentifier.value.trim() || undefined,
      branch_type: newBranchType.value || undefined,
      relationship_declaration: newRelationshipDeclaration.value.trim() || undefined,
      operating_address: newOperatingAddress.value.trim() || undefined,
      contact_person_name: newContactPersonName.value.trim() || undefined,
      contact_person_email: newContactPersonEmail.value.trim() || undefined,
      contact_person_phone: newContactPersonPhone.value.trim() || undefined,
      settlement_mode: newSettlementMode.value || undefined,
      settlement_bank_name: newSettlementBankName.value.trim() || undefined,
      settlement_bank_code: newSettlementBankCode.value.trim() || undefined,
      settlement_bank_account_number: newSettlementBankAccountNumber.value.trim() || undefined,
      branch_tax_license_number: newBranchTaxLicenseNumber.value.trim() || undefined,
    }
    const result = await createOrgBranch(input)
    createdResult.value = result
    resetCreateForm()
    showCreateForm.value = false
    await loadOverview()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const editingBranchId = ref<string | null>(null)
const editing = ref(false)
const editError = ref<string | null>(null)
const editLocation = ref('')
const editBranchType = ref('')
const editRelationshipDeclaration = ref('')
const editOperatingAddress = ref('')
const editContactPersonName = ref('')
const editContactPersonEmail = ref('')
const editContactPersonPhone = ref('')
const editSettlementMode = ref('BRANCH_WALLET')
const editSettlementBankName = ref('')
const editSettlementBankCode = ref('')
const editSettlementBankAccountNumber = ref('')
const editBranchTaxLicenseNumber = ref('')

function startEditBranch(b: BranchSummary) {
  editingBranchId.value = b.id
  editError.value = null
  editLocation.value = b.location ?? ''
  editBranchType.value = b.branch_type ?? ''
  editRelationshipDeclaration.value = b.relationship_declaration ?? ''
  editOperatingAddress.value = b.operating_address ?? ''
  editContactPersonName.value = b.contact_person_name ?? ''
  editContactPersonEmail.value = b.contact_person_email ?? ''
  editContactPersonPhone.value = b.contact_person_phone ?? ''
  editSettlementMode.value = b.settlement_mode || 'BRANCH_WALLET'
  editSettlementBankName.value = b.settlement_bank_name ?? ''
  editSettlementBankCode.value = b.settlement_bank_code ?? ''
  editSettlementBankAccountNumber.value = b.settlement_bank_account_number ?? ''
  editBranchTaxLicenseNumber.value = b.branch_tax_license_number ?? ''
}

function cancelEditBranch() {
  editingBranchId.value = null
}

async function saveEditBranch(branchId: string) {
  editError.value = null
  if (editSettlementMode.value === 'CONSOLIDATED' &&
      (!editSettlementBankName.value.trim() || !editSettlementBankCode.value.trim() || !editSettlementBankAccountNumber.value.trim())) {
    editError.value = 'Consolidated settlement requires the destination bank name, code, and account number.'
    return
  }
  editing.value = true
  try {
    const input: UpdateBranchInput = {
      location: editLocation.value.trim() || undefined,
      branch_type: editBranchType.value || undefined,
      relationship_declaration: editRelationshipDeclaration.value.trim() || undefined,
      operating_address: editOperatingAddress.value.trim() || undefined,
      contact_person_name: editContactPersonName.value.trim() || undefined,
      contact_person_email: editContactPersonEmail.value.trim() || undefined,
      contact_person_phone: editContactPersonPhone.value.trim() || undefined,
      settlement_mode: editSettlementMode.value || undefined,
      settlement_bank_name: editSettlementBankName.value.trim() || undefined,
      settlement_bank_code: editSettlementBankCode.value.trim() || undefined,
      settlement_bank_account_number: editSettlementBankAccountNumber.value.trim() || undefined,
      branch_tax_license_number: editBranchTaxLicenseNumber.value.trim() || undefined,
    }
    await updateOrgBranch(branchId, input)
    editingBranchId.value = null
    await loadOverview()
  } catch (err) {
    editError.value = extractErrorMessage(err)
  } finally {
    editing.value = false
  }
}

// --- Per-branch expand: details + document upload ---
const expandedBranchId = ref<string | null>(null)
const docsByBranch = ref<Record<string, BranchDocument[]>>({})
const docsLoading = ref<string | null>(null)
const uploadingSlot = ref<string | null>(null)
const uploadErrors = ref<Record<string, string>>({})

const branchDocSlots = [
  {
    type: 'proof_of_address',
    label: 'Proof of branch address',
    description: 'Utility bill, lease, or bank statement for this branch — issued within the last 3 months'
  },
  {
    type: 'operating_license',
    label: 'Local operating license',
    description: 'Any local trading/operating license required for this branch'
  },
  {
    type: 'letter_of_authorization',
    label: 'Letter of authorization',
    description: 'Signed letter authorizing this branch to operate under the parent organization'
  },
]

async function toggleExpand(branchId: string) {
  if (expandedBranchId.value === branchId) {
    expandedBranchId.value = null
    return
  }
  expandedBranchId.value = branchId
  if (!docsByBranch.value[branchId]) {
    docsLoading.value = branchId
    try {
      docsByBranch.value = { ...docsByBranch.value, [branchId]: await fetchBranchDocuments(branchId) }
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      docsLoading.value = null
    }
  }
}

function latestDocFor(branchId: string, type: string): BranchDocument | undefined {
  return (docsByBranch.value[branchId] ?? [])
    .filter((d) => d.doc_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

async function handleBranchUpload(branchId: string, type: string, file: File) {
  const key = `${branchId}:${type}`
  uploadErrors.value = { ...uploadErrors.value, [key]: '' }
  uploadingSlot.value = key
  try {
    await uploadBranchDocument(branchId, file, type)
    docsByBranch.value = { ...docsByBranch.value, [branchId]: await fetchBranchDocuments(branchId) }
  } catch (err) {
    uploadErrors.value = { ...uploadErrors.value, [key]: extractErrorMessage(err) }
  } finally {
    uploadingSlot.value = null
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branches="overview?.branches ?? []" title="Branches">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div v-if="createdResult" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3 flex flex-col gap-1">
        <p class="font-semibold">Branch "{{ createdResult.name }}" created — collection code {{ createdResult.collection_code }}.</p>
        <p>Manager login: {{ createdResult.manager_email }} — temporary password: <span class="font-mono font-bold">{{ createdResult.temp_password }}</span></p>
        <p class="text-xs">Share this password securely with the branch manager. It will not be shown again.</p>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">All branches</h2>
          <p class="text-xs text-text-muted mt-0.5">{{ overview?.branch_count ?? 0 }} branch{{ overview?.branch_count === 1 ? '' : 'es' }}</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Add branch
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-1">New branch</h3>
        <p class="text-xs text-text-muted mb-5">
          Only branch name and manager details are required now — everything else, including documents, can be added later.
        </p>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-4">{{ createError }}</div>
        <form class="flex flex-col gap-6" @submit.prevent="createBranch">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="newName" label="Branch name" required />
            <AppInput v-model="newLocation" label="Location" placeholder="e.g. Nairobi" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="newManagerFirstName" label="Manager first name" required />
            <AppInput v-model="newManagerLastName" label="Manager last name" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="newManagerEmail" type="email" label="Manager email" required />
            <AppInput v-model="newManagerPhone" label="Manager phone" placeholder="+254712345678" required />
          </div>

          <div class="border-t border-border pt-5 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Branch identity</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppInput v-model="newParentOrgIdentifier" label="Parent organization identifier"
                tooltip="Your organization's registration number or another identifier linking this branch back to the parent." />
              <AppSelect v-model="newBranchType" label="Branch type" placeholder="— Select —" :options="branchTypeOptions" />
            </div>
            <AppInput v-model="newRelationshipDeclaration" label="Relationship declaration"
              tooltip="Briefly describe this branch's relationship to the parent organization, e.g. wholly-owned, franchise, joint venture." />
            <AppInput v-model="newOperatingAddress" label="Physical operating address" />
          </div>

          <div class="border-t border-border pt-5 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Branch contact person</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AppInput v-model="newContactPersonName" label="Full name" />
              <AppInput v-model="newContactPersonEmail" type="email" label="Email" />
              <AppInput v-model="newContactPersonPhone" label="Phone" placeholder="+254712345678" />
            </div>
          </div>

          <div class="border-t border-border pt-5 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Settlement architecture</p>
            <AppSelect v-model="newSettlementMode" label="Settlement mode" :options="settlementModeOptions" class="max-w-sm" />
            <div v-if="newSettlementMode === 'CONSOLIDATED'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AppInput v-model="newSettlementBankName" label="Bank name" required />
              <AppInput v-model="newSettlementBankCode" label="Bank branch code" required />
              <AppInput v-model="newSettlementBankAccountNumber" label="Account number" required />
            </div>
          </div>

          <AppInput v-model="newBranchTaxLicenseNumber" label="Branch tax / licensing number"
            tooltip="A branch-specific KRA PIN or local trading license number, if this branch has one separate from the organization's." />

          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create branch</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard padding="none">
        <AppTable :columns="branchColumns" :rows="branchRows" :loading="loading" empty-message="No branches yet.">
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
          <template #cell-branch_type="{ value }">
            <span v-if="value" class="text-xs text-text-secondary">{{ (value as string).replace('_', ' ') }}</span>
            <span v-else class="text-xs text-text-disabled">—</span>
          </template>
        </AppTable>
      </AppCard>

      <div v-if="branchRows.length" class="flex flex-col gap-3">
        <AppCard v-for="b in branchRows" :key="b.id" padding="none">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
            @click="toggleExpand(b.id)"
          >
            <div class="w-8 h-8 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
              <BuildingIcon class="w-4 h-4" />
            </div>
            <span class="text-sm font-semibold text-text-primary flex-1">{{ b.name }} — details & documents</span>
            <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2" @click.stop="startEditBranch(b)">
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <ChevronUpIcon v-if="expandedBranchId === b.id" class="w-4 h-4 text-text-muted" />
            <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
          </button>

          <div v-if="editingBranchId === b.id" class="border-t border-border px-5 py-5">
            <div v-if="editError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ editError }}</div>
            <form class="flex flex-col gap-4" @submit.prevent="saveEditBranch(b.id)">
              <AppInput v-model="editLocation" label="Location" placeholder="e.g. Nairobi" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AppSelect v-model="editBranchType" label="Branch type" placeholder="— Select —" :options="branchTypeOptions" />
                <AppInput v-model="editRelationshipDeclaration" label="Relationship declaration" />
              </div>
              <AppInput v-model="editOperatingAddress" label="Physical operating address" />
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AppInput v-model="editContactPersonName" label="Contact person name" />
                <AppInput v-model="editContactPersonEmail" type="email" label="Contact email" />
                <AppInput v-model="editContactPersonPhone" label="Contact phone" placeholder="+254712345678" />
              </div>
              <AppSelect v-model="editSettlementMode" label="Settlement mode" :options="settlementModeOptions" class="max-w-sm" />
              <div v-if="editSettlementMode === 'CONSOLIDATED'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AppInput v-model="editSettlementBankName" label="Bank name" required />
                <AppInput v-model="editSettlementBankCode" label="Bank branch code" required />
                <AppInput v-model="editSettlementBankAccountNumber" label="Account number" required />
              </div>
              <AppInput v-model="editBranchTaxLicenseNumber" label="Branch tax / licensing number" />
              <div class="flex gap-2">
                <AppButton type="submit" size="sm" :loading="editing">Save changes</AppButton>
                <AppButton type="button" size="sm" variant="ghost" @click="cancelEditBranch">Cancel</AppButton>
              </div>
            </form>
          </div>

          <div v-if="expandedBranchId === b.id" class="border-t border-border px-5 py-5 flex flex-col gap-6">
            <div>
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Details</p>
              <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                <div><dt class="text-text-muted mb-0.5">Main balance</dt><dd class="font-semibold text-text-primary">KES {{ formatMoney(b.main_cents) }}</dd></div>
                <div>
                  <dt class="text-text-muted mb-0.5">Risk score</dt>
                  <dd>
                    <AppBadge :variant="riskTier(b.risk_score).variant" size="sm">
                      {{ riskTier(b.risk_score).label }}{{ b.risk_score > 0 ? ` (${b.risk_score}/100)` : '' }}
                    </AppBadge>
                  </dd>
                </div>
                <div><dt class="text-text-muted mb-0.5">Parent org identifier</dt><dd class="font-semibold text-text-primary">{{ b.parent_organization_identifier ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Branch type</dt><dd class="font-semibold text-text-primary">{{ b.branch_type ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Settlement mode</dt><dd class="font-semibold text-text-primary">{{ b.settlement_mode }}</dd></div>
                <div class="sm:col-span-3"><dt class="text-text-muted mb-0.5">Operating address</dt><dd class="font-semibold text-text-primary">{{ b.operating_address ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Contact person</dt><dd class="font-semibold text-text-primary">{{ b.contact_person_name ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Contact email</dt><dd class="font-semibold text-text-primary">{{ b.contact_person_email ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Contact phone</dt><dd class="font-semibold text-text-primary">{{ b.contact_person_phone ?? '—' }}</dd></div>
                <div v-if="b.settlement_mode === 'CONSOLIDATED'"><dt class="text-text-muted mb-0.5">Settlement bank</dt><dd class="font-semibold text-text-primary">{{ b.settlement_bank_name ?? '—' }} ({{ b.settlement_bank_code ?? '—' }})</dd></div>
                <div v-if="b.settlement_mode === 'CONSOLIDATED'"><dt class="text-text-muted mb-0.5">Settlement account</dt><dd class="font-semibold text-text-primary">{{ b.settlement_bank_account_number ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Tax / license number</dt><dd class="font-semibold text-text-primary">{{ b.branch_tax_license_number ?? '—' }}</dd></div>
              </dl>
            </div>

            <div>
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Branch documents</p>
              <p v-if="docsLoading === b.id" class="text-xs text-text-muted">Loading documents…</p>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DocUploadCard
                  v-for="slot in branchDocSlots"
                  :key="slot.type"
                  :slot-id="`${b.id}-${slot.type}`"
                  :label="slot.label"
                  :description="slot.description"
                  :status="latestDocFor(b.id, slot.type)?.status"
                  :uploaded-at="latestDocFor(b.id, slot.type)?.created_at"
                  :uploading="uploadingSlot === `${b.id}:${slot.type}`"
                  :error="uploadErrors[`${b.id}:${slot.type}`]"
                  @upload="(file) => handleBranchUpload(b.id, slot.type, file)"
                />
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
