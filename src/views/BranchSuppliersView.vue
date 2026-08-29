<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SuppliersListPanel from '@/components/suppliers/SuppliersListPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Suppliers">
    <SuppliersListPanel :org-id="props.orgId" :branch-id="props.branchId" />
  </DashboardLayout>
</template>
