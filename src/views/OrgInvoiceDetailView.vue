<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import InvoiceDetailPanel from '@/components/InvoiceDetailPanel.vue'

const props = defineProps<{ orgId: string; invoiceId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Invoice">
    <InvoiceDetailPanel :org-id="props.orgId" :invoice-id="props.invoiceId" list-route-name="org-invoices" />
  </DashboardLayout>
</template>
