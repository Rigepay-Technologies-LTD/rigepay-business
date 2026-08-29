<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import InvoiceSchedulesPanel from '@/components/money/InvoiceSchedulesPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Invoice schedules">
    <InvoiceSchedulesPanel is-branch :branch-id="props.branchId" />
  </DashboardLayout>
</template>
