<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import InvoiceSchedulesPanel from '@/components/money/InvoiceSchedulesPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Invoice schedules">
    <InvoiceSchedulesPanel />
  </DashboardLayout>
</template>
