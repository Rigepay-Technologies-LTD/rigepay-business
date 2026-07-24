<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboardIcon, UsersIcon, BanknoteIcon, FileTextIcon, BuildingIcon, Building2Icon, UserCheckIcon,
  KeyIcon, WalletIcon, ShieldIcon, ScrollTextIcon, LogOutIcon, MenuIcon, XIcon, HistoryIcon, GaugeIcon,
  VaultIcon, CalendarClockIcon, ShieldAlertIcon, ArrowLeftRightIcon, FileBarChart2Icon, BarChart3Icon, LayersIcon,
  MapPinIcon, LinkIcon, ClipboardListIcon, ReceiptIcon, TagIcon, CoinsIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/ui/AppLogo.vue'
import BranchSwitcher from '@/components/BranchSwitcher.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import SessionTimeoutModal from '@/components/SessionTimeoutModal.vue'
import { fetchBranchProfile, type BranchSummary } from '@/lib/orgApi'

const props = defineProps<{
  orgId: string
  branchId?: string | null
  branches?: BranchSummary[]
  title: string
}>()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isMobileMenuOpen = ref(false)

const isOrgWide = computed(() => auth.meta?.memberType === 'org_member')


const isOwner = computed(() => auth.meta?.role === 'owner')

// Branch mode: true whenever we're looking at a specific branch's data —
// either a genuine branch-member session, or an org member who's used the
// branch switcher to look at one branch. Drives the visual "you've switched
// context" treatment (accent bar, badge) so it's unmistakable which lens
// you're viewing the dashboard through.
const isBranchMode = computed(() => !!props.branchId)

const ownBranchName = ref<string | null>(null)
async function loadOwnBranchName() {
  if (isOrgWide.value || !props.branchId) return
  try {
    const profile = await fetchBranchProfile()
    ownBranchName.value = profile.name
  } catch {
    ownBranchName.value = null
  }
}
onMounted(loadOwnBranchName)
watch(() => props.branchId, loadOwnBranchName)

const branchName = computed(() => {
  if (!props.branchId) return null
  const fromList = props.branches?.find((b) => b.id === props.branchId)?.name
  return fromList ?? ownBranchName.value ?? 'Branch'
})

