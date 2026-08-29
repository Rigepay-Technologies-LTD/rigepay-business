<script setup lang="ts">
import { fetchBranchRefunds } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CreditNotesPanel from '@/components/money/CreditNotesPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Refunds">
    <p class="text-xs text-text-muted -mt-2 mb-4">Refunds returned to customers, linked to their original payments.</p>
    <CreditNotesPanel kind="refunds" :fetcher="fetchBranchRefunds" is-branch />
  </DashboardLayout>
</template>
