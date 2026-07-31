<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgNotifications, fetchBranchNotifications } from '@/lib/orgApi'
import { useAuthStore } from '@/stores/auth'
import { BellIcon } from 'lucide-vue-next'
import NotificationsModal from '@/components/NotificationsModal.vue'

const auth = useAuthStore()
const isBranchSession = computed(() => auth.meta?.memberType === 'branch_member')

const open = ref(false)
const unreadCount = ref(0)

async function loadUnreadCount() {
  try {
    const data = isBranchSession.value ? await fetchBranchNotifications() : await fetchOrgNotifications()
    unreadCount.value = data.unread_count
  } catch (err) {
    console.log('An expected error occured', err)
  }
}
onMounted(loadUnreadCount)
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
      aria-label="Notifications"
      @click="open = true"
    >
      <BellIcon class="w-5 h-5" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <NotificationsModal v-model="open" @unread-count="(c) => (unreadCount = c)" />
  </div>
</template>
