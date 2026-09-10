<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { getStkPushStatus } from '@/lib/orgApi'
import { formatMoney } from '@/lib/format'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { CheckCircle2Icon, XCircleIcon, SmartphoneIcon } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  isBranch: boolean
  checkoutRequestId: string | null
  amountCents?: number
  customerPhone?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'completed'): void
}>()

const POLL_MS = 3000
const TIMEOUT_MS = 120_000

type Phase = 'pending' | 'completed' | 'failed' | 'timeout'
const phase = ref<Phase>('pending')
const failureReason = ref('')
const resolvedAmount = ref<number | undefined>(undefined)

let timer: ReturnType<typeof setTimeout> | null = null
let deadline = 0

function stop() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

async function poll() {
  if (!props.checkoutRequestId) return
  try {
    const s = await getStkPushStatus(props.isBranch, props.checkoutRequestId)
    const st = (s.status || '').toUpperCase()
    if (st === 'COMPLETED' || st === 'PAID') {
      phase.value = 'completed'
      resolvedAmount.value = s.amount_cents || props.amountCents
      stop()
      emit('completed')
      return
    }
    if (st === 'FAILED' || st === 'CANCELLED' || st === 'EXPIRED') {
      phase.value = 'failed'
      failureReason.value = s.failure_reason || 'The customer did not complete the payment.'
      stop()
      return
    }
  } catch {
    // transient — keep polling until the deadline
  }
  if (Date.now() >= deadline) {
    phase.value = 'timeout'
    stop()
    return
  }
  timer = setTimeout(poll, POLL_MS)
}

function start() {
  stop()
  phase.value = 'pending'
  failureReason.value = ''
  resolvedAmount.value = props.amountCents
  deadline = Date.now() + TIMEOUT_MS
  timer = setTimeout(poll, POLL_MS)
}

watch(
  () => [props.modelValue, props.checkoutRequestId] as const,
  ([open, id]) => {
    if (open && id) start()
    else stop()
  },
  { immediate: true },
)

onBeforeUnmount(stop)

function close() {
  stop()
  emit('update:modelValue', false)
}
</script>

<template>
  <AppModal :model-value="modelValue" title="Payment request" size="sm" @update:model-value="close">
    <div class="flex flex-col items-center gap-4 py-2 text-center">
      <template v-if="phase === 'pending'">
        <div class="relative">
          <SmartphoneIcon class="w-10 h-10 text-primary" />
          <span class="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-primary animate-ping" />
        </div>
        <div>
          <p class="text-sm font-semibold text-text-primary">Waiting for the customer…</p>
          <p class="text-xs text-text-muted mt-1">
            An STK prompt was sent<span v-if="customerPhone"> to {{ customerPhone }}</span>. Ask them to enter their
            M-Pesa PIN. This closes automatically once they pay.
          </p>
        </div>
      </template>

      <template v-else-if="phase === 'completed'">
        <CheckCircle2Icon class="w-10 h-10 text-success" />
        <div>
          <p class="text-sm font-semibold text-success-text">Payment received</p>
          <p class="text-xs text-text-muted mt-1">
            KES {{ formatMoney(resolvedAmount) }} has been collected into your wallet.
          </p>
        </div>
        <AppButton size="sm" @click="close">Done</AppButton>
      </template>

      <template v-else-if="phase === 'failed'">
        <XCircleIcon class="w-10 h-10 text-error" />
        <div>
          <p class="text-sm font-semibold text-error-text">Payment not completed</p>
          <p class="text-xs text-text-muted mt-1">{{ failureReason }}</p>
        </div>
        <AppButton size="sm" variant="secondary" @click="close">Close</AppButton>
      </template>

      <template v-else>
        <SmartphoneIcon class="w-10 h-10 text-text-muted" />
        <div>
          <p class="text-sm font-semibold text-text-primary">Still pending</p>
          <p class="text-xs text-text-muted mt-1">
            The customer hasn't responded yet. It will show up in Activity once they pay — no need to resend.
          </p>
        </div>
        <AppButton size="sm" variant="secondary" @click="close">Close</AppButton>
      </template>
    </div>
  </AppModal>
</template>
