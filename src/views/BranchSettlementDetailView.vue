<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementDetailPanel from '@/components/money/SettlementDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; settlementId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Settlement">
    <SettlementDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :settlement-id="props.settlementId"
      list-route-name="branch-settlements"
    />
  </DashboardLayout>
</template>
