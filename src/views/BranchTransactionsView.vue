<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import TransactionsTable from '@/components/TransactionsTable.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Activity">
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-lg font-bold text-text-primary">Activity</h1>
        <p class="text-sm text-text-muted mt-0.5">Every collection, payout, transfer and fee for this branch.</p>
      </div>
      <TransactionsTable :is-branch="true" />
    </div>
  </DashboardLayout>
</template>
