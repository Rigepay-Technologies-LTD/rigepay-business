<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PaymentLinkForm from '@/components/payment-links/PaymentLinkForm.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Create payment link">
    <PaymentLinkForm :org-id="props.orgId" :branch-id="props.branchId" detail-route-name="branch-payment-link-detail" />
  </DashboardLayout>
</template>
