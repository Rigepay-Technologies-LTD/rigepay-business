<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SupplierDetailPanel from '@/components/suppliers/SupplierDetailPanel.vue'

const props = defineProps<{ orgId: string; supplierId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Suppliers">
    <SupplierDetailPanel :org-id="props.orgId" :supplier-id="props.supplierId" />
  </DashboardLayout>
</template>
