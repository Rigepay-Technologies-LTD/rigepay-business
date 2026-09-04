<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useResponseModal } from '@/composables/useResponseModal'
import { extractErrorMessage } from '@/lib/errors'
import {
  fetchOrgVerificationRequests,
  supplyOrgVerificationInfo,
  type VerificationInfoRequest,
} from '@/lib/orgApi'

const { showError, showSuccess } = useResponseModal()

const requests = ref<VerificationInfoRequest[]>([])
const active = ref<VerificationInfoRequest | null>(null)
const note = ref('')
const submitting = ref(false)

async function load() {
  try {
    requests.value = await fetchOrgVerificationRequests()
  } catch {
    requests.value = []
  }
}

function open(r: VerificationInfoRequest) {
  active.value = r
  note.value = ''
}

async function submit() {
  if (!active.value || !note.value.trim()) return
  submitting.value = true
  try {
    await supplyOrgVerificationInfo(active.value.id, note.value.trim())
    requests.value = requests.value.filter((r) => r.id !== active.value!.id)
    active.value = null
    note.value = ''
    showSuccess('Our team will review it and continue your verification.', 'Response sent')
  } catch (e) {
    showError(extractErrorMessage(e))
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div
    v-if="requests.length"
    class="rounded-xl border border-warning bg-warning-light p-4"
  >
    <p class="text-sm font-bold text-warning-text">
      {{ requests.length === 1 ? 'We need more information' : `${requests.length} items need your attention` }}
    </p>
    <div
      v-for="r in requests"
      :key="r.id"
      class="mt-2 border-t border-warning/40 pt-2 first:mt-1 first:border-t-0 first:pt-0"
    >
      <p class="text-sm text-warning-text">{{ r.message }}</p>
      <AppButton size="sm" class="mt-2" @click="open(r)">Respond</AppButton>
    </div>

    <AppModal
      :model-value="!!active"
      title="Respond to reviewer"
      size="sm"
      @update:model-value="(v) => { if (!v && !submitting) active = null }"
    >
      <p class="text-xs text-text-muted">{{ active?.message }}</p>
      <textarea
        v-model="note"
        rows="4"
        maxlength="2000"
        placeholder="Type your response…"
        class="mt-3 w-full rounded-lg border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:border-primary"
      />
      <div class="mt-4 flex justify-end gap-2">
        <AppButton variant="ghost" :disabled="submitting" @click="active = null">Cancel</AppButton>
        <AppButton :loading="submitting" :disabled="!note.trim()" @click="submit">Send</AppButton>
      </div>
    </AppModal>
  </div>
</template>
