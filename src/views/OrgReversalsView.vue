<script setup lang="ts">
import { fetchOrgReversals } from '@/lib/orgApi'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import CreditNotesPanel from '@/components/money/CreditNotesPanel.vue'

const props = defineProps<{ orgId: string }>()
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Reversals">
    <p class="text-xs text-text-muted -mt-2 mb-4">Payment reversals linked to their original payment requests.</p>
    <CreditNotesPanel kind="reversals" :fetcher="fetchOrgReversals" />
  </DashboardLayout>
</template>
