<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchOrgNotifications, markNotificationRead, markAllNotificationsRead, type OrgNotification } from '@/lib/orgApi'
import { formatDate } from '@/lib/format'
import { BellIcon } from 'lucide-vue-next'

const router = useRouter()
const open = ref(false)
const loading = ref(false)
const notifications = ref<OrgNotification[]>([])
const unreadCount = ref(0)

async function load() {
  loading.value = true
  try {
    const data = await fetchOrgNotifications()
    notifications.value = data.notifications
    unreadCount.value = data.unread_count
  } catch (err) {
    console.log("An expected error occured", err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function toggle() {
  open.value = !open.value
  if (open.value) await load()
}

async function openNotification(n: OrgNotification) {
  if (!n.read_at) {
    try {
      await markNotificationRead(n.id)
      n.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      console.log("Something went wrong")
    }
  }
  open.value = false
  if (n.link) router.push(n.link)
}

async function markAllRead() {
  try {
    await markAllNotificationsRead()
    notifications.value = notifications.value.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    unreadCount.value = 0
  } catch {
    console.log("Something went wrong")
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
      aria-label="Notifications"
      @click="toggle"
    >
      <BellIcon class="w-5 h-5" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div v-if="open" class="fixed inset-0 z-10" @click="open = false" />

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface rounded-2xl shadow-lg border border-border z-20"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <p class="text-sm font-bold text-text-primary">Notifications</p>
        <button v-if="unreadCount > 0" type="button" class="text-xs font-semibold text-primary hover:underline" @click="markAllRead">
          Mark all read
        </button>
      </div>

      <p v-if="loading" class="text-sm text-text-muted px-4 py-6 text-center">Loading…</p>
      <p v-else-if="!notifications.length" class="text-sm text-text-muted px-4 py-6 text-center">No notifications yet.</p>
      <button
        v-for="n in notifications"
        :key="n.id"
        type="button"
        class="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
        :class="!n.read_at ? 'bg-primary-muted/30' : ''"
        @click="openNotification(n)"
      >
        <div class="flex items-start gap-2">
          <span v-if="!n.read_at" class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-text-primary">{{ n.title }}</p>
            <p v-if="n.body" class="text-xs text-text-muted mt-0.5">{{ n.body }}</p>
            <p class="text-[11px] text-text-muted mt-1">{{ formatDate(n.created_at) }}</p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
