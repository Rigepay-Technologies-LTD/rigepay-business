<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import InvoiceDetailPanel from '@/components/InvoiceDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; invoiceId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Invoice">
    <InvoiceDetailPanel :org-id="props.orgId" :branch-id="props.branchId" :invoice-id="props.invoiceId" list-route-name="branch-invoices" />
  </DashboardLayout>
</template>
