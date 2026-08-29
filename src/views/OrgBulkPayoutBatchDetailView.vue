<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import BulkPayoutBatchDetailPanel from '@/components/BulkPayoutBatchDetailPanel.vue'

const props = defineProps<{ orgId: string; batchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Bulk payout batch">
    <BulkPayoutBatchDetailPanel :org-id="props.orgId" :batch-id="props.batchId" list-route-name="org-bulk-payouts" />
  </DashboardLayout>
</template>
