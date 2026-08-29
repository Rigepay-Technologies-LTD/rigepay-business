<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createTag, fetchTags, deleteTag, fetchTagBreakdown, type OrgTag, type TagBreakdown } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, TagIcon, Trash2Icon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; isBranch?: boolean; branchId?: string }>()
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const branch = computed(() => !!props.isBranch)

const loading = ref(true)
const tags = ref<OrgTag[]>([])
const breakdown = ref<TagBreakdown | null>(null)

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
const fromDate = ref(monthAgo)
const toDate = ref(today)

async function load() {
  loading.value = true
  try {
    const [t, b] = await Promise.all([
      fetchTags(branch.value),
      fetchTagBreakdown({ from: fromDate.value, to: toDate.value }, branch.value),
    ])
    tags.value = t
    breakdown.value = b
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function reloadBreakdown() {
  try {
    breakdown.value = await fetchTagBreakdown({ from: fromDate.value, to: toDate.value }, branch.value)
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

const showCreate = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newTagName = ref('')
const newTagColor = ref('#4F46E5')

function openCreate() {
  newTagName.value = ''
  newTagColor.value = '#4F46E5'
  createError.value = null
  showCreate.value = true
}

async function submitCreate() {
  createError.value = null
  if (!newTagName.value.trim()) { createError.value = 'Tag name is required.'; return }
  creating.value = true
  try {
    await createTag(newTagName.value.trim(), newTagColor.value, branch.value)
    showCreate.value = false
    showSuccess('Tag created.')
    await load()
  } catch (err) {
    createError.value = extractErrorMessage(err)
    showError(createError.value)
  } finally {
    creating.value = false
  }
}

const deletingId = ref<string | null>(null)
async function handleDelete(tag: OrgTag) {
  const ok = await confirmAction({
    title: 'Delete this tag?',
    message: `"${tag.name}" will be deleted and removed from everything it's applied to.`,
    confirmLabel: 'Delete tag',
    cancelLabel: 'Keep it',
    danger: true,
  })
  if (!ok) return
  deletingId.value = tag.id
  try {
    await deleteTag(tag.id, branch.value)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    deletingId.value = null
  }
}

const totalCents = computed(() => {
  if (!breakdown.value) return 0
  return breakdown.value.tags.reduce((s, r) => s + r.total_cents, 0) + breakdown.value.untagged.total_cents
})
const sortedRows = computed(() => [...(breakdown.value?.tags ?? [])].sort((a, b) => b.total_cents - a.total_cents))
function usageFor(tagId: string) {
  return breakdown.value?.tags.find((r) => r.tag_id === tagId)?.count ?? 0
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Tags">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Bookkeeping</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Tags</h1>
          <p class="text-sm text-text-muted mt-0.5">
            Label payouts, expenses and any transaction to see where money is really going.
          </p>
        </div>
        <AppButton size="sm" @click="openCreate">
          <template #icon><PlusIcon class="w-4 h-4" /></template>
          New tag
        </AppButton>
      </div>

      <AppCard padding="none">
        <div class="px-5 py-4 border-b border-border">
          <h2 class="text-sm font-bold text-text-primary">Your tags</h2>
        </div>
        <p v-if="loading" class="text-sm text-text-muted px-5 py-8">Loading…</p>
        <div v-else-if="!tags.length" class="flex flex-col items-center text-center gap-2 py-12">
          <TagIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No tags yet</p>
          <p class="text-xs text-text-muted">Create one, then apply it from any transaction, payout or expense.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Tag</th>
                <th class="px-5 py-3 text-right">Uses ({{ fromDate }} → {{ toDate }})</th>
                <th class="px-5 py-3 text-right">Value</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tag in tags" :key="tag.id" class="border-b border-border last:border-0 hover:bg-surface-2/60">
                <td class="px-5 py-3">
                  <span class="inline-flex items-center gap-2 font-medium text-text-primary">
                    <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: tag.color || '#9CA3AF' }" />
                    {{ tag.name }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right text-text-secondary">{{ usageFor(tag.id) }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary">
                  KES {{ formatMoney(breakdown?.tags.find(r => r.tag_id === tag.id)?.total_cents ?? 0) }}
                </td>
                <td class="px-5 py-3 text-right">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-light transition-colors disabled:opacity-50"
                    :disabled="deletingId === tag.id" @click="handleDelete(tag)"
                  ><Trash2Icon class="w-4 h-4" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-sm font-bold text-text-primary">Spend breakdown</h2>
          <div class="flex items-center gap-2">
            <input v-model="fromDate" type="date" class="h-9 rounded-lg border border-input-border bg-input-bg px-2 text-xs" @change="reloadBreakdown" />
            <span class="text-xs text-text-muted">to</span>
            <input v-model="toDate" type="date" class="h-9 rounded-lg border border-input-border bg-input-bg px-2 text-xs" @change="reloadBreakdown" />
          </div>
        </div>

        <div v-if="!breakdown || (!breakdown.tags.length && !breakdown.untagged.total_cents)" class="flex flex-col items-center text-center gap-2 py-8">
          <TagIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No tagged activity in this range</p>
        </div>
        <div v-else class="flex flex-col gap-3">
          <div v-for="row in sortedRows" :key="row.tag_id" class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-sm">
              <span class="inline-flex items-center gap-2 font-medium text-text-primary">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: row.tag_color || '#9CA3AF' }" />
                {{ row.tag_name }}
                <span class="text-xs text-text-muted">({{ row.count }})</span>
              </span>
              <span class="font-semibold text-text-primary">KES {{ formatMoney(row.total_cents) }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: `${totalCents ? (row.total_cents / totalCents) * 100 : 0}%`, backgroundColor: row.tag_color || '#9CA3AF' }" />
            </div>
          </div>
          <div v-if="breakdown.untagged.total_cents > 0" class="flex flex-col gap-1 pt-2 border-t border-border">
            <div class="flex items-center justify-between text-sm">
              <span class="inline-flex items-center gap-2 font-medium text-text-muted">
                <span class="w-2 h-2 rounded-full bg-text-muted/40" /> Untagged
                <span class="text-xs text-text-muted">({{ breakdown.untagged.count }})</span>
              </span>
              <span class="font-semibold text-text-muted">KES {{ formatMoney(breakdown.untagged.total_cents) }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full bg-text-muted/40" :style="{ width: `${totalCents ? (breakdown.untagged.total_cents / totalCents) * 100 : 0}%` }" />
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showCreate" title="New tag" size="sm">
      <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
        <div v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</div>
        <AppInput v-model="newTagName" label="Name" placeholder="e.g. Marketing" required />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Colour</label>
          <input v-model="newTagColor" type="color" class="h-10 w-16 rounded-lg border border-input-border" />
        </div>
        <div class="flex gap-2">
          <AppButton type="submit" :loading="creating">Create tag</AppButton>
          <AppButton type="button" variant="ghost" @click="showCreate = false">Cancel</AppButton>
        </div>
      </form>
    </AppModal>
  </DashboardLayout>
</template>
