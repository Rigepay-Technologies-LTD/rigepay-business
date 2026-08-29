<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinkDetail from '@/components/payment-links/PaymentLinkDetail.vue'

const props = defineProps<{ orgId: string; branchId: string; linkId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Payment link">
    <PaymentLinkDetail
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :link-id="props.linkId"
      list-route-name="branch-payment-links"
    />
  </DashboardLayout>
</template>
