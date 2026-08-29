<script setup lang="ts">
import { fetchOrgFinancialAccounts } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FinancialAccountsPanel from '@/components/money/FinancialAccountsPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Financial accounts">
    <p class="text-xs text-text-muted -mt-2 mb-4">
      Every wallet across your organization and branches — balances, reserved funds and status.
    </p>
    <FinancialAccountsPanel :fetcher="fetchOrgFinancialAccounts" allow-scope />
  </DashboardLayout>
</template>
