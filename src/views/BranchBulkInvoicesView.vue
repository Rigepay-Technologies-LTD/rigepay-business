<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import BulkInvoicesPanel from '@/components/money/BulkInvoicesPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Bulk invoices">
    <BulkInvoicesPanel is-branch :branch-id="props.branchId" />
  </DashboardLayout>
</template>
