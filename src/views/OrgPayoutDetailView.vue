<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PayoutDetailPanel from '@/components/PayoutDetailPanel.vue'

const props = defineProps<{ orgId: string; payoutId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payout">
    <PayoutDetailPanel :org-id="props.orgId" :payout-id="props.payoutId" list-route-name="org-payouts" />
  </DashboardLayout>
</template>
