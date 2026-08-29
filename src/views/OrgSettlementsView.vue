<script setup lang="ts">
import { fetchOrgSettlements } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SettlementsPanel from '@/components/money/SettlementsPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Settlements">
    <p class="text-xs text-text-muted -mt-2 mb-4">
      Settlement periods showing gross collections, fees and the net amount released to your main wallet.
    </p>
    <SettlementsPanel
      :list-fetcher="fetchOrgSettlements"
      :org-id="props.orgId"
      detail-route-name="org-settlement-detail"
      allow-scope
    />
  </DashboardLayout>
</template>
