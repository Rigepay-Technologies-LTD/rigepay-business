<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgDirectors, createOrgDirector, updateOrgDirector,
  fetchDirectorDocuments, uploadDirectorDocument, fetchOrgScopedDocumentUrl,
  type OrgDirector, type DirectorDocument, type DirectorUpdateInput,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import DocUploadCard from '@/components/DocUploadCard.vue'
import { PlusIcon, ShieldAlertIcon, ChevronDownIcon, ChevronUpIcon, UserIcon, PencilIcon } from 'lucide-vue-next'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const directors = ref<OrgDirector[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    directors.value = (await fetchOrgDirectors()) ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)


const showAddForm = ref(false)
const adding = ref(false)
const addError = ref<string | null>(null)
const newFullName = ref('')
const newNationalId = ref('')
const newOwnershipPercent = ref('')
const newIsPep = ref(false)
const newDateOfBirth = ref('')
const newNationality = ref('')
const newTaxId = ref('')
const newResidentialAddress = ref('')
const newPhoneNumber = ref('')
const newEmail = ref('')

async function addDirector() {
  addError.value = null
  if (!newFullName.value.trim() || !newNationalId.value.trim()) {
    addError.value = 'Full name and national ID number are required. Every other field can be added later.'
    return
  }
  adding.value = true
  try {
    await createOrgDirector({
      full_name: newFullName.value.trim(),
      national_id_number: newNationalId.value.trim(),
      ownership_percent: newOwnershipPercent.value ? Number(newOwnershipPercent.value) : 0,
      is_pep: newIsPep.value,
      date_of_birth: newDateOfBirth.value || undefined,
      nationality: newNationality.value.trim() || undefined,
      tax_id_number: newTaxId.value.trim() || undefined,
      residential_address: newResidentialAddress.value.trim() || undefined,
      phone_number: newPhoneNumber.value.trim() || undefined,
      email: newEmail.value.trim() || undefined,
    })
    newFullName.value = ''
    newNationalId.value = ''
    newOwnershipPercent.value = ''
    newIsPep.value = false
    newDateOfBirth.value = ''
    newNationality.value = ''
    newTaxId.value = ''
    newResidentialAddress.value = ''
    newPhoneNumber.value = ''
    newEmail.value = ''
    showAddForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    addError.value = msg
    showError(msg)
  } finally {
    adding.value = false
  }
}

const editingDirectorId = ref<string | null>(null)
const editing = ref(false)
const editError = ref<string | null>(null)
const editFullName = ref('')
const editNationalId = ref('')
const editOwnershipPercent = ref('')
const editIsPep = ref(false)
const editDateOfBirth = ref('')
const editNationality = ref('')
const editTaxId = ref('')
const editResidentialAddress = ref('')
const editPhoneNumber = ref('')
const editEmail = ref('')

function startEdit(d: OrgDirector) {
  editingDirectorId.value = d.id
  editError.value = null
  editFullName.value = d.full_name
  editOwnershipPercent.value = String(d.ownership_percent)
  editIsPep.value = d.is_pep
  editNationalId.value = ''
  editDateOfBirth.value = ''
  editNationality.value = ''
  editTaxId.value = ''
  editResidentialAddress.value = ''
  editPhoneNumber.value = ''
  editEmail.value = ''
}

function cancelEdit() {
  editingDirectorId.value = null
}

async function saveEdit(directorId: string) {
  editError.value = null
  if (!editFullName.value.trim()) {
    editError.value = 'Full name is required.'
    return
  }
  editing.value = true
  try {
    const input: DirectorUpdateInput = {
      full_name: editFullName.value.trim(),
      national_id_number: editNationalId.value.trim() || undefined,
      ownership_percent: editOwnershipPercent.value ? Number(editOwnershipPercent.value) : 0,
      is_pep: editIsPep.value,
      date_of_birth: editDateOfBirth.value || undefined,
      nationality: editNationality.value.trim() || undefined,
      tax_id_number: editTaxId.value.trim() || undefined,
      residential_address: editResidentialAddress.value.trim() || undefined,
      phone_number: editPhoneNumber.value.trim() || undefined,
      email: editEmail.value.trim() || undefined,
    }
    await updateOrgDirector(directorId, input)
    editingDirectorId.value = null
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    editError.value = msg
    showError(msg)
  } finally {
    editing.value = false
  }
}

