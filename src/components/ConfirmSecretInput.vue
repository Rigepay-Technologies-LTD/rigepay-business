<script setup lang="ts">
import AppInput from '@/components/ui/AppInput.vue'

// The owner-PIN-vs-non-owner-password confirmation field repeated on every
// money-movement form. isPin decides which one renders; the parent still
// owns two separate refs (pin/password) since only one is ever submitted.
defineProps<{ isPin: boolean }>()

const value = defineModel<string>({ required: true })
</script>

<template>
  <AppInput
    v-if="isPin"
    v-model="value"
    type="password"
    label="Transaction PIN"
    placeholder="0000"
    required
  />
  <AppInput
    v-else
    v-model="value"
    type="password"
    label="Confirm your password"
    required
  />
</template>
