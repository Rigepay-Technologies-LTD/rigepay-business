<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementDetailPanel from '@/components/money/SettlementDetailPanel.vue'

const props = defineProps<{ orgId: string; settlementId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Settlement">
    <SettlementDetailPanel :org-id="props.orgId" :settlement-id="props.settlementId" list-route-name="org-settlements" />
  </DashboardLayout>
</template>
