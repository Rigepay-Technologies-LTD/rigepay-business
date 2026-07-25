<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchOrgAuditLogs, fetchOrgAuditLogDetail, type AuditLogListItem, type AuditLogDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{ orgId: string }>()

const loading = ref(true)
const error = ref<string | null>(null)
const searchText = ref('')
const page = ref(1)
const logs = ref<AuditLogListItem[]>([])
const totalPages = ref(1)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchOrgAuditLogs({ page: page.value, page_size: 20, search: searchText.value || undefined })
    logs.value = res.logs
    totalPages.value = res.total_pages
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function search() {
  page.value = 1
  load()
}

const columns = [
  { key: 'occurred_at', label: 'When' },
  { key: 'actor_name', label: 'Who' },
  { key: 'action', label: 'Action' },
  { key: 'status', label: 'Result' },
  { key: 'ip_address', label: 'IP' },
]

function statusVariant(status: string) {
  return status === 'success' ? 'success' : 'error'
}

const selectedDetail = ref<AuditLogDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const showDetail = ref(false)

async function openDetail(row: Record<string, unknown>) {
  const log = row as unknown as AuditLogListItem
  showDetail.value = true
  detailLoading.value = true
  detailError.value = null
  selectedDetail.value = null
  try {
    selectedDetail.value = await fetchOrgAuditLogDetail(log.id)
  } catch (err) {
    detailError.value = extractErrorMessage(err)
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Audit log">
    <div class="flex flex-col gap-6">
      <div v-if="error" class="text-sm text-error-text bg-error-light rounded-xl px-4 py-3">{{ error }}</div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Activity</h2>
        <p class="text-xs text-text-muted mb-5">Who did what, where, and when — every action taken by a member of your organization.</p>
        <form class="flex flex-col sm:flex-row gap-3 mb-5" @submit.prevent="search">
          <AppInput v-model="searchText" placeholder="Search action, path, IP..." class="flex-1" />
          <AppButton type="submit" :loading="loading">Search</AppButton>
        </form>

        <AppTable :columns="columns" :rows="logs" :loading="loading" empty-message="No activity recorded yet." clickable @row-click="openDetail">
          <template #cell-occurred_at="{ value }">{{ formatDate(value as string) }}</template>
          <template #cell-actor_name="{ row }">
            <span class="text-xs font-semibold text-text-primary">{{ (row.actor_name as string) || (row.actor_type as string) }}</span>
            <span class="text-[11px] text-text-muted block">{{ row.actor_email }}</span>
            <span class="text-[11px] text-text-muted block">{{ row.actor_role }}</span>
          </template>
          <template #cell-status="{ value }">
            <AppBadge :variant="statusVariant(value as string)" size="sm">{{ value }}</AppBadge>
          </template>
        </AppTable>

        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-xs text-text-muted">
          <span>Page {{ page }} of {{ totalPages }}</span>
          <div class="flex gap-2">
            <AppButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; load()">Previous</AppButton>
            <AppButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="page++; load()">Next</AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showDetail" title="Activity detail" size="md">
      <p v-if="detailLoading" class="text-sm text-text-muted">Loading…</p>
      <p v-else-if="detailError" class="text-sm text-error-text">{{ detailError }}</p>
      <dl v-else-if="selectedDetail" class="flex flex-col gap-3 text-sm">
        <div class="flex justify-between"><dt class="text-text-muted">Action</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.action }}</dd></div>
        <div class="flex justify-between"><dt class="text-text-muted">Resource</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.resource_type }} {{ selectedDetail.resource_id }}</dd></div>

        <div class="border-t border-border pt-3 mt-1">
          <p class="text-xs font-bold text-text-primary mb-2">Who</p>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between"><dt class="text-text-muted">Name</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.actor.full_name || selectedDetail.actor.type }}</dd></div>
            <div v-if="selectedDetail.actor.email" class="flex justify-between"><dt class="text-text-muted">Email</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.actor.email }}</dd></div>
            <div v-if="selectedDetail.actor.phone" class="flex justify-between"><dt class="text-text-muted">Phone</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.actor.phone }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">Role</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.actor.type }} — {{ selectedDetail.actor.role }}</dd></div>
            <div v-if="selectedDetail.actor.is_active !== undefined" class="flex justify-between"><dt class="text-text-muted">Account status</dt><dd><AppBadge :variant="selectedDetail.actor.is_active ? 'success' : 'error'" size="sm">{{ selectedDetail.actor.is_active ? 'Active' : 'Inactive' }}</AppBadge></dd></div>
          </div>
        </div>

        <div class="border-t border-border pt-3">
          <p class="text-xs font-bold text-text-primary mb-2">Where</p>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between"><dt class="text-text-muted">IP address</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.ip_address }}</dd></div>
            <div v-if="selectedDetail.city || selectedDetail.country" class="flex justify-between"><dt class="text-text-muted">Location</dt><dd class="font-semibold text-text-primary">{{ [selectedDetail.town, selectedDetail.city, selectedDetail.country].filter(Boolean).join(', ') }}</dd></div>
            <div v-if="selectedDetail.isp" class="flex justify-between"><dt class="text-text-muted">Network / ISP</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.isp }}{{ selectedDetail.asn ? ` (AS${selectedDetail.asn})` : '' }}</dd></div>
            <div v-if="selectedDetail.network" class="flex justify-between"><dt class="text-text-muted">Network range</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.network }}</dd></div>
            <div v-if="selectedDetail.device_name || selectedDetail.device_platform" class="flex justify-between"><dt class="text-text-muted">Device</dt><dd class="font-semibold text-text-primary">{{ [selectedDetail.device_name, selectedDetail.device_platform].filter(Boolean).join(' — ') }}</dd></div>
            <div v-if="selectedDetail.app_version" class="flex justify-between"><dt class="text-text-muted">App version</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.app_version }}</dd></div>
            <div v-if="selectedDetail.user_agent" class="flex flex-col gap-1"><dt class="text-text-muted">User agent</dt><dd class="text-xs text-text-secondary break-all">{{ selectedDetail.user_agent }}</dd></div>
          </div>
        </div>

        <div class="border-t border-border pt-3">
          <div class="flex justify-between"><dt class="text-text-muted">Method / Path</dt><dd class="font-semibold text-text-primary text-right">{{ selectedDetail.method }} {{ selectedDetail.path }}</dd></div>
          <div class="flex justify-between mt-2"><dt class="text-text-muted">Status</dt><dd><AppBadge :variant="statusVariant(selectedDetail.status)" size="sm">{{ selectedDetail.status }} ({{ selectedDetail.status_code }})</AppBadge></dd></div>
          <div class="flex justify-between mt-2"><dt class="text-text-muted">Duration</dt><dd class="font-semibold text-text-primary">{{ selectedDetail.duration_ms }}ms</dd></div>
          <div class="flex justify-between mt-2"><dt class="text-text-muted">Occurred</dt><dd class="font-semibold text-text-primary">{{ formatDate(selectedDetail.occurred_at) }}</dd></div>
        </div>

        <div v-if="selectedDetail.error_msg" class="flex flex-col gap-1"><dt class="text-text-muted">Error</dt><dd class="font-semibold text-error-text">{{ selectedDetail.error_msg }}</dd></div>
      </dl>
    </AppModal>
  </DashboardLayout>
</template>
