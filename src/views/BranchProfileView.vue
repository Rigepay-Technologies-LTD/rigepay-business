<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchBranchProfile, type BranchProfileDetail } from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
const { showError } = useResponseModal()

const profile = ref<BranchProfileDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    profile.value = await fetchBranchProfile()
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'closed' || status === 'suspended') return 'error'
  return 'neutral'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Branch profile">
    <div class="flex flex-col gap-6">
      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

      <template v-else-if="profile">
        <AppCard>
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-sm font-bold text-text-primary">{{ profile.name }}</h2>
            <AppBadge :variant="statusVariant(profile.status)" size="sm">{{ profile.status }}</AppBadge>
          </div>
          <p class="text-xs text-text-muted mb-5">Collection code {{ profile.collection_code }}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Location</p>
              <p class="text-text-primary">{{ profile.location || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Branch type</p>
              <p class="text-text-primary">{{ profile.branch_type || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Manager email</p>
              <p class="text-text-primary">{{ profile.manager_email }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Operating address</p>
              <p class="text-text-primary">{{ profile.operating_address || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Contact person</p>
              <p class="text-text-primary">{{ profile.contact_person_name || '—' }}</p>
              <p class="text-xs text-text-muted">{{ profile.contact_person_email || '' }} {{ profile.contact_person_phone || '' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Risk score</p>
              <p class="text-text-primary">{{ profile.risk_score }}</p>
            </div>
          </div>
        </AppCard>

        <AppCard>
          <h2 class="text-sm font-bold text-text-primary mb-1">Settlement</h2>
          <p class="text-xs text-text-muted mb-5">How this branch's funds are settled — configured by your organization's owner.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Settlement mode</p>
              <p class="text-text-primary">{{ profile.settlement_mode }}</p>
            </div>
            <div v-if="profile.settlement_bank_name">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Settlement bank</p>
              <p class="text-text-primary">{{ profile.settlement_bank_name }} — {{ profile.settlement_bank_account_number }}</p>
            </div>
          </div>
        </AppCard>
      </template>
    </div>
  </DashboardLayout>
</template>
