<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinkDetail from '@/components/payment-links/PaymentLinkDetail.vue'

const props = defineProps<{ orgId: string; linkId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payment link">
    <PaymentLinkDetail
      :org-id="props.orgId"
      :link-id="props.linkId"
      list-route-name="org-payment-links"
    />
  </DashboardLayout>
</template>
