<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createTag, fetchTags, deleteTag, fetchTagBreakdown, type OrgTag, type TagBreakdown } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { PlusIcon, TagIcon, TrashIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

const loading = ref(true)
const error = ref<string | null>(null)
const tags = ref<OrgTag[]>([])
const breakdown = ref<TagBreakdown | null>(null)

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
const fromDate = ref(monthAgo)
const toDate = ref(today)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [t, b] = await Promise.all([
      fetchTags(true),
      fetchTagBreakdown({ from: fromDate.value, to: toDate.value }, true),
    ])
    tags.value = t
    breakdown.value = b
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function reloadBreakdown() {
  try {
    breakdown.value = await fetchTagBreakdown({ from: fromDate.value, to: toDate.value }, true)
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  }
}

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newTagName = ref('')
const newTagColor = ref('#4F46E5')

async function submitCreate() {
  createError.value = null
  if (!newTagName.value.trim()) {
    createError.value = 'Tag name is required.'
    return
  }
  creating.value = true
  try {
    await createTag(newTagName.value.trim(), newTagColor.value, true)
    newTagName.value = ''
    showCreateForm.value = false
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    createError.value = msg
    showError(msg)
  } finally {
    creating.value = false
  }
}

const deletingId = ref<string | null>(null)
async function handleDelete(tag: OrgTag) {
  if (!confirm(`Delete the "${tag.name}" tag? Existing assignments will be removed.`)) return
  deletingId.value = tag.id
  try {
    await deleteTag(tag.id, true)
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    deletingId.value = null
  }
}

const totalSpendCents = () => {
  if (!breakdown.value) return 0
  return breakdown.value.tags.reduce((sum, r) => sum + r.total_cents, 0) + breakdown.value.untagged.total_cents
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Tags & spend breakdown">
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Tags & spend breakdown</h2>
          <p class="text-xs text-text-muted mt-0.5">Categorize this branch's payouts and expenses to see what it's actually spending on.</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = !showCreateForm">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New tag
        </AppButton>
      </div>

      <AppCard v-if="showCreateForm">
        <h3 class="text-sm font-bold text-text-primary mb-3">New tag</h3>
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ createError }}</div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="submitCreate">
          <AppInput v-model="newTagName" label="Name" placeholder="e.g. Marketing" required />
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Color</label>
            <input v-model="newTagColor" type="color" class="h-10 w-16 rounded-lg border border-input-border" />
          </div>
          <div class="flex gap-2">
            <AppButton type="submit" :loading="creating">Create tag</AppButton>
            <AppButton type="button" variant="ghost" @click="showCreateForm = false">Cancel</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard>
        <h3 class="text-sm font-bold text-text-primary mb-3">Branch tags</h3>
        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <p v-else-if="!tags.length" class="text-sm text-text-muted">No tags yet — create one to start categorizing spend.</p>
        <div v-else class="flex flex-wrap gap-2">
          <div
            v-for="tag in tags" :key="tag.id"
            class="flex items-center gap-2 rounded-full border border-border pl-3 pr-1.5 py-1"
          >
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color || '#9CA3AF' }" />
            <span class="text-xs font-semibold text-text-primary">{{ tag.name }}</span>
            <button
              type="button" class="p-1 rounded-full text-text-muted hover:text-error-text hover:bg-error-light transition-colors disabled:opacity-50"
              :disabled="deletingId === tag.id" @click="handleDelete(tag)"
            ><TrashIcon class="w-3 h-3" /></button>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-text-primary">Spend breakdown</h3>
          <div class="flex items-center gap-2">
            <input v-model="fromDate" type="date" class="h-9 rounded-lg border border-input-border bg-input-bg px-2 text-xs" @change="reloadBreakdown" />
            <span class="text-xs text-text-muted">to</span>
            <input v-model="toDate" type="date" class="h-9 rounded-lg border border-input-border bg-input-bg px-2 text-xs" @change="reloadBreakdown" />
          </div>
        </div>

        <div v-if="!breakdown || (!breakdown.tags.length && !breakdown.untagged.total_cents)" class="flex flex-col items-center text-center gap-2 py-6">
          <TagIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No spend in this range</p>
        </div>
        <div v-else class="flex flex-col gap-3">
          <div v-for="row in breakdown.tags" :key="row.tag_id" class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 font-medium text-text-primary">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: row.tag_color || '#9CA3AF' }" />
                {{ row.tag_name }}
                <span class="text-xs text-text-muted">({{ row.count }})</span>
              </span>
              <span class="font-semibold text-text-primary">KES {{ formatMoney(row.total_cents) }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{ width: `${totalSpendCents() ? (row.total_cents / totalSpendCents()) * 100 : 0}%`, backgroundColor: row.tag_color || '#9CA3AF' }"
              />
            </div>
          </div>

          <div v-if="breakdown.untagged.total_cents > 0" class="flex flex-col gap-1 pt-2 border-t border-border">
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 font-medium text-text-muted">
                <span class="w-2 h-2 rounded-full bg-border" />
                Untagged
                <span class="text-xs text-text-muted">({{ breakdown.untagged.count }})</span>
              </span>
              <span class="font-semibold text-text-muted">KES {{ formatMoney(breakdown.untagged.total_cents) }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                class="h-full rounded-full bg-text-muted/40"
                :style="{ width: `${totalSpendCents() ? (breakdown.untagged.total_cents / totalSpendCents()) * 100 : 0}%` }"
              />
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
