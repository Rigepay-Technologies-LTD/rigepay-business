<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchOrgMembers, inviteOrgMember, fetchOrgBranches, fetchMemberDocuments, uploadMemberDocument,
  updateOrgMember, suspendOrgMember, reactivateOrgMember, resetOrgMemberPassword,
  type OrgMember, type BranchSummary, type MemberDocument, type UpdateMemberInput,
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
import DocUploadCard from '@/components/DocUploadCard.vue'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, UserIcon, PencilIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)
const members = ref<OrgMember[]>([])
const branches = ref<BranchSummary[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const [m, b] = await Promise.all([fetchOrgMembers(), fetchOrgBranches()])
    members.value = m
    branches.value = b.branches
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const isOwner = auth.meta?.role === 'owner'

const showInviteForm = ref(false)
const inviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSent = ref<string | null>(null)
const newEmail = ref('')
const newRole = ref('member')
const newBranchId = ref('')
const newCanInitiatePayments = ref(false)
const newCorporateDesignation = ref('')
const newIsSignatory = ref(false)
const newSigningMandate = ref('')

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
]

const designationOptions = [
  { value: '', label: '— None —' },
  { value: 'Chairman', label: 'Chairman' },
  { value: 'CEO', label: 'CEO' },
  { value: 'Managing Director', label: 'Managing Director' },
  { value: 'Secretary', label: 'Secretary' },
  { value: 'Treasurer', label: 'Treasurer' },
  { value: 'Other', label: 'Other' },
]

async function sendInvite() {
  inviteError.value = null
  inviteSent.value = null
  if (!newEmail.value.trim()) {
    inviteError.value = 'Email is required.'
    return
  }
  inviting.value = true
  try {
    await inviteOrgMember({
      email: newEmail.value.trim(),
      role: newRole.value,
      branch_id: newBranchId.value || undefined,
      can_initiate_payments: newCanInitiatePayments.value,
      corporate_designation: newCorporateDesignation.value || undefined,
      is_signatory: newIsSignatory.value,
      signing_mandate: newIsSignatory.value ? (newSigningMandate.value.trim() || undefined) : undefined,
    })
    inviteSent.value = `Invite sent to ${newEmail.value.trim()}.`
    newEmail.value = ''
    newRole.value = 'member'
    newBranchId.value = ''
    newCanInitiatePayments.value = false
    newCorporateDesignation.value = ''
    newIsSignatory.value = false
    newSigningMandate.value = ''
    showInviteForm.value = false
    await load()
  } catch (err) {
    inviteError.value = extractErrorMessage(err)
  } finally {
    inviting.value = false
  }
}

const expandedMemberId = ref<string | null>(null)
const docsByMember = ref<Record<string, MemberDocument[]>>({})
const docsLoading = ref<string | null>(null)
const uploadingSlot = ref<string | null>(null)
const uploadErrors = ref<Record<string, string>>({})

const memberDocSlots = [
  {
    type: 'board_resolution',
    label: 'Board resolution',
    description: 'Signed/stamped board minutes approving this platform account and naming authorized officials'
  },
  {
    type: 'cr12',
    label: 'CR12 / director registry',
    description: 'Fresh corporate registry document confirming this person\'s registered role'
  },
  {
    type: 'letter_of_authorization',
    label: 'Letter of authorization',
    description: 'Company letterhead document signed by directors appointing this person as signatory/administrator'
  },
  {
    type: 'id_document',
    label: 'National ID / passport',
    description: 'High-resolution photo or scan of their ID'
  },
  {
    type: 'selfie',
    label: 'Liveness selfie',
    description: 'Live selfie holding the ID, for liveness verification'
  },
]

async function toggleExpand(memberId: string) {
  if (expandedMemberId.value === memberId) {
    expandedMemberId.value = null
    return
  }
  expandedMemberId.value = memberId
  if (!docsByMember.value[memberId]) {
    docsLoading.value = memberId
    try {
      docsByMember.value = { ...docsByMember.value, [memberId]: await fetchMemberDocuments(memberId) }
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      docsLoading.value = null
    }
  }
}

