<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchStatementSchedules, createStatementSchedule, updateStatementSchedule, deleteStatementSchedule,
  type OrgStatementSchedule,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarClockIcon, Trash2Icon } from 'lucide-vue-next'

const props = defineProps<{ branches: { id: string; name: string }[] }>()

const { showError, showSuccess } = useResponseModal()
const schedules = ref<OrgStatementSchedule[]>([])
const loading = ref(true)
const showCreate = ref(false)
const saving = ref(false)

const form = ref({ scope: 'org' as 'org' | 'consolidated' | 'branch', branch_id: '', recipient_email: '', day_of_month: 1 })

const scopeOptions = [
  { value: 'org', label: 'Organization only' },
  { value: 'consolidated', label: 'Consolidated (org + branches)' },
  { value: 'branch', label: 'A specific branch' },
]

async function load() {
  loading.value = true
  try {
    schedules.value = (await fetchStatementSchedules()) ?? []
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.recipient_email.trim()) {
    showError('Enter a recipient email.')
    return
  }
  if (form.value.scope === 'branch' && !form.value.branch_id) {
    showError('Pick a branch.')
    return
  }
  saving.value = true
  try {
    await createStatementSchedule({
      scope: form.value.scope,
      branch_id: form.value.scope === 'branch' ? form.value.branch_id : undefined,
      recipient_email: form.value.recipient_email.trim(),
      day_of_month: form.value.day_of_month,
    })
    showSuccess('Scheduled statement created. The first email goes out on the next run.')
    showCreate.value = false
    form.value = { scope: 'org', branch_id: '', recipient_email: '', day_of_month: 1 }
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    saving.value = false
  }
}

async function toggleActive(s: OrgStatementSchedule) {
  try {
    await updateStatementSchedule(s.id, { active: !s.active })
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

async function remove(s: OrgStatementSchedule) {
  try {
    await deleteStatementSchedule(s.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

function branchName(id?: string | null) {
  return props.branches.find((b) => b.id === id)?.name ?? 'Branch'
}

onMounted(load)
</script>

<template>
  <AppCard padding="none">
    <div class="flex items-center justify-between px-5 pt-5">
      <div class="flex items-center gap-2">
        <CalendarClockIcon class="w-4 h-4 text-text-muted" />
        <h2 class="text-sm font-bold text-text-primary">Scheduled statements</h2>
      </div>
      <AppButton size="sm" @click="showCreate = true">Schedule delivery</AppButton>
    </div>
    <p class="text-xs text-text-muted px-5 mt-1 mb-3">Email a CSV statement for the previous month to a recipient every month.</p>

    <p v-if="loading" class="text-sm text-text-muted px-5 pb-5">Loading…</p>
    <p v-else-if="!schedules.length" class="text-sm text-text-muted px-5 pb-5">No scheduled statements yet.</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-y border-border">
            <th class="px-5 py-2">Recipient</th><th class="px-5 py-2">Scope</th><th class="px-5 py-2">Day</th>
            <th class="px-5 py-2">Next run</th><th class="px-5 py-2">Status</th><th class="px-5 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in schedules" :key="s.id" class="border-b border-border last:border-0">
            <td class="px-5 py-2.5 text-text-primary">{{ s.recipient_email }}</td>
            <td class="px-5 py-2.5 text-text-secondary">{{ s.scope === 'branch' ? branchName(s.branch_id) : s.scope }}</td>
            <td class="px-5 py-2.5 text-text-secondary">{{ s.day_of_month }}</td>
            <td class="px-5 py-2.5 text-text-muted">{{ new Date(s.next_run_at).toLocaleDateString() }}</td>
            <td class="px-5 py-2.5">
              <button class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="s.active ? 'bg-success-muted text-success' : 'bg-surface-2 text-text-muted'"
                @click="toggleActive(s)">
                {{ s.active ? 'Active' : 'Paused' }}
              </button>
            </td>
            <td class="px-5 py-2.5 text-right">
              <button class="text-text-muted hover:text-error" @click="remove(s)"><Trash2Icon class="w-4 h-4" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal v-model="showCreate" title="Schedule statement delivery" size="md">
      <div class="flex flex-col gap-4">
        <AppSelect v-model="form.scope" label="Statement scope" :options="scopeOptions" />
        <AppSelect
          v-if="form.scope === 'branch'"
          v-model="form.branch_id"
          label="Branch"
          :options="[{ value: '', label: 'Select a branch' }, ...props.branches.map((b) => ({ value: b.id, label: b.name }))]"
        />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Recipient email</label>
          <input v-model="form.recipient_email" type="email" placeholder="finance@company.co.ke"
            class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Day of month (1–28)</label>
          <input v-model.number="form.day_of_month" type="number" min="1" max="28"
            class="h-10 w-28 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showCreate = false">Cancel</AppButton>
        <AppButton :loading="saving" @click="submit">Create schedule</AppButton>
      </template>
    </AppModal>
  </AppCard>
</template>
