<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { BranchSummary } from '@/lib/orgApi'

const props = defineProps<{
  orgId: string
  branches: BranchSummary[]
  currentBranchId?: string | null
}>()

const router = useRouter()
const open = ref(false)

function goToOrgHome() {
  open.value = false
  router.push({ name: 'org-dashboard', params: { orgId: props.orgId } })
}

function goToBranch(branchId: string) {
  open.value = false
  router.push({ name: 'branch-dashboard', params: { orgId: props.orgId, branchId } })
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2 hover:bg-border transition-colors text-sm font-semibold text-text-primary"
      @click="open = !open"
    >
      <span class="truncate max-w-40">
        {{ currentBranchId ? branches.find((b) => b.id === currentBranchId)?.name ?? 'Branch' : 'All branches' }}
      </span>
      <svg class="w-3.5 h-3.5 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div v-if="open" class="fixed inset-0 z-10" @click="open = false" />

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-md ring-1 ring-border z-20 py-2 max-h-80 overflow-y-auto"
    >
      <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-surface-2 transition-colors"
        :class="!currentBranchId ? 'text-primary' : 'text-text-primary'"
        @click="goToOrgHome"
      >
        Organization overview
      </button>

      <div class="border-t border-border my-1" />

      <button
        v-for="b in branches"
        :key="b.id"
        type="button"
        class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors flex flex-col"
        :class="b.id === currentBranchId ? 'text-primary font-semibold' : 'text-text-primary'"
        @click="goToBranch(b.id)"
      >
        <span class="truncate">{{ b.name }}</span>
        <span class="text-xs text-text-muted">{{ b.collection_code }}</span>
      </button>

      <p v-if="!branches.length" class="px-4 py-2.5 text-xs text-text-muted">No branches yet.</p>
    </div>
  </div>
</template>
