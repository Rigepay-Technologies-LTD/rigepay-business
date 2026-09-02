<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchOrgSupportTickets, fetchOrgSupportTicket, createOrgSupportTicket, sendOrgSupportMessage,
  fetchOrgSupportContacts,
  type OrgSupportTicket, type OrgSupportContact,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { PlusIcon, LifeBuoyIcon, UserIcon, PhoneIcon, MailIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

const contacts = ref<OrgSupportContact[]>([])
const contactsLoading = ref(true)
async function loadContacts() {
  contactsLoading.value = true
  try {
    contacts.value = (await fetchOrgSupportContacts(true)) ?? []
  } catch {
    // non-critical — ticket list still works without this
  } finally {
    contactsLoading.value = false
  }
}
onMounted(loadContacts)

const loading = ref(true)
const error = ref<string | null>(null)
const tickets = ref<OrgSupportTicket[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    tickets.value = (await fetchOrgSupportTickets(true)) ?? []
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const newSubject = ref('')
const newMessage = ref('')

async function submitCreate() {
  createError.value = null
  if (newSubject.value.trim().length < 5) {
    createError.value = 'Subject must be at least 5 characters.'
    return
  }
  if (newMessage.value.trim().length < 10) {
    createError.value = 'Please describe your issue in at least 10 characters.'
    return
  }
  creating.value = true
  try {
    await createOrgSupportTicket(newSubject.value.trim(), newMessage.value.trim(), true)
    newSubject.value = ''
    newMessage.value = ''
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

const selectedTicket = ref<OrgSupportTicket | null>(null)
const detailLoading = ref(false)
const replyMessage = ref('')
const replySending = ref(false)
const replyError = ref<string | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function openTicket(ticket: OrgSupportTicket) {
  selectedTicket.value = ticket
  await refreshDetail()
  if (pollTimer) clearInterval(pollTimer)
  // Polling-based chat: re-fetch the ticket every 5s while open to pick up
  // new admin replies without a websocket.
  pollTimer = setInterval(refreshDetail, 5000)
}

async function refreshDetail() {
  if (!selectedTicket.value) return
  detailLoading.value = true
  try {
    selectedTicket.value = await fetchOrgSupportTicket(selectedTicket.value.id, true)
  } catch {
    // keep showing the last-known state on a transient poll failure
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  selectedTicket.value = null
  replyMessage.value = ''
  replyError.value = null
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  load()
}

async function submitReply() {
  if (!selectedTicket.value || !replyMessage.value.trim()) return
  replyError.value = null
  replySending.value = true
  try {
    await sendOrgSupportMessage(selectedTicket.value.id, replyMessage.value.trim(), true)
    replyMessage.value = ''
    await refreshDetail()
  } catch (err) {
    const msg = extractErrorMessage(err)
    replyError.value = msg
    showError(msg)
  } finally {
    replySending.value = false
  }
}

function statusClass(status: string) {
  const s = status.toUpperCase()
  if (s === 'OPEN' || s === 'PENDING_ADMIN') return 'bg-warning-light text-warning-text'
  if (s === 'PENDING_MERCHANT' || s === 'PENDING_ORG_MEMBER') return 'bg-primary-muted text-primary'
  if (s === 'RESOLVED' || s === 'CLOSED') return 'bg-success-light text-success-text'
  return 'bg-surface-2 text-text-muted'
}

function senderLabel(senderType: string) {
  if (senderType === 'admin') return 'RigePay Support'
  if (senderType === 'system') return 'System'
  return 'You'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Support">
    <div class="flex flex-col gap-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-text-primary">Support</h1>
          <p class="text-sm text-text-muted mt-0.5">Get help from the RigePay team</p>
        </div>
        <AppButton size="sm" @click="showCreateForm = true">
          <PlusIcon class="w-4 h-4" />
          New ticket
        </AppButton>
      </div>

      <div v-if="!contactsLoading && contacts.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppCard v-for="c in contacts" :key="c.type" padding="md">
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-9 h-9 rounded-full bg-primary-muted text-primary flex items-center justify-center">
              <UserIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-text-muted">{{ c.type }}</p>
              <p class="text-sm font-semibold text-text-primary truncate">{{ c.name }}</p>
              <div class="flex flex-col gap-0.5 mt-1">
                <a v-if="c.phone" :href="`tel:${c.phone}`" class="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors">
                  <PhoneIcon class="w-3 h-3 shrink-0" />{{ c.phone }}
                </a>
                <a v-if="c.email" :href="`mailto:${c.email}`" class="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors truncate">
                  <MailIcon class="w-3 h-3 shrink-0" />{{ c.email }}
                </a>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard v-if="loading" padding="lg">
        <p class="text-sm text-text-muted text-center py-6">Loading…</p>
      </AppCard>

      <AppCard v-else-if="!tickets.length" padding="lg">
        <div class="flex flex-col items-center gap-2 py-8 text-center">
          <LifeBuoyIcon class="w-8 h-8 text-text-muted" />
          <p class="text-sm font-semibold text-text-primary">No support tickets yet</p>
          <p class="text-xs text-text-muted">Open one if you run into an issue — our team typically replies within a few hours.</p>
        </div>
      </AppCard>

      <div v-else class="flex flex-col gap-2">
        <button
          v-for="t in tickets"
          :key="t.id"
          type="button"
          class="w-full text-left"
          @click="openTicket(t)"
        >
          <AppCard padding="md" class="hover:border-primary/40 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary truncate">{{ t.subject }}</p>
                <p class="text-[11px] text-text-muted mt-1">Last activity {{ formatDate(t.last_message_at) }}</p>
              </div>
              <span :class="['shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide', statusClass(t.status)]">
                {{ t.status.replace(/_/g, ' ') }}
              </span>
            </div>
          </AppCard>
        </button>
      </div>
    </div>

    <!-- Create ticket modal -->
    <AppModal v-model="showCreateForm" title="Open a support ticket">
      <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
        <AppInput v-model="newSubject" label="Subject" placeholder="Briefly describe the issue" required />
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Message<span class="text-error ml-0.5">*</span></label>
          <textarea
            v-model="newMessage"
            rows="5"
            placeholder="Give as much detail as you can — what happened, when, and any error messages you saw."
            class="w-full rounded-lg border border-input-border bg-input-bg px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15 transition-all resize-none"
          />
        </div>
        <p v-if="createError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ createError }}</p>
        <AppButton type="submit" :loading="creating" block>Submit ticket</AppButton>
      </form>
    </AppModal>

    <!-- Ticket detail modal (polling-based chat) -->
    <AppModal :model-value="!!selectedTicket" title="" size="lg" @update:model-value="closeDetail">
      <template v-if="selectedTicket" #header>
        <div class="min-w-0">
          <p class="text-sm font-bold text-text-primary truncate">{{ selectedTicket.subject }}</p>
          <span :class="['inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', statusClass(selectedTicket.status)]">
            {{ selectedTicket.status.replace(/_/g, ' ') }}
          </span>
        </div>
      </template>

      <div v-if="selectedTicket" class="flex flex-col gap-3 min-h-[240px]">
        <div
          v-for="m in selectedTicket.messages ?? []"
          :key="m.id"
          class="flex flex-col gap-1"
          :class="m.sender_type === 'admin' || m.sender_type === 'system' ? 'items-start' : 'items-end'"
        >
          <div
            :class="[
              'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
              m.sender_type === 'admin' || m.sender_type === 'system'
                ? 'bg-surface-2 text-text-primary rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm',
            ]"
          >
            <p class="whitespace-pre-wrap">{{ m.body }}</p>
          </div>
          <p class="text-[10px] text-text-muted px-1">{{ senderLabel(m.sender_type) }} · {{ formatDate(m.created_at) }}</p>
        </div>
        <p v-if="detailLoading && !selectedTicket.messages?.length" class="text-sm text-text-muted text-center py-6">Loading…</p>
      </div>

      <template #footer>
        <form class="flex flex-col gap-2" @submit.prevent="submitReply">
          <div class="flex items-end gap-2">
            <textarea
              v-model="replyMessage"
              rows="2"
              placeholder="Type a reply…"
              class="flex-1 rounded-lg border border-input-border bg-input-bg px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15 transition-all resize-none"
            />
            <AppButton type="submit" size="sm" :loading="replySending" :disabled="!replyMessage.trim()">Send</AppButton>
          </div>
        </form>
      </template>
    </AppModal>
  </DashboardLayout>
</template>
