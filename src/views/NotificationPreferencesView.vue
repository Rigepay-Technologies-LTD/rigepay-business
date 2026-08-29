<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchNotificationPreferences, updateNotificationPreferences,
  type NotificationPrefCategory,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { BellIcon, ShieldCheckIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string }>()
const route = useRoute()
const isBranch = computed(() => !!props.branchId || !!route.params.branchId)

const { showError, showSuccess } = useResponseModal()

const CATEGORY_LABELS: Record<string, { label: string; hint: string }> = {
  payouts: { label: 'Payouts', hint: 'Payout status, failures and provider updates.' },
  approvals: { label: 'Approvals', hint: 'Maker-checker requests waiting on you and their decisions.' },
  invoices: { label: 'Invoices', hint: 'Invoice batches, schedules and delivery results.' },
  settlements: { label: 'Settlements', hint: 'Held-fund releases and settlement transfers.' },
  limits: { label: 'Limits', hint: 'Limit alerts and limit-change decisions.' },
  marketing: { label: 'Product updates', hint: 'New features and occasional announcements.' },
  system: { label: 'General', hint: 'Everything else, including status changes.' },
}

const categories = ref<NotificationPrefCategory[]>([])
const lockedCategory = ref('security')
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await fetchNotificationPreferences(isBranch.value)
    categories.value = data.categories
    lockedCategory.value = data.locked_category
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const data = await updateNotificationPreferences(categories.value, isBranch.value)
    categories.value = data.categories
    showSuccess('Notification preferences saved.')
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    saving.value = false
  }
}

function labelFor(cat: string) {
  return CATEGORY_LABELS[cat] ?? { label: cat, hint: '' }
}

onMounted(load)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Notification preferences">
    <div class="flex flex-col gap-6 max-w-2xl">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Settings</p>
        <h1 class="text-xl font-bold text-text-primary mt-0.5">Notification preferences</h1>
        <p class="text-sm text-text-muted mt-1">Choose which in-app notifications you receive. These apply to your account only.</p>
      </div>

      <AppCard>
        <p v-if="loading" class="text-sm text-text-muted">Loading…</p>
        <template v-else>
          <ul class="flex flex-col divide-y divide-border">
            <li v-for="c in categories" :key="c.category" class="py-3.5 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <BellIcon class="w-3.5 h-3.5 text-text-muted" />
                  {{ labelFor(c.category).label }}
                </p>
                <p class="text-xs text-text-muted mt-0.5">{{ labelFor(c.category).hint }}</p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="c.enabled"
                class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
                :class="c.enabled ? 'bg-primary' : 'bg-surface-2 border border-border'"
                @click="c.enabled = !c.enabled"
              >
                <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5"
                  :class="c.enabled ? 'translate-x-5' : 'translate-x-0.5'" />
              </button>
            </li>
            <li class="py-3.5 flex items-start justify-between gap-4 opacity-70">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <ShieldCheckIcon class="w-3.5 h-3.5 text-text-muted" />
                  Fraud &amp; security
                </p>
                <p class="text-xs text-text-muted mt-0.5">Login alerts, device checks, screening hits — always on.</p>
              </div>
              <span class="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Always on</span>
            </li>
          </ul>
          <div class="flex justify-end mt-5">
            <AppButton :loading="saving" @click="save">Save preferences</AppButton>
          </div>
        </template>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
