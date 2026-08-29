<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ExpenseDetailPanel from '@/components/ExpenseDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string; expenseId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Expense">
    <ExpenseDetailPanel
      :org-id="props.orgId"
      :branch-id="props.branchId"
      :expense-id="props.expenseId"
      list-route-name="branch-expenses"
    />
  </DashboardLayout>
</template>
