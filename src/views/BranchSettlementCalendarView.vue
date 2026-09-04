<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementCalendarPanel from '@/components/settlements/SettlementCalendarPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Settlement calendar">
    <SettlementCalendarPanel :branch-id="props.branchId" />
  </DashboardLayout>
</template>
