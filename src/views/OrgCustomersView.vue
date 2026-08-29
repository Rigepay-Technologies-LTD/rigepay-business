<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CustomersListPanel from '@/components/customers/CustomersListPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Customers">
    <CustomersListPanel :org-id="props.orgId" />
  </DashboardLayout>
</template>
