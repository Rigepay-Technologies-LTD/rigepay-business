<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  createRecipientSuppression, fetchRecipientSuppressions, deleteRecipientSuppression,
  type RecipientSuppression,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { useRecipientHistory } from '@/composables/useRecipientHistory'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { BanIcon } from 'lucide-vue-next'

const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()
const { recipients: recipientHistory, loadRecipientHistory } = useRecipientHistory(true)

const props = defineProps<{ orgId: string; branchId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const suppressions = ref<RecipientSuppression[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    suppressions.value = (await fetchRecipientSuppressions(true)) ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  load()
  loadRecipientHistory()
})

const email = ref('')
const reason = ref('')
const adding = ref(false)
const formError = ref<string | null>(null)

async function submitAdd() {
  formError.value = null
  if (!email.value.trim()) {
    formError.value = 'Email is required.'
    return
  }
  adding.value = true
  try {
    await createRecipientSuppression({ email: email.value.trim(), reason: reason.value.trim() || undefined }, true)
    showSuccess(`${email.value.trim()} will no longer receive invoices from this branch.`)
    email.value = ''
    reason.value = ''
    await load()
  } catch (err) {
    const msg = extractErrorMessage(err)
    formError.value = msg
    showError(msg)
  } finally {
    adding.value = false
  }
}

const removing = ref<string | null>(null)

async function handleRemove(s: RecipientSuppression) {
  const ok = await confirmAction({
    title: 'Allow invoices to this email again?',
    message: `${s.email} will be able to receive invoices from this branch again — including from any bulk batch or recurring schedule that lists them.`,
    confirmLabel: 'Allow again',
    cancelLabel: 'Keep suppressed',
  })
  if (!ok) return
  removing.value = s.id
  try {
    await deleteRecipientSuppression(s.email, true)
    showSuccess(`${s.email} can receive invoices again.`)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    removing.value = null
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Recipient suppressions">
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-sm font-bold text-text-primary">Suppressed recipients</h2>
        <p class="text-xs text-text-muted mt-0.5">
          Emails here are automatically skipped — and never charged — by every bulk invoice batch and recurring
          schedule this branch runs, checked again at the moment each invoice would actually send.
        </p>
      </div>

      <datalist id="invoice-recipient-history">
        <option v-for="r in recipientHistory" :key="r.email" :value="r.email">{{ r.name || r.email }}</option>
      </datalist>

      <AppCard>
        <h3 class="text-sm font-bold text-text-primary mb-3">Stop sending to an email</h3>
        <div v-if="formError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ formError }}</div>
        <form class="flex flex-col sm:flex-row gap-3 items-end" @submit.prevent="submitAdd">
          <AppInput v-model="email" label="Email" placeholder="jane@example.com" class="flex-1" list="invoice-recipient-history" required />
          <AppInput v-model="reason" label="Reason (optional)" placeholder="e.g. requested opt-out" class="flex-1" />
          <AppButton type="submit" :loading="adding">
            <template #icon><BanIcon class="w-4 h-4" /></template>
            Suppress
          </AppButton>
        </form>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
      <AppCard v-else-if="!suppressions.length" padding="lg">
        <div class="flex flex-col items-center text-center gap-2 py-6">
          <p class="text-sm font-semibold text-text-primary">No suppressed recipients</p>
          <p class="text-xs text-text-muted">Every recipient in this branch's bulk batches and schedules currently receives invoices normally.</p>
        </div>
      </AppCard>

      <AppCard v-else padding="none">
        <div class="flex flex-col divide-y divide-border">
          <div v-for="s in suppressions" :key="s.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-text-primary truncate">{{ s.email }}</p>
              <p class="text-xs text-text-muted mt-0.5">
                Suppressed {{ formatDate(s.revoked_at) }}<template v-if="s.reason"> · {{ s.reason }}</template>
              </p>
            </div>
            <AppButton size="sm" variant="ghost" :loading="removing === s.id" @click="handleRemove(s)">Allow again</AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
