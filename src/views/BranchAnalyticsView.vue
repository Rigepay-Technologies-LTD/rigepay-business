<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchAnalyticsDetail, type AnalyticsDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AnalyticsDetailPanel from '@/components/AnalyticsDetailPanel.vue'

const props = defineProps<{ orgId: string; branchId: string }>()

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const period = ref(currentPeriod())
const data = ref<AnalyticsDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await fetchBranchAnalyticsDetail(period.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Analytics">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard padding="sm">
        <div class="flex items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Period</label>
            <input
              v-model="period" type="month"
              class="h-10 rounded-xl border border-input-border bg-input-bg px-3.5 text-sm font-medium text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/20"
              @change="load"
            />
          </div>
        </div>
      </AppCard>

      <AnalyticsDetailPanel :data="data" :loading="loading" />
    </div>
  </DashboardLayout>
</template>
