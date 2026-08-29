<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import TransactionDetailPanel from '@/components/TransactionDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; txnId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Transaction">
    <TransactionDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :txn-id="props.txnId"
      list-route-name="branch-transactions"
      refunds-route-name="branch-refunds"
      reversals-route-name="branch-reversals"
    />
  </DashboardLayout>
</template>
