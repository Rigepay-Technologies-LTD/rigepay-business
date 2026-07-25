<script setup lang="ts">
import { formatMoney } from '@/lib/format'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'

// The SMS-OTP confirmation step shared by every money-movement flow
// (payouts, petty cash payouts, transfers) — request an action, get an
// otp_required response, land here, submit the code, done.
const props = defineProps<{
  subject: string // e.g. "payout", "transfer" — used in copy and the button label
  feeCents?: number
  confirming: boolean
  error: string | null
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const otp = defineModel<string>({ required: true })
</script>

<template>
  <AppCard>
    <h2 class="text-sm font-bold text-text-primary mb-1">Enter confirmation code</h2>
    <p class="text-xs text-text-muted mb-4">
      We sent a 6-digit code by SMS to confirm this {{ subject }}<span v-if="feeCents !== undefined">
        (fee: KES {{ formatMoney(feeCents) }})</span>. Enter it below to proceed.
    </p>
    <div v-if="error" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ error }}</div>
    <form class="flex flex-col gap-4 max-w-xs" @submit.prevent="emit('confirm')">
      <AppInput v-model="otp" label="6-digit code" placeholder="000000" maxlength="6" required autofocus />
      <div class="flex gap-2">
        <AppButton type="submit" :loading="props.confirming" class="self-start">Confirm {{ subject }}</AppButton>
        <AppButton type="button" variant="secondary" :disabled="props.confirming" class="self-start" @click="emit('cancel')">Cancel</AppButton>
      </div>
    </form>
  </AppCard>
</template>
