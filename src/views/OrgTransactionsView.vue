<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchOrgBranches, type BranchesResponse } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import TransactionsTable from '@/components/TransactionsTable.vue'

const props = defineProps<{ orgId: string }>()
const { showError } = useResponseModal()

const overview = ref<BranchesResponse | null>(null)

onMounted(async () => {
  try {
    overview.value = await fetchOrgBranches()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
})

const branchOptions = computed(() => [
  { value: '', label: 'Organization (this business)' },
  ...(overview.value?.branches.map((b) => ({ value: b.id, label: b.name })) ?? []),
])
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branches="overview?.branches ?? []" title="Activity">
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-lg font-bold text-text-primary">Activity</h1>
        <p class="text-sm text-text-muted mt-0.5">
          Every collection, payout, transfer, fee and settlement across the organization and its branches.
        </p>
      </div>
      <TransactionsTable :is-branch="false" :branch-options="branchOptions" />
    </div>
  </DashboardLayout>
</template>
