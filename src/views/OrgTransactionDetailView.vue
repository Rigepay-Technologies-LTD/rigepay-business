<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import TransactionDetailPanel from '@/components/TransactionDetailPanel.vue'

const props = defineProps<{ orgId: string; txnId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Transaction">
    <TransactionDetailPanel
      :org-id="props.orgId"
      :txn-id="props.txnId"
      list-route-name="org-transactions"
      refunds-route-name="org-refunds"
      reversals-route-name="org-reversals"
    />
  </DashboardLayout>
</template>
