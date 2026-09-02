<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchApprovals, type ApprovalRequest } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { SearchIcon, RefreshCwIcon, FilterIcon, InboxIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId: string }>()
const router = useRouter()
const { showError } = useResponseModal()

const loading = ref(true)
const rows = ref<ApprovalRequest[]>([])
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const search = ref('')
const statusFilter = ref('READY')

const statusOptions = [
  { value: 'READY', label: 'Ready to act' },
  { value: 'ALL', label: 'All requests' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'EXPIRED', label: 'Expired' },
]

function prettyAction(code: string) {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

async function load() {
  loading.value = true
  try {
    const res = await fetchApprovals(true, {
      status: statusFilter.value,
      search: search.value.trim() || undefined,
      page: page.value,
      page_size: 20,
    })
    rows.value = res.approvals ?? []
    total.value = res.total_count
    totalPages.value = res.total_pages || 1
    page.value = res.page || 1
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function applyFilters() {
  page.value = 1
  load()
}

function statusVariant(s: string) {
  const u = (s || '').toUpperCase()
  if (['APPROVED', 'COMPLETED'].includes(u)) return 'success'
  if (['REJECTED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(u)) return 'error'
  return 'warning'
}

const rangeStart = computed(() => (total.value ? (page.value - 1) * 20 + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * 20, total.value))

function openDetail(r: ApprovalRequest) {
  router.push({ name: 'branch-approval-detail', params: { orgId: props.orgId, branchId: props.branchId, requestId: r.id } })
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Approvals">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Maker-checker</p>
          <h1 class="text-lg font-bold text-text-primary mt-0.5">Approvals</h1>
          <p class="text-sm text-text-muted mt-0.5">Approval requests raised in this branch.</p>
        </div>
        <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
          <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
          Refresh
        </AppButton>
      </div>

      <AppCard>
        <div class="flex flex-wrap items-end gap-3">
          <div class="relative flex-1 min-w-56">
            <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              v-model="search" type="text" placeholder="Search approvals"
              class="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
              @keydown.enter="applyFilters"
            />
          </div>
          <AppSelect v-model="statusFilter" :options="statusOptions" class="w-48" />
          <AppButton size="md" @click="applyFilters">
            <template #icon><FilterIcon class="w-4 h-4" /></template>
            Apply
          </AppButton>
        </div>
      </AppCard>

      <p v-if="loading" class="text-sm text-text-muted">Loading approval queue…</p>

      <AppCard v-else-if="!rows.length" class="flex flex-col items-center gap-3 py-16 text-center">
        <div class="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
          <InboxIcon class="w-5 h-5 text-text-muted" />
        </div>
        <p class="text-sm font-medium text-text-muted">Nothing matches this filter.</p>
      </AppCard>

      <AppCard v-else padding="none">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-3">Request</th>
                <th class="px-5 py-3">Action</th>
                <th class="px-5 py-3">Maker</th>
                <th class="px-5 py-3 text-right">Amount</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rows" :key="r.id"
                class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer align-top"
                @click="openDetail(r)"
              >
                <td class="px-5 py-3">
                  <span class="block font-medium text-text-primary">{{ r.title || prettyAction(r.action_type) }}</span>
                  <span class="block font-mono text-[11px] text-text-muted">{{ r.id }}</span>
                </td>
                <td class="px-5 py-3 font-mono text-xs text-text-secondary">{{ r.action_type }}</td>
                <td class="px-5 py-3 text-text-secondary">{{ r.maker_label || '—' }}</td>
                <td class="px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                  {{ r.amount_cents != null ? `KES ${formatMoney(r.amount_cents)}` : '—' }}
                </td>
                <td class="px-5 py-3"><AppBadge :variant="statusVariant(r.status)" size="sm">{{ r.status }}</AppBadge></td>
                <td class="px-5 py-3 text-text-muted whitespace-nowrap">{{ formatDate(r.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <p class="text-xs text-text-muted">Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }}</p>
          <div class="flex gap-2">
            <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--; load()">Previous</AppButton>
            <AppButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++; load()">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