const navItems = computed(() => [
  { name: 'Dashboard', icon: LayoutDashboardIcon, active: true, to: dashboardRoute() },
  { name: 'Collect', icon: WalletIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-collect', params: { orgId: props.orgId } }
      : { name: 'branch-collect', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Branches', icon: Building2Icon, active: isOrgWide.value, to: { name: 'org-branches', params: { orgId: props.orgId } } },
  { name: 'Transfers', icon: ArrowLeftRightIcon, active: isOrgWide.value, to: { name: 'org-transfers', params: { orgId: props.orgId } } },
  { name: 'Transactions', icon: HistoryIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-transactions', params: { orgId: props.orgId } }
      : { name: 'branch-transactions', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Statements', icon: FileBarChart2Icon, active: isOrgWide.value, to: { name: 'org-statements', params: { orgId: props.orgId } } },
  { name: 'Analytics', icon: BarChart3Icon, active: isOrgWide.value, to: { name: 'org-analytics', params: { orgId: props.orgId } } },
  { name: 'Limits', icon: GaugeIcon, active: isOrgWide.value, to: { name: 'org-limits', params: { orgId: props.orgId } } },
  { name: 'Vaults', icon: VaultIcon, active: isOrgWide.value, to: { name: 'org-vaults', params: { orgId: props.orgId } } },
  { name: 'Scheduled payouts', icon: CalendarClockIcon, active: isOrgWide.value, to: { name: 'org-scheduled-payouts', params: { orgId: props.orgId } } },
  { name: 'Members', icon: UsersIcon, active: isOrgWide.value, to: { name: 'org-members', params: { orgId: props.orgId } } },
  { name: 'Payouts', icon: BanknoteIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-payouts', params: { orgId: props.orgId } }
      : { name: 'branch-payouts', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Bulk payouts', icon: LayersIcon, active: isOrgWide.value, to: { name: 'org-bulk-payouts', params: { orgId: props.orgId } } },
  { name: 'Payment links', icon: LinkIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-payment-links', params: { orgId: props.orgId } }
      : { name: 'branch-payment-links', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Invoices', icon: ClipboardListIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-invoices', params: { orgId: props.orgId } }
      : { name: 'branch-invoices', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Expenses', icon: ReceiptIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-expenses', params: { orgId: props.orgId } }
      : { name: 'branch-expenses', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Tags', icon: TagIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-tags', params: { orgId: props.orgId } }
      : { name: 'branch-tags', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Petty cash', icon: CoinsIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-petty-cash', params: { orgId: props.orgId } }
      : { name: 'branch-petty-cash', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Fraud activity', icon: ShieldAlertIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-fraud', params: { orgId: props.orgId } }
      : { name: 'branch-fraud', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Documents', icon: FileTextIcon, active: isOrgWide.value, to: { name: 'org-documents', params: { orgId: props.orgId } } },
  { name: 'Directors', icon: UserCheckIcon, active: isOrgWide.value && isOwner.value, to: { name: 'org-directors', params: { orgId: props.orgId } } },
  { name: 'Credentials', icon: KeyIcon, active: isOrgWide.value, to: { name: 'org-credentials', params: { orgId: props.orgId } } },
  { name: 'Security', icon: ShieldIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-security', params: { orgId: props.orgId } }
      : { name: 'branch-security', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Audit log', icon: ScrollTextIcon, active: isOrgWide.value, to: { name: 'org-audit-log', params: { orgId: props.orgId } } },
  { name: 'Profile', icon: BuildingIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value
      ? { name: 'org-profile', params: { orgId: props.orgId } }
      : { name: 'branch-profile', params: { orgId: props.orgId, branchId: props.branchId } } },
])

function dashboardRoute() {
  return props.branchId
    ? { name: 'branch-dashboard', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-dashboard', params: { orgId: props.orgId } }
}

function isCurrent(itemName: string) {
  if (itemName === 'Dashboard') return route.name === 'org-dashboard' || route.name === 'branch-dashboard'
  if (itemName === 'Documents') return route.name === 'org-documents'
  if (itemName === 'Directors') return route.name === 'org-directors'
  if (itemName === 'Profile') return route.name === 'org-profile' || route.name === 'branch-profile'
  if (itemName === 'Members') return route.name === 'org-members'
  if (itemName === 'Payouts') return route.name === 'org-payouts' || route.name === 'branch-payouts'
  if (itemName === 'Bulk payouts') return route.name === 'org-bulk-payouts'
  if (itemName === 'Payment links') return route.name === 'org-payment-links' || route.name === 'branch-payment-links'
  if (itemName === 'Invoices') return route.name === 'org-invoices' || route.name === 'branch-invoices'
  if (itemName === 'Expenses') return route.name === 'org-expenses' || route.name === 'branch-expenses'
  if (itemName === 'Tags') return route.name === 'org-tags' || route.name === 'branch-tags'
  if (itemName === 'Petty cash') return route.name === 'org-petty-cash' || route.name === 'branch-petty-cash'
  if (itemName === 'Credentials') return route.name === 'org-credentials'
  if (itemName === 'Branches') return route.name === 'org-branches'
  if (itemName === 'Transfers') return route.name === 'org-transfers'
  if (itemName === 'Transactions') return route.name === 'org-transactions' || route.name === 'branch-transactions'
  if (itemName === 'Statements') return route.name === 'org-statements'
  if (itemName === 'Analytics') return route.name === 'org-analytics'
  if (itemName === 'Limits') return route.name === 'org-limits'
  if (itemName === 'Vaults') return route.name === 'org-vaults'
  if (itemName === 'Scheduled payouts') return route.name === 'org-scheduled-payouts'
  if (itemName === 'Collect') return route.name === 'org-collect' || route.name === 'branch-collect'
  if (itemName === 'Security') return route.name === 'org-security' || route.name === 'branch-security'
  if (itemName === 'Audit log') return route.name === 'org-audit-log'
  if (itemName === 'Fraud activity') return route.name === 'org-fraud' || route.name === 'branch-fraud'
  return false
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-bg text-text-primary">
    <!-- Mobile backdrop -->
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 lg:hidden"
      style="background: var(--color-overlay); backdrop-filter: blur(4px);"
      @click="isMobileMenuOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-full',
        'bg-sidebar border-r transition-transform duration-300 ease-in-out',
        isBranchMode ? 'border-primary/40' : 'border-border',
        'lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div v-if="isBranchMode" class="h-1 w-full bg-primary shrink-0" />

      <div class="shrink-0 flex items-center justify-between h-16 px-5 border-b border-border">
        <AppLogo size="sm" />
        <button class="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary" @click="isMobileMenuOpen = false">
          <XIcon class="w-4 h-4" />
        </button>
      </div>

      <div v-if="isBranchMode" class="shrink-0 px-3 pt-3">
        <div class="flex items-center gap-2 rounded-xl bg-primary-muted px-3 py-2.5">
          <MapPinIcon class="w-4 h-4 text-primary shrink-0" />
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">Branch view</p>
            <p class="text-sm font-semibold text-text-primary truncate mt-0.5">{{ branchName }}</p>
          </div>
        </div>
        <RouterLink
          v-if="isOrgWide"
          :to="{ name: 'org-dashboard', params: { orgId: props.orgId } }"
          class="flex items-center gap-1.5 mt-2 px-1 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          Back to organization overview
        </RouterLink>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p class="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Menu</p>
        <component
          :is="item.active ? 'router-link' : 'div'"
          v-for="item in navItems"
          :key="item.name"
          :to="item.active ? item.to : undefined"
          :class="[
            'flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            item.active
              ? (isCurrent(item.name) ? 'bg-primary-muted text-primary font-semibold' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary')
              : 'text-text-disabled cursor-not-allowed',
          ]"
          @click="isMobileMenuOpen = false"
        >
          <span class="flex items-center gap-2.5">
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            {{ item.name }}
          </span>
          <span v-if="!item.active" class="text-[9px] font-bold uppercase tracking-wide bg-surface-2 text-text-muted rounded-full px-1.5 py-0.5">Soon</span>
        </component>
      </nav>

      <div class="shrink-0 p-3 border-t border-border space-y-2">
        <div class="px-3 py-2">
          <p class="text-xs font-bold text-text-primary leading-none truncate">{{ auth.meta?.role }}</p>
          <p class="text-[10px] text-text-muted mt-1 leading-none">{{ isOrgWide ? 'Organization-wide access' : 'Branch access' }}</p>
        </div>
        <button
          class="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error-light transition-colors"
          @click="logout"
        >
          <LogOutIcon class="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="shrink-0 flex items-center justify-between h-16 px-4 sm:px-6 bg-surface border-b border-border z-30">
        <div class="flex items-center gap-3 min-w-0">
          <button class="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors lg:hidden" @click="isMobileMenuOpen = true">
            <MenuIcon class="w-5 h-5" />
          </button>
          <h1 class="text-base font-bold text-text-primary truncate">{{ props.title }}</h1>
          <span
            v-if="isBranchMode"
            class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary-muted text-primary shrink-0"
          >
            <MapPinIcon class="w-3 h-3" />
            {{ branchName }}
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <BranchSwitcher
            v-if="props.branches"
            :org-id="props.orgId"
            :branches="props.branches"
            :current-branch-id="props.branchId"
          />
        </div>
      </header>

      <section class="flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="max-w-5xl mx-auto pb-10">
          <slot />
        </div>
      </section>
    </main>

    <SessionTimeoutModal />
  </div>
</template>