function latestDocFor(memberId: string, type: string): MemberDocument | undefined {
  return (docsByMember.value[memberId] ?? [])
    .filter((d) => d.doc_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

async function handleMemberUpload(memberId: string, type: string, file: File) {
  const key = `${memberId}:${type}`
  uploadErrors.value = { ...uploadErrors.value, [key]: '' }
  uploadingSlot.value = key
  try {
    await uploadMemberDocument(memberId, file, type)
    docsByMember.value = { ...docsByMember.value, [memberId]: await fetchMemberDocuments(memberId) }
  } catch (err) {
    uploadErrors.value = { ...uploadErrors.value, [key]: extractErrorMessage(err) }
  } finally {
    uploadingSlot.value = null
  }
}

const editingMemberId = ref<string | null>(null)
const editingMember = ref(false)
const editMemberError = ref<string | null>(null)
const editCorporateDesignation = ref('')
const editIsSignatory = ref(false)
const editSigningMandate = ref('')
const editPhone = ref('')
const editNationalId = ref('')
const editTaxId = ref('')
const editCanInitiatePayments = ref(false)
const editRole = ref('member')

function startEditMember(m: OrgMember) {
  editingMemberId.value = m.id
  editMemberError.value = null
  editCorporateDesignation.value = m.corporate_designation ?? ''
  editIsSignatory.value = m.is_signatory
  editSigningMandate.value = m.signing_mandate ?? ''
  editPhone.value = m.phone ?? ''
  editNationalId.value = ''
  editTaxId.value = ''
  editCanInitiatePayments.value = m.can_initiate_payments
  editRole.value = m.role
}

function cancelEditMember() {
  editingMemberId.value = null
}

async function saveEditMember(memberId: string) {
  editMemberError.value = null
  editingMember.value = true
  try {
    const input: UpdateMemberInput = {
      corporate_designation: editCorporateDesignation.value || undefined,
      is_signatory: editIsSignatory.value,
      signing_mandate: editIsSignatory.value ? (editSigningMandate.value.trim() || undefined) : undefined,
      phone: editPhone.value.trim() || undefined,
      national_id_number: editNationalId.value.trim() || undefined,
      tax_id_number: editTaxId.value.trim() || undefined,
      can_initiate_payments: editCanInitiatePayments.value,
      role: editRole.value,
    }
    await updateOrgMember(memberId, input)
    editingMemberId.value = null
    await load()
  } catch (err) {
    editMemberError.value = extractErrorMessage(err)
  } finally {
    editingMember.value = false
  }
}

const actionError = ref<Record<string, string>>({})
const actionLoading = ref<string | null>(null)

async function handleSuspend(memberId: string) {
  if (!confirm('Suspend this member? They will immediately lose access.')) return
  actionError.value = { ...actionError.value, [memberId]: '' }
  actionLoading.value = memberId
  try {
    await suspendOrgMember(memberId)
    await load()
  } catch (err) {
    actionError.value = { ...actionError.value, [memberId]: extractErrorMessage(err) }
  } finally {
    actionLoading.value = null
  }
}

async function handleReactivate(memberId: string) {
  actionError.value = { ...actionError.value, [memberId]: '' }
  actionLoading.value = memberId
  try {
    await reactivateOrgMember(memberId)
    await load()
  } catch (err) {
    actionError.value = { ...actionError.value, [memberId]: extractErrorMessage(err) }
  } finally {
    actionLoading.value = null
  }
}

const resetResult = ref<Record<string, string>>({})

async function handleResetPassword(memberId: string) {
  if (!confirm("Reset this member's password? They will be emailed a new temporary password and any active session will be logged out.")) return
  actionError.value = { ...actionError.value, [memberId]: '' }
  actionLoading.value = memberId
  try {
    const message = await resetOrgMemberPassword(memberId)
    resetResult.value = { ...resetResult.value, [memberId]: message }
  } catch (err) {
    actionError.value = { ...actionError.value, [memberId]: extractErrorMessage(err) }
  } finally {
    actionLoading.value = null
  }
}

const memberColumns = [
  { key: 'first_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'can_initiate_payments', label: 'Can pay out' },
  { key: 'is_active', label: 'Status' },
  { key: 'created_at', label: 'Joined' },
]
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Members">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>
      <div v-if="inviteSent" class="text-sm text-success-text bg-success-light rounded-xl px-4 py-3">{{ inviteSent }}</div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Organization members</h2>
          <p class="text-xs text-text-muted mt-0.5">
            Invite people to your organization or a specific branch. They'll set their own password when they accept.
          </p>
        </div>
        <AppButton v-if="isOwner" size="sm" @click="showInviteForm = !showInviteForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          Invite member
        </AppButton>
      </div>

      <AppCard v-if="showInviteForm">
        <h3 class="text-sm font-bold text-text-primary mb-1">New invite</h3>
        <p class="text-xs text-text-muted mb-4">
          Leave "Branch" unset to invite an org-wide member; select a branch to invite them as that branch's member instead.
        </p>
        <div v-if="inviteError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ inviteError }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="sendInvite">
          <AppInput v-model="newEmail" type="email" label="Email address" required />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppSelect v-model="newRole" label="Role" :options="roleOptions" />
            <AppSelect
              v-model="newBranchId"
              label="Branch (optional)"
              :options="[{ value: '', label: 'Org-wide member' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]"
            />
          </div>
          <label class="flex items-start gap-2.5 text-sm text-text-secondary">
            <input v-model="newCanInitiatePayments" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-input-border" />
            <span>
              <span class="font-semibold text-text-primary">Can initiate payments</span><br />
              <span class="text-xs text-text-muted">They'll be able to request payouts (re-confirmed with their own password each time), subject to owner approval. Off by default.</span>
            </span>
          </label>

          <div class="border-t border-border pt-4 flex flex-col gap-4">
            <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Role profiling & capacity</p>
            <AppSelect v-model="newCorporateDesignation" label="Official corporate designation" :options="designationOptions" class="max-w-sm" />
            <label class="flex items-start gap-2.5 text-sm text-text-secondary">
              <input v-model="newIsSignatory" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-input-border" />
              <span>
                <span class="font-semibold text-text-primary">Authorized bank/wallet signatory</span><br />
                <span class="text-xs text-text-muted">Legally able to approve payouts or sign off on financial transactions.</span>
              </span>
            </label>
            <AppInput
              v-if="newIsSignatory"
              v-model="newSigningMandate"
              label="Signing mandate"
              placeholder='e.g. "Must sign jointly with the Chairman", "Sole signatory up to KSh 500,000", "Group A signatory"'
            />
          </div>

          <div class="flex gap-2">
            <AppButton type="submit" :loading="inviting">Send invite</AppButton>
            <AppButton type="button" variant="ghost" @click="showInviteForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard padding="none">
        <div class="px-5 pt-5">
          <h2 class="text-sm font-bold text-text-primary mb-4">Current members</h2>
        </div>
        <AppTable
          :columns="memberColumns"
          :rows="members.map((m) => ({ ...m, first_name: `${m.first_name} ${m.last_name}` }))"
          :loading="loading"
          empty-message="No organization members yet."
        >
          <template #cell-is_active="{ value }">
            <AppBadge :variant="value ? 'success' : 'neutral'" size="sm">{{ value ? 'Active' : 'Inactive' }}</AppBadge>
          </template>
          <template #cell-can_initiate_payments="{ row, value }">
            <AppBadge v-if="row.role === 'owner'" variant="neutral" size="sm">Owner (always)</AppBadge>
            <AppBadge v-else :variant="value ? 'success' : 'neutral'" size="sm">{{ value ? 'Yes' : 'No' }}</AppBadge>
          </template>
          <template #cell-created_at="{ value }">{{ formatDate(value as string) }}</template>
        </AppTable>
      </AppCard>

      <div v-if="members.length" class="flex flex-col gap-3">
        <AppCard v-for="m in members" :key="m.id" padding="none">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
            @click="toggleExpand(m.id)"
          >
            <div class="w-8 h-8 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
              <UserIcon class="w-4 h-4" />
            </div>
            <span class="text-sm font-semibold text-text-primary flex-1">
              {{ m.first_name }} {{ m.last_name }} — profile & documents
              <AppBadge v-if="m.is_signatory" variant="warning" size="sm" class="ml-2">Signatory</AppBadge>
              <AppBadge v-if="!m.is_active" variant="error" size="sm" class="ml-2">Suspended</AppBadge>
            </span>
            <button
              type="button"
              class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2"
              @click.stop="startEditMember(m)"
            >
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <ChevronUpIcon v-if="expandedMemberId === m.id" class="w-4 h-4 text-text-muted" />
            <ChevronDownIcon v-else class="w-4 h-4 text-text-muted" />
          </button>

          <div v-if="editingMemberId === m.id" class="border-t border-border px-5 py-5">
            <div v-if="editMemberError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ editMemberError }}</div>
            <form class="flex flex-col gap-4" @submit.prevent="saveEditMember(m.id)">
              <AppSelect
                v-model="editRole"
                label="Role"
                :options="roleOptions"
                class="max-w-sm"
                :tooltip="m.role === 'owner' ? 'Changing this away from Owner is blocked if it would leave the organization with no owners.' : undefined"
              />
              <AppSelect v-model="editCorporateDesignation" label="Official corporate designation" :options="designationOptions" class="max-w-sm" />
              <label class="flex items-start gap-2.5 text-sm text-text-secondary">
                <input v-model="editIsSignatory" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-input-border" />
                <span class="font-semibold text-text-primary">Authorized bank/wallet signatory</span>
              </label>
              <AppInput v-if="editIsSignatory" v-model="editSigningMandate" label="Signing mandate" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AppInput v-model="editPhone" label="Phone" placeholder="+254712345678" />
                <AppInput v-model="editNationalId" label="National ID number" />
              </div>
              <AppInput v-model="editTaxId" label="Tax ID number" />
              <label v-if="m.role !== 'owner'" class="flex items-start gap-2.5 text-sm text-text-secondary">
                <input v-model="editCanInitiatePayments" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-input-border" />
                <span class="font-semibold text-text-primary">Can initiate payments</span>
              </label>
              <div class="flex gap-2">
                <AppButton type="submit" size="sm" :loading="editingMember">Save changes</AppButton>
                <AppButton type="button" size="sm" variant="ghost" @click="cancelEditMember">Cancel</AppButton>
              </div>
            </form>
          </div>

          <div v-if="expandedMemberId === m.id" class="border-t border-border px-5 py-5 flex flex-col gap-6">
            <div>
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-bold text-text-muted uppercase tracking-wider">Details</p>
                <div class="flex gap-2">
                  <AppButton
                    v-if="m.is_active"
                    size="sm"
                    variant="secondary"
                    :loading="actionLoading === m.id"
                    @click="handleSuspend(m.id)"
                  >
                    Suspend
                  </AppButton>
                  <AppButton
                    v-else
                    size="sm"
                    variant="secondary"
                    :loading="actionLoading === m.id"
                    @click="handleReactivate(m.id)"
                  >
                    Reactivate
                  </AppButton>
                  <AppButton size="sm" variant="secondary" :loading="actionLoading === m.id" @click="handleResetPassword(m.id)">
                    Reset password
                  </AppButton>
                </div>
              </div>
              <div v-if="actionError[m.id]" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ actionError[m.id] }}</div>
              <div v-if="resetResult[m.id]" class="text-xs text-success-text bg-success-light rounded-lg px-3 py-2 mb-3">{{ resetResult[m.id] }}</div>
              <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                <div><dt class="text-text-muted mb-0.5">Corporate designation</dt><dd class="font-semibold text-text-primary">{{ m.corporate_designation ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Signatory status</dt><dd class="font-semibold text-text-primary">{{ m.is_signatory ? 'Authorized signatory' : 'Not a signatory' }}</dd></div>
                <div v-if="m.is_signatory"><dt class="text-text-muted mb-0.5">Signing mandate</dt><dd class="font-semibold text-text-primary">{{ m.signing_mandate ?? '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">National ID number</dt><dd class="font-semibold text-text-primary">{{ m.has_national_id ? 'On file (encrypted)' : '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Tax ID number</dt><dd class="font-semibold text-text-primary">{{ m.has_tax_id ? 'On file (encrypted)' : '—' }}</dd></div>
                <div><dt class="text-text-muted mb-0.5">Phone</dt><dd class="font-semibold text-text-primary">{{ m.phone ?? '—' }}</dd></div>
              </dl>
            </div>

            <div>
              <p class="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Corporate authorization & identity documents</p>
              <p v-if="docsLoading === m.id" class="text-xs text-text-muted">Loading documents…</p>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DocUploadCard
                  v-for="slot in memberDocSlots"
                  :key="slot.type"
                  :slot-id="`${m.id}-${slot.type}`"
                  :label="slot.label"
                  :description="slot.description"
                  :status="latestDocFor(m.id, slot.type)?.status"
                  :uploaded-at="latestDocFor(m.id, slot.type)?.created_at"
                  :uploading="uploadingSlot === `${m.id}:${slot.type}`"
                  :error="uploadErrors[`${m.id}:${slot.type}`]"
                  @upload="(file) => handleMemberUpload(m.id, slot.type, file)"
                />
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </DashboardLayout>
</template>
