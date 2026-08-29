<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinkForm from '@/components/payment-links/PaymentLinkForm.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Create payment link">
    <PaymentLinkForm :org-id="props.orgId" detail-route-name="org-payment-link-detail" />
  </DashboardLayout>
</template>
