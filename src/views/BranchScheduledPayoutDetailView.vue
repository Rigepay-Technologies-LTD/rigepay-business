<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ScheduledPayoutDetailPanel from '@/components/ScheduledPayoutDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; scheduleId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Scheduled payout">
    <ScheduledPayoutDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :schedule-id="props.scheduleId"
      list-route-name="branch-scheduled-payouts"
    />
  </DashboardLayout>
</template>
