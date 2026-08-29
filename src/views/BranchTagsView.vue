<script setup lang="ts">
import OrgTagsView from '@/views/OrgTagsView.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
</script>

<template>
  <OrgTagsView :org-id="props.orgId" :branch-id="props.branchId" is-branch />
</template>
