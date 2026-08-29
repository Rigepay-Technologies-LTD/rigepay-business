<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ScheduledPayoutDetailPanel from '@/components/ScheduledPayoutDetailPanel.vue'

const props = defineProps<{ orgId: string; scheduleId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Scheduled payout">
    <ScheduledPayoutDetailPanel :org-id="props.orgId" :schedule-id="props.scheduleId" list-route-name="org-scheduled-payouts" />
  </DashboardLayout>
</template>
