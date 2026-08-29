<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinksList from '@/components/payment-links/PaymentLinksList.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Payment links">
    <PaymentLinksList
      :org-id="props.orgId"
      :branch-id="props.branchId"
      create-route-name="branch-payment-link-new"
      detail-route-name="branch-payment-link-detail"
    />
  </DashboardLayout>
</template>
