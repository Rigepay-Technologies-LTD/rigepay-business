<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboardIcon, UsersIcon, BanknoteIcon, FileTextIcon, BuildingIcon, Building2Icon, UserCheckIcon,
  KeyIcon, WalletIcon, ShieldIcon, ScrollTextIcon, LogOutIcon, MenuIcon, XIcon, HistoryIcon, GaugeIcon,
  VaultIcon, CalendarClockIcon, ShieldAlertIcon, ArrowLeftRightIcon, FileBarChart2Icon, BarChart3Icon, LayersIcon,
  MapPinIcon, LinkIcon, ClipboardListIcon, ReceiptIcon, TagIcon, CoinsIcon, LifeBuoyIcon,
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


const orgOnly = computed(() => isOrgWide.value && !isBranchMode.value)


const NAV_GROUPS = ['Overview', 'Money movement', 'Insights', 'Organization', 'Settings'] as const

const navItems = computed(() => [
  { name: 'Dashboard', group: 'Overview', icon: LayoutDashboardIcon, active: true, to: dashboardRoute() },
  { name: 'Collect', group: 'Overview', icon: WalletIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-collect', params: { orgId: props.orgId } }
      : { name: 'branch-collect', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Transactions', group: 'Overview', icon: HistoryIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-transactions', params: { orgId: props.orgId } }
      : { name: 'branch-transactions', params: { orgId: props.orgId, branchId: props.branchId } } },

 
  { name: 'Payouts', group: 'Money movement', icon: BanknoteIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-payouts', params: { orgId: props.orgId } }
      : { name: 'branch-payouts', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Bulk payouts', group: 'Money movement', icon: LayersIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-bulk-payouts', params: { orgId: props.orgId } }
      : { name: 'branch-bulk-payouts', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Payment links', group: 'Money movement', icon: LinkIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-payment-links', params: { orgId: props.orgId } }
      : { name: 'branch-payment-links', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Invoices', group: 'Money movement', icon: ClipboardListIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-invoices', params: { orgId: props.orgId } }
      : { name: 'branch-invoices', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Bulk invoices', group: 'Money movement', icon: LayersIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-bulk-invoices', params: { orgId: props.orgId } }
      : { name: 'branch-bulk-invoices', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Invoice schedules', group: 'Money movement', icon: CalendarClockIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-invoice-schedules', params: { orgId: props.orgId } }
      : { name: 'branch-invoice-schedules', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Recipient suppressions', group: 'Money movement', icon: ShieldAlertIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-recipient-suppressions', params: { orgId: props.orgId } }
      : { name: 'branch-recipient-suppressions', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Expenses', group: 'Money movement', icon: ReceiptIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-expenses', params: { orgId: props.orgId } }
      : { name: 'branch-expenses', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Petty cash', group: 'Money movement', icon: CoinsIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-petty-cash', params: { orgId: props.orgId } }
      : { name: 'branch-petty-cash', params: { orgId: props.orgId, branchId: props.branchId } } },

  { name: 'Transfers', group: 'Money movement', icon: ArrowLeftRightIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-transfers', params: { orgId: props.orgId } }
      : { name: 'branch-transfers', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Vaults', group: 'Money movement', icon: VaultIcon, active: orgOnly.value, to: { name: 'org-vaults', params: { orgId: props.orgId } } },

  { name: 'Scheduled payouts', group: 'Money movement', icon: CalendarClockIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-scheduled-payouts', params: { orgId: props.orgId } }
      : { name: 'branch-scheduled-payouts', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Settlement preferences', group: 'Money movement', icon: WalletIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-settlement-preferences', params: { orgId: props.orgId } }
      : { name: 'branch-settlement-preferences', params: { orgId: props.orgId, branchId: props.branchId } } },

  { name: 'Analytics', group: 'Insights', icon: BarChart3Icon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-analytics', params: { orgId: props.orgId } }
      : { name: 'branch-analytics', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Statements', group: 'Insights', icon: FileBarChart2Icon, active: orgOnly.value, to: { name: 'org-statements', params: { orgId: props.orgId } } },
  { name: 'Fraud activity', group: 'Insights', icon: ShieldAlertIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-fraud', params: { orgId: props.orgId } }
      : { name: 'branch-fraud', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Tags', group: 'Insights', icon: TagIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-tags', params: { orgId: props.orgId } }
      : { name: 'branch-tags', params: { orgId: props.orgId, branchId: props.branchId } } },

  { name: 'Branches', group: 'Organization', icon: Building2Icon, active: orgOnly.value, to: { name: 'org-branches', params: { orgId: props.orgId } } },
  { name: 'Members', group: 'Organization', icon: UsersIcon, active: orgOnly.value, to: { name: 'org-members', params: { orgId: props.orgId } } },
  { name: 'Documents', group: 'Organization', icon: FileTextIcon, active: orgOnly.value, to: { name: 'org-documents', params: { orgId: props.orgId } } },
  { name: 'Directors', group: 'Organization', icon: UserCheckIcon, active: orgOnly.value && isOwner.value, to: { name: 'org-directors', params: { orgId: props.orgId } } },
  { name: 'Credentials', group: 'Organization', icon: KeyIcon, active: orgOnly.value, to: { name: 'org-credentials', params: { orgId: props.orgId } } },
  { name: 'Limits', group: 'Organization', icon: GaugeIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-limits', params: { orgId: props.orgId } }
      : { name: 'branch-limits', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Audit log', group: 'Organization', icon: ScrollTextIcon, active: orgOnly.value, to: { name: 'org-audit-log', params: { orgId: props.orgId } } },


  { name: 'My KYC documents', group: 'Settings', icon: FileTextIcon, active: !isOrgWide.value && !!props.branchId,
      to: { name: 'branch-documents', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Security', group: 'Settings', icon: ShieldIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-security', params: { orgId: props.orgId } }
      : { name: 'branch-security', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Profile', group: 'Settings', icon: BuildingIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-profile', params: { orgId: props.orgId } }
      : { name: 'branch-profile', params: { orgId: props.orgId, branchId: props.branchId } } },
  { name: 'Support', group: 'Settings', icon: LifeBuoyIcon, active: isOrgWide.value || !!props.branchId, to: isOrgWide.value && !isBranchMode.value
      ? { name: 'org-support', params: { orgId: props.orgId } }
      : { name: 'branch-support', params: { orgId: props.orgId, branchId: props.branchId } } },
].filter((item) => item.active))

const groupedNavItems = computed(() =>
  NAV_GROUPS
    .map((group) => ({ group, items: navItems.value.filter((item) => item.group === group) }))
    .filter((section) => section.items.length > 0),
)

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
  if (itemName === 'Bulk payouts') return route.name === 'org-bulk-payouts' || route.name === 'branch-bulk-payouts'
  if (itemName === 'Payment links') return route.name === 'org-payment-links' || route.name === 'branch-payment-links'
  if (itemName === 'Invoices') return route.name === 'org-invoices' || route.name === 'branch-invoices'
  if (itemName === 'Bulk invoices') return route.name === 'org-bulk-invoices' || route.name === 'branch-bulk-invoices'
  if (itemName === 'Invoice schedules') return route.name === 'org-invoice-schedules' || route.name === 'branch-invoice-schedules'
  if (itemName === 'Recipient suppressions') return route.name === 'org-recipient-suppressions' || route.name === 'branch-recipient-suppressions'
  if (itemName === 'Expenses') return route.name === 'org-expenses' || route.name === 'branch-expenses'
  if (itemName === 'Tags') return route.name === 'org-tags' || route.name === 'branch-tags'
  if (itemName === 'Petty cash') return route.name === 'org-petty-cash' || route.name === 'branch-petty-cash'
  if (itemName === 'Support') return route.name === 'org-support' || route.name === 'branch-support'
  if (itemName === 'Credentials') return route.name === 'org-credentials'
  if (itemName === 'Branches') return route.name === 'org-branches'
  if (itemName === 'Transfers') return route.name === 'org-transfers' || route.name === 'branch-transfers'
  if (itemName === 'Transactions') return route.name === 'org-transactions' || route.name === 'branch-transactions'
  if (itemName === 'Statements') return route.name === 'org-statements'
  if (itemName === 'Analytics') return route.name === 'org-analytics' || route.name === 'branch-analytics'
  if (itemName === 'Limits') return route.name === 'org-limits' || route.name === 'branch-limits'
  if (itemName === 'Vaults') return route.name === 'org-vaults'
  if (itemName === 'Scheduled payouts') return route.name === 'org-scheduled-payouts' || route.name === 'branch-scheduled-payouts'
  if (itemName === 'Settlement preferences') return route.name === 'org-settlement-preferences' || route.name === 'branch-settlement-preferences'
  if (itemName === 'Collect') return route.name === 'org-collect' || route.name === 'branch-collect'
  if (itemName === 'Security') return route.name === 'org-security' || route.name === 'branch-security'
  if (itemName === 'My KYC documents') return route.name === 'branch-documents'
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
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 lg:hidden"
      style="background: var(--color-overlay); backdrop-filter: blur(4px);"
      @click="isMobileMenuOpen = false"
    />

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

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        <div v-for="section in groupedNavItems" :key="section.group">
          <p class="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">{{ section.group }}</p>
          <div class="space-y-1">
            <router-link
              v-for="item in section.items"
              :key="item.name"
              :to="item.to"
              :class="[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isCurrent(item.name) ? 'bg-primary-muted text-primary font-semibold' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              ]"
              @click="isMobileMenuOpen = false"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              {{ item.name }}
            </router-link>
          </div>
        </div>
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
