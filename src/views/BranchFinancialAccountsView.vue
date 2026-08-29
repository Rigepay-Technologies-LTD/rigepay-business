<script setup lang="ts">
import { fetchBranchFinancialAccounts } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FinancialAccountsPanel from '@/components/money/FinancialAccountsPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Financial accounts">
    <p class="text-xs text-text-muted -mt-2 mb-4">
      This branch's wallets — balances, reserved funds and status.
    </p>
    <FinancialAccountsPanel :fetcher="fetchBranchFinancialAccounts" />
  </DashboardLayout>
</template>
