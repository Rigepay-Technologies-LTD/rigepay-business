<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinksList from '@/components/payment-links/PaymentLinksList.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Payment links">
    <PaymentLinksList
      :org-id="props.orgId"
      create-route-name="org-payment-link-new"
      detail-route-name="org-payment-link-detail"
    />
  </DashboardLayout>
</template>
