<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboardIcon, UsersIcon, BanknoteIcon, FileTextIcon, BuildingIcon, Building2Icon, UserCheckIcon,
  KeyIcon, WalletIcon, ShieldIcon, ScrollTextIcon, LogOutIcon, MenuIcon, XIcon, HistoryIcon, GaugeIcon,
  VaultIcon, CalendarClockIcon, ShieldAlertIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/ui/AppLogo.vue'
import BranchSwitcher from '@/components/BranchSwitcher.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import SessionTimeoutModal from '@/components/SessionTimeoutModal.vue'
import type { BranchSummary } from '@/lib/orgApi'

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

const navItems = computed(() => [
  { name: 'Dashboard', icon: LayoutDashboardIcon, active: true, to: dashboardRoute() },
  { name: 'Collect', icon: WalletIcon, active: isOrgWide.value, to: { name: 'org-collect', params: { orgId: props.orgId } } },
  { name: 'Branches', icon: Building2Icon, active: isOrgWide.value, to: { name: 'org-branches', params: { orgId: props.orgId } } },
  { name: 'Transactions', icon: HistoryIcon, active: isOrgWide.value, to: { name: 'org-transactions', params: { orgId: props.orgId } } },
  { name: 'Limits', icon: GaugeIcon, active: isOrgWide.value, to: { name: 'org-limits', params: { orgId: props.orgId } } },
  { name: 'Vaults', icon: VaultIcon, active: isOrgWide.value, to: { name: 'org-vaults', params: { orgId: props.orgId } } },
  { name: 'Scheduled payouts', icon: CalendarClockIcon, active: isOrgWide.value, to: { name: 'org-scheduled-payouts', params: { orgId: props.orgId } } },
  { name: 'Members', icon: UsersIcon, active: isOrgWide.value, to: { name: 'org-members', params: { orgId: props.orgId } } },
  { name: 'Payouts', icon: BanknoteIcon, active: isOrgWide.value, to: { name: 'org-payouts', params: { orgId: props.orgId } } },
  { name: 'Fraud activity', icon: ShieldAlertIcon, active: isOrgWide.value, to: { name: 'org-fraud', params: { orgId: props.orgId } } },
  { name: 'Documents', icon: FileTextIcon, active: isOrgWide.value, to: { name: 'org-documents', params: { orgId: props.orgId } } },
  { name: 'Directors', icon: UserCheckIcon, active: isOrgWide.value && isOwner.value, to: { name: 'org-directors', params: { orgId: props.orgId } } },
  { name: 'Credentials', icon: KeyIcon, active: isOrgWide.value, to: { name: 'org-credentials', params: { orgId: props.orgId } } },
  { name: 'Security', icon: ShieldIcon, active: isOrgWide.value, to: { name: 'org-security', params: { orgId: props.orgId } } },
  { name: 'Audit log', icon: ScrollTextIcon, active: isOrgWide.value, to: { name: 'org-audit-log', params: { orgId: props.orgId } } },
  { name: 'Profile', icon: BuildingIcon, active: isOrgWide.value, to: { name: 'org-profile', params: { orgId: props.orgId } } },
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
  if (itemName === 'Profile') return route.name === 'org-profile'
  if (itemName === 'Members') return route.name === 'org-members'
  if (itemName === 'Payouts') return route.name === 'org-payouts'
  if (itemName === 'Credentials') return route.name === 'org-credentials'
  if (itemName === 'Branches') return route.name === 'org-branches'
  if (itemName === 'Transactions') return route.name === 'org-transactions'
  if (itemName === 'Limits') return route.name === 'org-limits'
  if (itemName === 'Vaults') return route.name === 'org-vaults'
  if (itemName === 'Scheduled payouts') return route.name === 'org-scheduled-payouts'
  if (itemName === 'Collect') return route.name === 'org-collect'
  if (itemName === 'Security') return route.name === 'org-security'
  if (itemName === 'Audit log') return route.name === 'org-audit-log'
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
        'bg-sidebar border-r border-border transition-transform duration-300 ease-in-out',
        'lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="shrink-0 flex items-center justify-between h-16 px-5 border-b border-border">
        <AppLogo size="sm" />
        <button class="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary" @click="isMobileMenuOpen = false">
          <XIcon class="w-4 h-4" />
        </button>
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
