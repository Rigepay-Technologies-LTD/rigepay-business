<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { fetchOrgDocuments, uploadOrgDocument, fetchOrgScopedDocumentUrl, type OrgDocument } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DocUploadCard from '@/components/DocUploadCard.vue'
import { useResponseModal } from '@/composables/useResponseModal'

const { showError } = useResponseModal()

const props = defineProps<{ orgId: string }>()

interface DocSlot {
  type: string
  label: string
  description: string
}

const docSlots: DocSlot[] = [
  {
    type: 'brs_certificate',
    label: 'Certificate of Registration',
    description: 'BRS certificate of incorporation/registration'
  },
  {
    type: 'kra_cert',
    label: 'KRA PIN Certificate',
    description: 'Tax registration certificate'
  },
  {
    type: 'cr12',
    label: 'CR12',
    description: 'Company search / shareholding record'
  },
  {
    type: 'memorandum_of_association',
    label: 'Memorandum & Articles',
    description: 'Memorandum and articles of association'
  },
  {
    type: 'business_permit',
    label: 'Business Permit',
    description: 'Single business permit / trading license'
  },
  {
    type: 'tax_compliance',
    label: 'Tax Compliance Certificate',
    description: 'Valid KRA tax compliance certificate'
  },
  {
    type: 'bank_statement',
    label: 'Bank Statement',
    description: 'Last 3–6 months, business account'
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill or lease, business premises'
  },
  {
    type: 'shareholder_registry',
    label: 'Shareholder / Ownership Registry',
    description: 'Official record of shareholders and their ownership percentages'
  },
  {
    type: 'regulatory_license',
    label: 'Regulatory License',
    description: 'Sector-specific license, if your business requires one (e.g. CBK, CMA, IRA)'
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Any additional supporting document'
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

async function load() {
  loading.value = true
  error.value = null
  try {
    docs.value = await fetchOrgDocuments()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
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
    await uploadOrgDocument(file, type)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    uploadErrors.value = { ...uploadErrors.value, [type]: msg }
    showError(msg)
  } finally {
    uploadingType.value = null
  }
}

onMounted(load)

const completedCount = computed(() => docSlots.filter((s) => latestFor(s.type)).length)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Compliance documents">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Organization documents</h2>
          <p class="text-xs text-text-muted mt-0.5">
            {{ completedCount }} of {{ docSlots.length }} uploaded · a compliance officer reviews each one before approval.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
