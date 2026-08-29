<script setup lang="ts">
import { fetchBranchReversals } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CreditNotesPanel from '@/components/money/CreditNotesPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Reversals">
    <p class="text-xs text-text-muted -mt-2 mb-4">Payment reversals linked to their original payment requests.</p>
    <CreditNotesPanel kind="reversals" :fetcher="fetchBranchReversals" />
  </DashboardLayout>
</template>
