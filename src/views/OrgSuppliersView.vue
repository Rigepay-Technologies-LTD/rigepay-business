<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SuppliersListPanel from '@/components/suppliers/SuppliersListPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Suppliers">
    <SuppliersListPanel :org-id="props.orgId" />
  </DashboardLayout>
</template>
