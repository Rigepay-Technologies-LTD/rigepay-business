<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import NativeApprovalPanel from '@/components/NativeApprovalPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; requestId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Approval">
    <NativeApprovalPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :request-id="props.requestId"
      list-route-name="branch-approvals"
    />
  </DashboardLayout>
</template>
