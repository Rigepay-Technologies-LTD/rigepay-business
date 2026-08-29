<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchPaymentLinksPage, type OrgPaymentLink } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { PlusIcon, RefreshCwIcon, LinkIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string; createRouteName: string; detailRouteName: string }>()
const router = useRouter()
const { showError } = useResponseModal()
const isBranch = computed(() => !!props.branchId)

const links = ref<OrgPaymentLink[]>([])
const loading = ref(true)
const statusFilter = ref('ALL')
const typeFilter = ref('ALL')
const page = ref(1)
const pageSize = ref(25)
const totalCount = ref(0)
const totalPages = ref(1)

async function load() {
  loading.value = true
  try {
    const res = await fetchPaymentLinksPage(isBranch.value, { page: page.value, page_size: pageSize.value })
    links.value = res.payment_links
    totalCount.value = res.total_count
    totalPages.value = res.total_pages || 1
    page.value = res.page || 1
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(page, load)

const filtered = computed(() =>
  links.value.filter((l) => {
    if (statusFilter.value !== 'ALL' && (l.display_status ?? l.status) !== statusFilter.value) return false
    if (typeFilter.value === 'OPEN' && !l.allow_open_amount) return false
    if (typeFilter.value === 'FIXED' && l.allow_open_amount) return false
    return true
  }),
)

function statusClass(s?: string) {
  switch (s) {
    case 'ACTIVE': return 'bg-success-muted text-success'
    case 'COMPLETED': return 'bg-primary-muted text-primary'
    case 'PAUSED': return 'bg-warning-muted text-warning'
    case 'DISABLED':
    case 'EXPIRED': return 'bg-surface-2 text-text-muted'
    default: return 'bg-surface-2 text-text-muted'
  }
}

function goCreate() {
  router.push({ name: props.createRouteName, params: props.branchId ? { orgId: props.orgId, branchId: props.branchId } : { orgId: props.orgId } })
}
function goDetail(l: OrgPaymentLink) {
  router.push({ name: props.detailRouteName, params: props.branchId
    ? { orgId: props.orgId, branchId: props.branchId, linkId: l.id }
    : { orgId: props.orgId, linkId: l.id } })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center gap-3">
      <AppButton size="sm" @click="goCreate">
        <template #icon><PlusIcon class="w-4 h-4" /></template>
        Create payment link
      </AppButton>
      <select v-model="statusFilter" class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
        <option value="ALL">ALL</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="PAUSED">PAUSED</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="DISABLED">DISABLED</option>
        <option value="EXPIRED">EXPIRED</option>
      </select>
      <select v-model="typeFilter" class="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm font-medium text-text-primary">
        <option value="ALL">ALL</option>
        <option value="FIXED">Fixed amount</option>
        <option value="OPEN">Open amount</option>
      </select>
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load">
        <template #icon><RefreshCwIcon class="w-4 h-4" /></template>
        Refresh
      </AppButton>
    </div>

    <AppCard padding="none">
      <p v-if="loading" class="text-sm text-text-muted px-5 py-8">Loading payment links…</p>
      <div v-else-if="!filtered.length" class="flex flex-col items-center text-center gap-2 py-12">
        <LinkIcon class="w-8 h-8 text-text-muted" />
        <p class="text-sm font-semibold text-text-primary">No payment links</p>
        <p class="text-xs text-text-muted">Create one to start collecting payments by link.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
              <th class="px-5 py-2.5">Name</th>
              <th class="px-5 py-2.5">Code</th>
              <th class="px-5 py-2.5">Type</th>
              <th class="px-5 py-2.5 text-right">Amount</th>
              <th class="px-5 py-2.5 text-right">Payments</th>
              <th class="px-5 py-2.5 text-right">Collected</th>
              <th class="px-5 py-2.5">Status</th>
              <th class="px-5 py-2.5">Customer</th>
              <th class="px-5 py-2.5">Expiry</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="l in filtered" :key="l.id"
              class="border-b border-border last:border-0 cursor-pointer hover:bg-surface-2/50"
              @click="goDetail(l)"
            >
              <td class="px-5 py-3 font-medium text-text-primary">{{ l.name || l.description || 'Payment link' }}</td>
              <td class="px-5 py-3 font-mono text-xs text-text-muted">{{ l.code }}</td>
              <td class="px-5 py-3 text-text-secondary">{{ l.link_type || 'STANDARD' }}</td>
              <td class="px-5 py-3 text-right text-text-primary">
                {{ l.allow_open_amount ? 'Open' : `KES ${formatMoney(l.amount_cents)}` }}
              </td>
              <td class="px-5 py-3 text-right text-text-muted">{{ l.payments_count ?? 0 }}</td>
              <td class="px-5 py-3 text-right font-semibold text-text-primary">KES {{ formatMoney(l.collected_cents ?? 0) }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(l.display_status ?? l.status)">
                  {{ l.display_status ?? l.status }}
                </span>
              </td>
              <td class="px-5 py-3 text-text-secondary">{{ l.customer_label || 'Anyone' }}</td>
              <td class="px-5 py-3 text-text-muted">{{ new Date(l.expires_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && links.length" class="flex items-center justify-between px-5 py-3 border-t border-border">
        <p class="text-xs text-text-muted">Page {{ page }} of {{ totalPages }} · {{ totalCount }} total</p>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="page--">Previous</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++">Next</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
