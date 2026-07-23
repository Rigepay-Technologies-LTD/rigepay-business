<script setup lang="ts">
import { ref } from 'vue'
import { FileTextIcon, UploadCloudIcon, CheckCircle2Icon, XCircleIcon, ClockIcon, Loader2Icon } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate } from '@/lib/format'

// Extracted from OrgDocumentsView.vue (Round 15) so the same card-based
// drag-drop upload UI can be reused for Director documents (Round 16 Piece
// A) instead of rebuilding it — both call sites share this component now.
const props = defineProps<{
  slotId: string
  label: string
  description: string
  status?: string
  uploadedAt?: string
  uploading?: boolean
  error?: string
}>()

const emit = defineEmits<{ (e: 'upload', file: File): void }>()

const dragOver = ref(false)

function statusMeta(status?: string) {
  if (status === 'APPROVED') return { variant: 'success' as const, icon: CheckCircle2Icon }
  if (status === 'REJECTED') return { variant: 'error' as const, icon: XCircleIcon }
  if (status) return { variant: 'warning' as const, icon: ClockIcon }
  return null
}

function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) emit('upload', file)
}
</script>

<template>
  <div
    :class="[
      'relative rounded-2xl border-2 border-dashed p-5 flex flex-col gap-3 transition-colors bg-surface',
      dragOver ? 'border-primary bg-primary-light' : 'border-border',
    ]"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop.prevent="onDrop"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-primary-muted text-primary flex items-center justify-center shrink-0">
          <FileTextIcon class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-text-primary truncate">{{ props.label }}</p>
          <p class="text-[11px] text-text-muted truncate">{{ props.description }}</p>
        </div>
      </div>
      <AppBadge v-if="statusMeta(props.status)" :variant="statusMeta(props.status)!.variant" size="sm">
        {{ props.status }}
      </AppBadge>
    </div>

    <label
      :for="`file-${props.slotId}`"
      class="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl py-6 cursor-pointer hover:bg-surface-2 transition-colors"
    >
      <Loader2Icon v-if="props.uploading" class="w-5 h-5 text-primary animate-spin" />
      <UploadCloudIcon v-else class="w-5 h-5 text-text-muted" />
      <span class="text-xs font-semibold text-text-secondary text-center px-2">
        <template v-if="props.uploading">Uploading…</template>
        <template v-else-if="props.uploadedAt">Uploaded {{ formatDate(props.uploadedAt) }} — click or drop to replace</template>
        <template v-else>Drop file here or click to upload</template>
      </span>
      <input
        :id="`file-${props.slotId}`"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        class="hidden"
        @change="onInputChange"
      />
    </label>

    <p v-if="props.error" class="text-[11px] text-error-text">{{ props.error }}</p>
  </div>
</template>
