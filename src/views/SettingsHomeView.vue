<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchOrgMembers, fetchOrgDirectors, fetchOrgDocuments, fetchActiveSessions, fetchOrgProfile,
  type OrgMember,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useResponseModal } from '@/composables/useResponseModal'
import {
  UsersIcon, UserCheckIcon, BuildingIcon, FileTextIcon, ShieldIcon, GaugeIcon,
  LifeBuoyIcon, ChevronRightIcon,
} from 'lucide-vue-next'

const props = defineProps<{ orgId: string; branchId?: string }>()
const auth = useAuthStore()
const { showError } = useResponseModal()

const isOrg = computed(() => auth.meta?.memberType === 'org_member')
const isOwner = computed(() => auth.meta?.role === 'owner' && isOrg.value)

const members = ref<OrgMember[]>([])
const directorCount = ref(0)
const docCount = ref(0)
const sessionCount = ref(0)
const verification = ref<string>('')

onMounted(async () => {
  try {
    sessionCount.value = (await fetchActiveSessions(!isOrg.value)).length
  } catch { /* non-fatal */ }

  if (isOrg.value) {
    try { members.value = await fetchOrgMembers() } catch (err) { showError(extractErrorMessage(err)) }
    try { directorCount.value = (await fetchOrgDirectors()).length } catch { /* */ }
    try { docCount.value = (await fetchOrgDocuments()).length } catch { /* */ }
    try { verification.value = (await fetchOrgProfile()).organization.status } catch { /* */ }
  }
})

const activeMembers = computed(() => members.value.filter((m) => m.is_active).length)

import type { RouteLocationRaw } from 'vue-router'

interface Tile {
  label: string
  desc: string
  icon: typeof UsersIcon
  to: RouteLocationRaw
  badge?: string
  show: boolean
}

function r(name: string): RouteLocationRaw {
  return props.branchId
    ? { name, params: { orgId: props.orgId, branchId: props.branchId } }
    : { name, params: { orgId: props.orgId } }
}

const tiles = computed<Tile[]>(() => [
  {
    label: 'Team & access', desc: 'Members, roles, permissions and invitations',
    icon: UsersIcon, to: r('org-members'),
    badge: members.value.length ? `${activeMembers.value}/${members.value.length} active` : undefined,
    show: isOrg.value,
  },
  {
    label: 'Directors', desc: 'Beneficial owners and signatories',
    icon: UserCheckIcon, to: r('org-directors'),
    badge: directorCount.value ? `${directorCount.value}` : undefined,
    show: isOwner.value,
  },
  {
    label: 'Business profile', desc: 'Legal name, registration, addresses and contact',
    icon: BuildingIcon, to: r(props.branchId ? 'branch-profile' : 'org-profile'),
    badge: verification.value || undefined,
    show: true,
  },
  {
    label: props.branchId ? 'My KYC documents' : 'KYB documents', desc: 'Upload and track verification documents',
    icon: FileTextIcon, to: r(props.branchId ? 'branch-documents' : 'org-documents'),
    badge: docCount.value ? `${docCount.value}` : undefined,
    show: true,
  },
  {
    label: 'Security', desc: 'Sessions, trusted devices, two-factor authentication',
    icon: ShieldIcon, to: r(props.branchId ? 'branch-security' : 'org-security'),
    badge: sessionCount.value ? `${sessionCount.value} session${sessionCount.value === 1 ? '' : 's'}` : undefined,
    show: true,
  },
  {
    label: 'Limits', desc: 'Daily payout and collection limits',
    icon: GaugeIcon, to: r(props.branchId ? 'branch-limits' : 'org-limits'),
    show: true,
  },
  {
    label: 'Support', desc: 'Contact RigePay and view your tickets',
    icon: LifeBuoyIcon, to: r(props.branchId ? 'branch-support' : 'org-support'),
    show: true,
  },
].filter((t) => t.show))
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Settings">
    <div class="flex flex-col gap-6">
      <p class="text-sm text-text-muted -mt-2">
        Manage your {{ isOrg && !props.branchId ? 'organization' : 'branch' }} — team, verification, security and limits.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RouterLink
          v-for="t in tiles" :key="t.label"
          :to="t.to"
          class="group flex items-start gap-4 rounded-xl bg-surface border border-border shadow-sm p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span class="w-11 h-11 rounded-xl bg-primary-muted text-primary flex items-center justify-center shrink-0">
            <component :is="t.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-bold text-text-primary">{{ t.label }}</p>
              <ChevronRightIcon class="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <p class="text-xs text-text-muted mt-0.5">{{ t.desc }}</p>
            <AppBadge v-if="t.badge" variant="neutral" size="sm" class="mt-2">{{ t.badge }}</AppBadge>
          </div>
        </RouterLink>
      </div>
    </div>
  </DashboardLayout>
</template>
