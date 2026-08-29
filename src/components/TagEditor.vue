<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchTags, fetchTagsForSubject, assignTag, unassignTag, createTag,
  type OrgTag, type TagSubjectType,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { TagIcon, XIcon, PlusIcon } from 'lucide-vue-next'

const props = defineProps<{
  subjectType: TagSubjectType
  subjectId: string
  isBranch?: boolean
  compact?: boolean
}>()

const { showError } = useResponseModal()

const allTags = ref<OrgTag[]>([])
const assigned = ref<OrgTag[]>([])
const loading = ref(true)
const picking = ref('')
const busy = ref(false)
const creating = ref(false)
const newName = ref('')
const newColor = ref('#4F46E5')
const showNew = ref(false)

const available = computed(() => allTags.value.filter((t) => !assigned.value.some((a) => a.id === t.id)))

async function load() {
  loading.value = true
  try {
    const [tags, mine] = await Promise.all([
      fetchTags(props.isBranch),
      fetchTagsForSubject(props.subjectType, props.subjectId, props.isBranch),
    ])
    allTags.value = tags
    assigned.value = mine
  } catch {
    assigned.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function add() {
  if (!picking.value) return
  busy.value = true
  try {
    await assignTag(picking.value, props.subjectType, props.subjectId, props.isBranch)
    assigned.value = await fetchTagsForSubject(props.subjectType, props.subjectId, props.isBranch)
    picking.value = ''
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    busy.value = false
  }
}

async function remove(tag: OrgTag) {
  try {
    await unassignTag(tag.id, props.subjectType, props.subjectId, props.isBranch)
    assigned.value = assigned.value.filter((t) => t.id !== tag.id)
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

async function createAndAssign() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const tag = await createTag(newName.value.trim(), newColor.value, props.isBranch)
    allTags.value = [...allTags.value, tag].sort((a, b) => a.name.localeCompare(b.name))
    await assignTag(tag.id, props.subjectType, props.subjectId, props.isBranch)
    assigned.value = await fetchTagsForSubject(props.subjectType, props.subjectId, props.isBranch)
    newName.value = ''
    showNew.value = false
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="!compact" class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
      <TagIcon class="w-3.5 h-3.5" /> Tags
    </div>

    <p v-if="loading" class="text-xs text-text-muted">Loading tags…</p>

    <template v-else>
      <div class="flex flex-wrap gap-1.5">
        <span v-if="!assigned.length" class="text-xs text-text-muted">No tags yet</span>
        <span
          v-for="tag in assigned" :key="tag.id"
          class="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-xs font-semibold"
          :style="{ backgroundColor: (tag.color || '#9CA3AF') + '22', color: tag.color || '#6B7280' }"
        >
          {{ tag.name }}
          <button type="button" class="rounded-full p-0.5 hover:opacity-70" @click="remove(tag)"><XIcon class="w-3 h-3" /></button>
        </span>
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <AppSelect
          v-if="available.length"
          v-model="picking"
          class="w-48"
          :options="[{ value: '', label: 'Add a tag…' }, ...available.map(t => ({ value: t.id, label: t.name }))]"
        />
        <AppButton v-if="available.length" size="sm" variant="secondary" :loading="busy" :disabled="!picking" @click="add">Add</AppButton>
        <AppButton size="sm" variant="ghost" @click="showNew = !showNew">
          <template #icon><PlusIcon class="w-3.5 h-3.5" /></template>
          New tag
        </AppButton>
      </div>

      <div v-if="showNew" class="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-2/40 p-3">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-medium text-text-secondary">Name</label>
          <input v-model="newName" placeholder="e.g. Marketing" class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm outline-none focus:border-input-border-focused" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-medium text-text-secondary">Colour</label>
          <input v-model="newColor" type="color" class="h-9 w-12 rounded-lg border border-input-border" />
        </div>
        <AppButton size="sm" :loading="creating" @click="createAndAssign">Create &amp; apply</AppButton>
      </div>
    </template>
  </div>
</template>