const expandedDirectorId = ref<string | null>(null)
const docsByDirector = ref<Record<string, DirectorDocument[]>>({})
const docsLoading = ref<string | null>(null)
const uploadingSlot = ref<string | null>(null)
const uploadErrors = ref<Record<string, string>>({})

const directorDocSlots = [
  { type: 'id_front', label: 'National ID (front)', description: 'Front of national ID or passport — Proof of Identity' },
  { type: 'id_back', label: 'National ID (back)', description: 'Back of national ID' },
  { type: 'selfie', label: 'Live selfie', description: 'Live selfie holding the ID, for liveness verification' },
  { type: 'proof_of_address', label: 'Proof of address', description: 'Utility bill, bank statement, or lease — issued within the last 3 months' },
]

async function toggleExpand(directorId: string) {
  if (expandedDirectorId.value === directorId) {
    expandedDirectorId.value = null
    return
  }
  expandedDirectorId.value = directorId
  if (!docsByDirector.value[directorId]) {
    docsLoading.value = directorId
    try {
      docsByDirector.value = { ...docsByDirector.value, [directorId]: await fetchDirectorDocuments(directorId) }
    } catch (err) {
      const msg = extractErrorMessage(err)
      error.value = msg
      showError(msg)
    } finally {
      docsLoading.value = null
    }
  }
}

