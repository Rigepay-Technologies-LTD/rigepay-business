<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ExpenseDetailPanel from '@/components/ExpenseDetailPanel.vue'

const props = defineProps<{ orgId: string; expenseId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Expense">
    <ExpenseDetailPanel :org-id="props.orgId" :expense-id="props.expenseId" list-route-name="org-expenses" />
  </DashboardLayout>
</template>
