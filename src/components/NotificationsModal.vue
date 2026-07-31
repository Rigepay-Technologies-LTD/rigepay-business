<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/ui/AppModal.vue'
import {
  fetchOrgNotifications, markNotificationRead, markAllNotificationsRead,
  fetchBranchNotifications, markBranchNotificationRead, markAllBranchNotificationsRead,
  type OrgNotification,
} from '@/lib/orgApi'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'unread-count', count: number): void
}>()

const router = useRouter()
const auth = useAuthStore()
const isBranchSession = computed(() => auth.meta?.memberType === 'branch_member')

const loading = ref(false)
const notifications = ref<OrgNotification[]>([])
const unreadCount = ref(0)
const selected = ref<OrgNotification | null>(null)

async function load() {
  loading.value = true
  try {
    const data = isBranchSession.value ? await fetchBranchNotifications() : await fetchOrgNotifications()
    notifications.value = data.notifications
    unreadCount.value = data.unread_count
    emit('unread-count', unreadCount.value)
  } catch (err) {
    console.log('An expected error occured', err)
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    selected.value = null
    load()
  }
})

async function openNotification(n: OrgNotification) {
  selected.value = n
  if (!n.read_at) {
    try {
      if (isBranchSession.value) await markBranchNotificationRead(n.id)
      else await markNotificationRead(n.id)
      n.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      emit('unread-count', unreadCount.value)
    } catch {
      console.log('Something went wrong')
    }
  }
}

function goToLink() {
  if (!selected.value?.link) return
  const link = selected.value.link
  emit('update:modelValue', false)
  router.push(link)
}

async function markAllRead() {
  try {
    if (isBranchSession.value) await markAllBranchNotificationsRead()
    else await markAllNotificationsRead()
    notifications.value = notifications.value.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    unreadCount.value = 0
    emit('unread-count', 0)
  } catch {
    console.log('Something went wrong')
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <AppModal :model-value="modelValue" title="Notifications" size="md" @update:model-value="close">
    <template v-if="selected" #header>
      <button type="button" class="flex items-center gap-2 text-sm font-bold text-text-primary" @click="selected = null">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Notification
      </button>
    </template>

    <!-- Detail view -->
    <div v-if="selected" class="flex flex-col gap-3">
      <p class="text-base font-bold text-text-primary">{{ selected.title }}</p>
      <p class="text-[11px] text-text-muted">{{ formatDate(selected.created_at) }}</p>
      <p v-if="selected.body" class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ selected.body }}</p>
      <button
        v-if="selected.link"
        type="button"
        class="self-start mt-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
        @click="goToLink"
      >
        View details
      </button>
    </div>

    <!-- List view -->
    <div v-else class="flex flex-col">
      <div v-if="unreadCount > 0" class="flex justify-end mb-2">
        <button type="button" class="text-xs font-semibold text-primary hover:underline" @click="markAllRead">
          Mark all read
        </button>
      </div>

      <p v-if="loading" class="text-sm text-text-muted py-6 text-center">Loading…</p>
      <p v-else-if="!notifications.length" class="text-sm text-text-muted py-6 text-center">No notifications yet.</p>

      <button
        v-for="n in notifications"
        :key="n.id"
        type="button"
        class="w-full text-left px-3 py-3 rounded-xl border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
        :class="!n.read_at ? 'bg-primary-muted/30' : ''"
        @click="openNotification(n)"
      >
        <div class="flex items-start gap-2">
          <span v-if="!n.read_at" class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-text-primary">{{ n.title }}</p>
            <p v-if="n.body" class="text-xs text-text-muted mt-0.5 line-clamp-2">{{ n.body }}</p>
            <p class="text-[11px] text-text-muted mt-1">{{ formatDate(n.created_at) }}</p>
          </div>
        </div>
      </button>
    </div>
  </AppModal>
</template>
