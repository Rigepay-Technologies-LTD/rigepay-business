<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CustomerDetailPanel from '@/components/customers/CustomerDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; customerId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Customer">
    <CustomerDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :customer-id="props.customerId"
      list-route-name="branch-customers"
    />
  </DashboardLayout>
</template>
