<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { fetchOwnBranchMemberDocuments, uploadOwnBranchMemberDocument, fetchOwnBranchMemberDocumentUrl, type OrgDocument } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DocUploadCard from '@/components/DocUploadCard.vue'

const props = defineProps<{ orgId: string; branchId: string }>()

interface DocSlot {
  type: string
  label: string
  description: string
}

const docSlots: DocSlot[] = [
  {
    type: 'id_front',
    label: 'National ID (front)',
    description: 'Front of your national ID or passport'
  },
  {
    type: 'id_back',
    label: 'National ID (back)',
    description: 'Back of your national ID (skip for passports)'
  },
  {
    type: 'selfie',
    label: 'Selfie',
    description: 'A clear photo of yourself holding your ID'
  },
  {
    type: 'letter_of_authorization',
    label: 'Letter of Authorization',
    description: 'Signed letter from the organization confirming your role as branch manager'
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill or lease showing your residential address'
  },
]

const loading = ref(true)
const error = ref<string | null>(null)
const docs = ref<OrgDocument[]>([])
const uploadingType = ref<string | null>(null)
const uploadErrors = ref<Record<string, string>>({})
const viewingDocId = ref<string | null>(null)

async function handleView(docId: string) {
  viewingDocId.value = docId
  try {
    const url = await fetchOwnBranchMemberDocumentUrl(docId)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    viewingDocId.value = null
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    docs.value = await fetchOwnBranchMemberDocuments()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function latestFor(type: string): OrgDocument | undefined {
  return docs.value
    .filter((d) => d.doc_type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

async function handleUpload(type: string, file: File) {
  uploadErrors.value = { ...uploadErrors.value, [type]: '' }
  uploadingType.value = type
  try {
    await uploadOwnBranchMemberDocument(file, type)
    await load()
  } catch (err) {
    uploadErrors.value = { ...uploadErrors.value, [type]: extractErrorMessage(err) }
  } finally {
    uploadingType.value = null
  }
}

onMounted(load)

const completedCount = computed(() => docSlots.filter((s) => latestFor(s.type)).length)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="My KYC documents">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">My KYC documents</h2>
          <p class="text-xs text-text-muted mt-0.5">
            {{ completedCount }} of {{ docSlots.length }} uploaded · a compliance officer reviews each one before approval.
          </p>
        </div>
      </div>

      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DocUploadCard
          v-for="slot in docSlots"
          :key="slot.type"
          :slot-id="slot.type"
          :label="slot.label"
          :description="slot.description"
          :status="latestFor(slot.type)?.status"
          :uploaded-at="latestFor(slot.type)?.created_at"
          :uploading="uploadingType === slot.type"
          :error="uploadErrors[slot.type]"
          :doc-id="latestFor(slot.type)?.id"
          :viewing="viewingDocId === latestFor(slot.type)?.id"
          @upload="(file) => handleUpload(slot.type, file)"
          @view="handleView"
        />
      </div>
    </div>
  </DashboardLayout>
</template>
