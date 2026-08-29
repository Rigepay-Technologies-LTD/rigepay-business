<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import BulkPayoutBatchDetailPanel from '@/components/BulkPayoutBatchDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; batchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Bulk payout batch">
    <BulkPayoutBatchDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :batch-id="props.batchId"
      list-route-name="branch-bulk-payouts"
    />
  </DashboardLayout>
</template>
