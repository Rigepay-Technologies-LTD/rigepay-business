<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementCalendarPanel from '@/components/settlements/SettlementCalendarPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Settlement calendar">
    <SettlementCalendarPanel />
  </DashboardLayout>
</template>
