<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { refreshSession } from '@/lib/sessionRefresh'
import AppButton from '@/components/ui/AppButton.vue'

// Warn this long before the access token actually expires, and give the
// user this long to respond before auto-logout.
const WARNING_WINDOW_SECONDS = 90

const auth = useAuthStore()
const router = useRouter()

const showWarning = ref(false)
const secondsLeft = ref(WARNING_WINDOW_SECONDS)
const continuing = ref(false)
let tickHandle: ReturnType<typeof setInterval> | null = null

const countdownLabel = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function forceLogout() {
  showWarning.value = false
  auth.logout()
  router.push({ name: 'login' })
}

async function continueSession() {
  continuing.value = true
  const ok = await refreshSession()
  continuing.value = false
  if (ok) {
    showWarning.value = false
  } else {
    forceLogout()
  }
}

function tick() {
  if (!auth.isAuthenticated || !auth.expiresAt) {
    showWarning.value = false
    return
  }
  const remainingMs = auth.expiresAt - Date.now()
  const remainingSeconds = Math.ceil(remainingMs / 1000)

  if (remainingSeconds <= 0) {
    forceLogout()
    return
  }
  if (remainingSeconds <= WARNING_WINDOW_SECONDS) {
    showWarning.value = true
    secondsLeft.value = remainingSeconds
  } else {
    showWarning.value = false
  }
}

onMounted(() => {
  tick()
  tickHandle = setInterval(tick, 1000)
})
onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showWarning"
      class="fixed inset-0 z-[9900] flex items-center justify-center p-4"
      style="background: var(--color-overlay); backdrop-filter: blur(4px);"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <h2 class="text-base font-bold text-text-primary">Still there?</h2>
        <p class="text-sm text-text-secondary">
          Your session is about to expire due to inactivity. You'll be logged out in
          <span class="font-mono font-bold text-text-primary">{{ countdownLabel }}</span>
          unless you continue.
        </p>
        <div class="flex gap-2">
          <AppButton :loading="continuing" class="flex-1" @click="continueSession">Continue session</AppButton>
          <AppButton variant="secondary" class="flex-1" @click="forceLogout">Log out</AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
