<script setup lang="ts">
import { fetchBranchSettlements } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementsPanel from '@/components/money/SettlementsPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Settlements">
    <p class="text-xs text-text-muted -mt-2 mb-4">
      Settlement periods showing gross collections, fees and the net amount released to this branch's main wallet.
    </p>
    <SettlementsPanel
      :list-fetcher="fetchBranchSettlements"
      :org-id="props.orgId"
      :branch-id="props.branchId"
      detail-route-name="branch-settlement-detail"
    />
  </DashboardLayout>
</template>
