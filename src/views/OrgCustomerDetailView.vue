<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CustomerDetailPanel from '@/components/customers/CustomerDetailPanel.vue'

const props = defineProps<{ orgId: string; customerId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Customer">
    <CustomerDetailPanel :org-id="props.orgId" :customer-id="props.customerId" list-route-name="org-customers" />
  </DashboardLayout>
</template>
