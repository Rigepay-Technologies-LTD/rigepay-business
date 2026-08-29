<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PayoutDetailPanel from '@/components/PayoutDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; payoutId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Payout">
    <PayoutDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :payout-id="props.payoutId"
      list-route-name="branch-payouts"
    />
  </DashboardLayout>
</template>
