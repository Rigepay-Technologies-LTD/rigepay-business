<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import BulkInvoicesPanel from '@/components/money/BulkInvoicesPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Bulk invoices">
    <BulkInvoicesPanel />
  </DashboardLayout>
</template>