function latestDocFor(directorId: string, type: string): DirectorDocument | undefined {
  return (docsByDirector.value[directorId] ?? [])
    .filter((d) => d.doc_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

const viewingDocId = ref<string | null>(null)

async function handleView(docId: string) {
  viewingDocId.value = docId
  try {
    const url = await fetchOrgScopedDocumentUrl(docId)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    viewingDocId.value = null
  }
}

async function handleDirectorUpload(directorId: string, type: string, file: File) {
  const key = `${directorId}:${type}`
  uploadErrors.value = { ...uploadErrors.value, [key]: '' }
  uploadingSlot.value = key
  try {
    await uploadDirectorDocument(directorId, file, type)
    docsByDirector.value = { ...docsByDirector.value, [directorId]: await fetchDirectorDocuments(directorId) }
  } catch (err) {
    const msg = extractErrorMessage(err)
    uploadErrors.value = { ...uploadErrors.value, [key]: msg }
    showError(msg)
  } finally {
    uploadingSlot.value = null
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Directors">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Directors</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Every director is automatically screened against sanctions/PEP watchlists on add or identity change.
          </p>
        </div>
        <AppButton size="sm" @click="showAddForm = !showAddForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Add director
        </AppButton>
      </div>

      <AppCard v-if="showAddForm">
        <h3 class="text-sm font-bold text-text-primary mb-1">New director</h3>
        <p class="text-xs text-text-muted mb-4">
          Only full name and national ID are required to save this director now — everything else, including
          documents, can be added later. Nothing here needs to be finished in one sitting.
        </p>
        <div v-if="addError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ addError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="addDirector">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="newFullName" label="Full legal name" required
              tooltip="Enter the director's full name exactly as it appears on their national ID or passport." />
            <AppInput v-model="newNationalId" label="National ID number" required
              tooltip="The number printed on their national ID card or passport bio page." />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AppInput v-model="newDateOfBirth" type="date" label="Date of birth" />
            <AppInput v-model="newNationality" label="Nationality / citizenship" placeholder="e.g. Kenyan" />
            <AppInput v-model="newTaxId" label="Tax ID number"
              tooltip="Their personal KRA PIN or equivalent tax identification number — found on their KRA PIN certificate." />
          </div>
          <AppInput v-model="newResidentialAddress" label="Physical residential address"
            tooltip="Their current home address — must match the address shown on the Proof of Address document uploaded below." />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="newPhoneNumber" label="Primary phone number" placeholder="+254712345678" />
            <AppInput v-model="newEmail" type="email" label="Professional email address" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <AppInput v-model="newOwnershipPercent" type="number" label="Ownership percent" placeholder="0–100"
              tooltip="Their percentage shareholding — found on the CR12 or shareholder registry." />
            <label class="flex items-center gap-2 h-10 px-1 text-sm font-medium text-text-secondary">
              <input v-model="newIsPep" type="checkbox" class="w-4 h-4 rounded border-input-border" />
              Politically exposed person (PEP)
              <AppTooltip text="A PEP is someone who holds, or has held, a prominent public role (e.g. government office, senior military/judicial position) or is closely related to someone who does." />
            </label>
          </div>
          <div class="flex gap-2">
            <AppButton type="submit" :loading="adding">Save director</AppButton>
            <AppButton type="button" variant="ghost" @click="showAddForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading directors…</p>
      <AppCard v-else-if="directors.length === 0" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <UserIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No directors added yet</p>
          <p class="text-xs text-text-muted">Add your organization's directors so their compliance documents can be reviewed.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-3">
        <AppCard v-for="d in directors" :key="d.id" padding="none">
          <button
            type="button"
            class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            @click="toggleExpand(d.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-primary-muted text-primary flex items-center justify-center shrink-0">
                <UserIcon class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-text-primary truncate">{{ d.full_name }}</p>
                <p class="text-[11px] text-text-muted truncate">
                  {{ d.ownership_percent }}% ownership
                  <template v-if="d.last_screened_at"> · screened {{ formatDate(d.last_screened_at) }}</template>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <AppBadge v-if="d.is_pep" variant="warning" size="sm">
                <ShieldAlertIcon class="w-3 h-3 mr-1 inline" />PEP
              </AppBadge>
              <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2" @click.stop="startEdit(d)">
                <PencilIcon class="w-3.5 h-3.5" />
              </button>
              <ChevronUpIcon v-if="expandedDirectorId === d.id" class="w-4 h-4 text-text-muted" />
              <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
            </div>
          </button>

          <div v-if="editingDirectorId === d.id" class="border-t border-border px-5 py-4">
            <div v-if="editError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ editError }}</div>
            <form class="flex flex-col gap-4" @submit.prevent="saveEdit(d.id)">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AppInput v-model="editFullName" label="Full legal name" required />
                <AppInput v-model="editNationalId" label="National ID number" required />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AppInput v-model="editDateOfBirth" type="date" label="Date of birth" />
                <AppInput v-model="editNationality" label="Nationality / citizenship" />
                <AppInput v-model="editTaxId" label="Tax ID number" />
              </div>
              <AppInput v-model="editResidentialAddress" label="Physical residential address" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AppInput v-model="editPhoneNumber" label="Primary phone number" placeholder="+254712345678" />
                <AppInput v-model="editEmail" type="email" label="Professional email address" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <AppInput v-model="editOwnershipPercent" type="number" label="Ownership percent" placeholder="0–100" />
                <label class="flex items-center gap-2 h-10 px-1 text-sm font-medium text-text-secondary">
                  <input v-model="editIsPep" type="checkbox" class="w-4 h-4 rounded border-input-border" />
                  Politically exposed person (PEP)
                </label>
              </div>
              <div class="flex gap-2">
                <AppButton type="submit" size="sm" :loading="editing">Save changes</AppButton>
                <AppButton type="button" size="sm" variant="ghost" @click="cancelEdit">Cancel</AppButton>
              </div>
            </form>
          </div>

          <div v-if="expandedDirectorId === d.id" class="border-t border-border px-5 py-4 flex flex-col gap-5">
            <div>
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Details</p>
              <p class="text-xs text-text-muted">
                <template v-if="d.has_kyc_details">Identity and contact details are on file, encrypted at rest. For privacy they are never displayed — re-enter a field via Edit to change it.</template>
                <template v-else>No identity/contact details on file yet — add them via Edit.</template>
              </p>
            </div>

            <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Identity documents</p>
            <p v-if="docsLoading === d.id" class="text-xs text-text-muted">Loading documents…</p>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <DocUploadCard
                v-for="slot in directorDocSlots"
                :key="slot.type"
                :slot-id="`${d.id}-${slot.type}`"
                :label="slot.label"
                :description="slot.description"
                :status="latestDocFor(d.id, slot.type)?.status"
                :uploaded-at="latestDocFor(d.id, slot.type)?.created_at"
                :uploading="uploadingSlot === `${d.id}:${slot.type}`"
                :error="uploadErrors[`${d.id}:${slot.type}`]"
                :doc-id="latestDocFor(d.id, slot.type)?.id"
                :viewing="viewingDocId === latestDocFor(d.id, slot.type)?.id"
                @upload="(file) => handleDirectorUpload(d.id, slot.type, file)"
                @view="handleView"
              />
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
