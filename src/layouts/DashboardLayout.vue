<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboardIcon, UsersIcon, BanknoteIcon, FileTextIcon, BuildingIcon, Building2Icon, UserCheckIcon,
  WalletIcon, ShieldIcon, ScrollTextIcon, LogOutIcon, MenuIcon, XIcon, HistoryIcon, GaugeIcon,
  VaultIcon, CalendarClockIcon, ShieldAlertIcon, ArrowLeftRightIcon, FileBarChart2Icon, BarChart3Icon, LayersIcon,
  MapPinIcon, LinkIcon, ClipboardCheckIcon, ReceiptIcon, TagIcon, CoinsIcon, LifeBuoyIcon, BellIcon,
  ChevronRightIcon, ChevronLeftIcon,
  SettingsIcon, Code2Icon, ReceiptTextIcon, ExternalLinkIcon, TruckIcon, WebhookIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/ui/AppLogo.vue'
import BranchSwitcher from '@/components/BranchSwitcher.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import SessionTimeoutModal from '@/components/SessionTimeoutModal.vue'
import { fetchBranchProfile, fetchNextSettlement, type BranchSummary, type NextSettlement } from '@/lib/orgApi'
import { formatMoney } from '@/lib/format'

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
const orgOnly = computed(() => isOrgWide.value && !isBranchMode.value)

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

const nextSettlement = ref<NextSettlement | null>(null)
async function loadNextSettlement() {
  try {
    if (isOrgWide.value || !props.branchId) {
      nextSettlement.value = await fetchNextSettlement(false)
      return
    }
    try {
      nextSettlement.value = await fetchNextSettlement(true)
    } catch {
      nextSettlement.value = await fetchNextSettlement(false, props.branchId)
    }
  } catch {
    nextSettlement.value = null
  }
}
onMounted(loadNextSettlement)
watch(() => props.branchId, loadNextSettlement)

const settlementsRoute = computed<RouteLocationRaw>(() =>
  props.branchId
    ? { name: 'branch-settlements', params: { orgId: props.orgId, branchId: props.branchId as string } }
    : { name: 'org-settlements', params: { orgId: props.orgId } },
)
function nextSettlementEta(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
watch(() => props.branchId, loadOwnBranchName)

const branchName = computed(() => {
  if (!props.branchId) return null
  const fromList = props.branches?.find((b) => b.id === props.branchId)?.name
  return fromList ?? ownBranchName.value ?? 'Branch'
})

const workspaceName = computed(() => (props.branchId ? branchName.value ?? 'Branch' : 'Organization'))

// ---------------------------------------------------------------------------
// NAV MODEL — Staypace-style drill-down panels.
//  - A top-level section is either a flat link or drills into a `panel`.
//  - A panel has groups (each with an optional uppercase heading) of items.
//  - An item is a link, an external href, or itself drills into a nested panel.
// Every existing route name is preserved; only the shell interaction changed.
// ---------------------------------------------------------------------------
interface NavItem {
  label: string
  icon: Component
  to?: RouteLocationRaw
  href?: string
  match: string[]
  show: boolean
  permission?: string
  panel?: NavPanel
}
interface NavGroup {
  heading?: string
  items: NavItem[]
}
interface NavPanel {
  key: string
  label: string
  groups: NavGroup[]
  quickActions?: boolean
}
interface NavSection {
  key: string
  label: string
  icon: Component
  to?: RouteLocationRaw
  match?: string[]
  show: boolean
  permission?: string
  panel?: NavPanel
}

const DEVELOPER_PORTAL_URL = 'https://developer.rigepay.co.ke'

function dashboardRoute(): RouteLocationRaw {
  return props.branchId
    ? { name: 'branch-dashboard', params: { orgId: props.orgId, branchId: props.branchId } }
    : { name: 'org-dashboard', params: { orgId: props.orgId } }
}

function dual(
  label: string,
  icon: Component,
  orgRoute: string,
  branchRoute: string,
  match: string[] = [orgRoute, branchRoute],
  show = isOrgWide.value || !!props.branchId,
  permission?: string,
): NavItem {
  const toOrg: RouteLocationRaw = { name: orgRoute, params: { orgId: props.orgId } }
  const toBranch: RouteLocationRaw = {
    name: branchRoute,
    params: { orgId: props.orgId, branchId: props.branchId as string },
  }
  return {
    label,
    icon,
    to: isOrgWide.value && !isBranchMode.value ? toOrg : toBranch,
    match,
    show,
    permission,
  }
}

function orgLeaf(label: string, icon: Component, routeName: string, show: boolean, match: string[] = [routeName], permission?: string): NavItem {
  return { label, icon, to: { name: routeName, params: { orgId: props.orgId } }, match, show, permission }
}

const suppliersPanel = computed<NavPanel>(() => ({
  key: 'suppliers',
  label: 'Suppliers',
  groups: [
    {
      items: [
        dual('Overview', LayoutDashboardIcon, 'org-suppliers-overview', 'branch-suppliers-overview'),
        dual('All suppliers', TruckIcon, 'org-suppliers', 'branch-suppliers',
          ['org-suppliers', 'org-supplier-detail', 'branch-suppliers', 'branch-supplier-detail']),
        dual('Payables', BanknoteIcon, 'org-supplier-payables', 'branch-supplier-payables'),
        dual('Invoices', ReceiptTextIcon, 'org-supplier-invoices', 'branch-supplier-invoices',
          ['org-supplier-invoices', 'org-supplier-invoice-detail', 'branch-supplier-invoices', 'branch-supplier-invoice-detail']),
        dual('Purchase orders', LayersIcon, 'org-purchase-orders', 'branch-purchase-orders',
          ['org-purchase-orders', 'org-purchase-order-detail', 'branch-purchase-orders', 'branch-purchase-order-detail']),
        dual('Analytics', BarChart3Icon, 'org-suppliers-analytics', 'branch-suppliers-analytics'),
      ],
    },
  ],
}))

const rawSections = computed<NavSection[]>(() => [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboardIcon,
    to: dashboardRoute(),
    match: ['org-dashboard', 'branch-dashboard'],
    show: true,
  },
  {
    key: 'money',
    label: 'Money',
    icon: BanknoteIcon,
    show: true,
    panel: {
      key: 'money',
      label: 'Money',
      quickActions: true,
      groups: [
        {
          heading: 'Accounts',
          items: [
            dual('Financial accounts', WalletIcon, 'org-financial-accounts', 'branch-financial-accounts'),
            orgLeaf('Vaults', VaultIcon, 'org-vaults', orgOnly.value),
            orgLeaf('Statements', FileBarChart2Icon, 'org-statements', orgOnly.value),
            dual('Settlement preferences', GaugeIcon, 'org-settlement-preferences', 'branch-settlement-preferences'),
          ],
        },
        {
          heading: 'Payments',
          items: [
            dual('Collect', WalletIcon, 'org-collect', 'branch-collect'),
            dual('Activity', HistoryIcon, 'org-transactions', 'branch-transactions',
              ['org-transactions', 'org-transaction-detail', 'branch-transactions', 'branch-transaction-detail']),
            dual('Payment links', LinkIcon, 'org-payment-links', 'branch-payment-links',
              ['org-payment-links', 'org-payment-link-new', 'org-payment-link-detail', 'branch-payment-links', 'branch-payment-link-new', 'branch-payment-link-detail']),
            dual('Payouts', BanknoteIcon, 'org-payouts', 'branch-payouts',
              ['org-payouts', 'branch-payouts'], undefined, 'payouts.initiate'),
            // Beneficiaries / bulk / scheduled are owner-only on the org tier
            // (branch members keep access via their own gating).
            dual('Beneficiaries', UsersIcon, 'org-beneficiaries', 'branch-beneficiaries',
              ['org-beneficiaries', 'branch-beneficiaries'],
              isOrgWide.value ? isOwner.value : !!props.branchId),
            dual('Bulk payments', LayersIcon, 'org-bulk-payouts', 'branch-bulk-payouts',
              ['org-bulk-payouts', 'org-bulk-payout-detail', 'branch-bulk-payouts', 'branch-bulk-payout-detail'],
              isOrgWide.value ? isOwner.value : !!props.branchId),
            dual('Transfers', ArrowLeftRightIcon, 'org-transfers', 'branch-transfers',
              ['org-transfers', 'branch-transfers'], undefined, 'transfers.initiate'),
            dual('Scheduled payouts', CalendarClockIcon, 'org-scheduled-payouts', 'branch-scheduled-payouts',
              ['org-scheduled-payouts', 'org-scheduled-payout-detail', 'branch-scheduled-payouts', 'branch-scheduled-payout-detail'],
              isOrgWide.value ? isOwner.value : !!props.branchId),
            dual('Recipient suppressions', ShieldAlertIcon, 'org-recipient-suppressions', 'branch-recipient-suppressions'),
          ],
        },
        {
          heading: 'Settlements',
          items: [
            dual('Settlements', CoinsIcon, 'org-settlements', 'branch-settlements',
              ['org-settlements', 'org-settlement-detail', 'branch-settlements', 'branch-settlement-detail']),
            dual('Refunds', ArrowLeftRightIcon, 'org-refunds', 'branch-refunds', ['org-refunds', 'branch-refunds']),
            dual('Reversals', ArrowLeftRightIcon, 'org-reversals', 'branch-reversals', ['org-reversals', 'branch-reversals']),
          ],
        },
      ],
    },
  },
  {
    key: 'business',
    label: 'Business',
    icon: Building2Icon,
    show: true,
    panel: {
      key: 'business',
      label: 'Business',
      groups: [
        {
          heading: 'Invoicing',
          items: [
            dual('Invoices', ReceiptTextIcon, 'org-invoices', 'branch-invoices',
              ['org-invoices', 'branch-invoices'], undefined, 'invoices.manage'),
            dual('Bulk invoices', LayersIcon, 'org-bulk-invoices', 'branch-bulk-invoices',
              ['org-bulk-invoices', 'branch-bulk-invoices'], undefined, 'invoices.manage'),
            dual('Invoice schedules', CalendarClockIcon, 'org-invoice-schedules', 'branch-invoice-schedules',
              ['org-invoice-schedules', 'branch-invoice-schedules'], undefined, 'invoices.manage'),
          ],
        },
        {
          heading: 'Suppliers',
          items: [
            {
              label: 'Suppliers',
              icon: TruckIcon,
              match: [
                'org-suppliers', 'org-supplier-detail', 'org-suppliers-overview', 'org-supplier-payables',
                'org-supplier-invoices', 'org-supplier-invoice-detail', 'org-purchase-orders', 'org-purchase-order-detail', 'org-suppliers-analytics',
                'branch-suppliers', 'branch-supplier-detail', 'branch-suppliers-overview', 'branch-supplier-payables',
                'branch-supplier-invoices', 'branch-supplier-invoice-detail', 'branch-purchase-orders', 'branch-purchase-order-detail', 'branch-suppliers-analytics',
              ],
              show: isOrgWide.value || !!props.branchId,
              permission: 'suppliers.manage',
              panel: suppliersPanel.value,
            },
          ],
        },
        {
          heading: 'Customers',
          items: [
            dual('Customers', UsersIcon, 'org-customers', 'branch-customers',
              ['org-customers', 'org-customer-detail', 'branch-customers', 'branch-customer-detail'],
              undefined, 'customers.manage'),
          ],
        },
        {
          heading: 'Operations',
          items: [
            orgLeaf('Branches', Building2Icon, 'org-branches', orgOnly.value),
            dual('Expenses', ReceiptIcon, 'org-expenses', 'branch-expenses'),
            dual('Petty cash', CoinsIcon, 'org-petty-cash', 'branch-petty-cash'),
            dual('Tags', TagIcon, 'org-tags', 'branch-tags'),
          ],
        },
      ],
    },
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: BarChart3Icon,
    show: true,
    panel: {
      key: 'insights',
      label: 'Insights',
      groups: [
        {
          items: [
            dual('Analytics', BarChart3Icon, 'org-analytics', 'branch-analytics'),
            dual('Fraud activity', ShieldAlertIcon, 'org-fraud', 'branch-fraud'),
            orgLeaf('Audit log', ScrollTextIcon, 'org-audit-log', orgOnly.value),
          ],
        },
      ],
    },
  },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: ClipboardCheckIcon,
    to: isBranchMode.value
      ? { name: 'branch-approvals', params: { orgId: props.orgId, branchId: props.branchId as string } }
      : { name: 'org-approvals', params: { orgId: props.orgId } },
    match: ['org-approvals', 'org-approval-detail', 'branch-approvals', 'branch-approval-detail'],
    show: (orgOnly.value && isOwner.value) || isBranchMode.value,
  },
  {
    key: 'developers',
    label: 'Developers',
    icon: Code2Icon,
    show: orgOnly.value,
    panel: {
      key: 'developers',
      label: 'Developers',
      groups: [
        {
          items: [
            orgLeaf('API clients', Code2Icon, 'org-credentials', orgOnly.value),
            orgLeaf('Webhooks', WebhookIcon, 'org-webhooks', orgOnly.value),
            { label: 'Developer portal', icon: ExternalLinkIcon, href: DEVELOPER_PORTAL_URL, match: [], show: orgOnly.value },
          ],
        },
      ],
    },
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    show: true,
    panel: {
      key: 'settings',
      label: 'Settings',
      groups: [
        {
          items: [
            dual('Overview', SettingsIcon, 'org-settings', 'branch-settings'),
            orgLeaf('Team & access', UsersIcon, 'org-members', orgOnly.value),
            orgLeaf('Roles & permissions', ShieldIcon, 'org-roles', orgOnly.value && isOwner.value),
            orgLeaf('Directors', UserCheckIcon, 'org-directors', orgOnly.value && isOwner.value),
            dual('Business profile', BuildingIcon, 'org-profile', 'branch-profile'),
            orgLeaf('KYB documents', FileTextIcon, 'org-documents', orgOnly.value),
            {
              label: 'My KYC documents',
              icon: FileTextIcon,
              to: { name: 'branch-documents', params: { orgId: props.orgId, branchId: props.branchId as string } },
              match: ['branch-documents'],
              show: !isOrgWide.value && !!props.branchId,
            },
            dual('Security', ShieldIcon, 'org-security', 'branch-security'),
            dual('Notifications', BellIcon, 'org-notification-preferences', 'branch-notification-preferences'),
            dual('Limits', GaugeIcon, 'org-limits', 'branch-limits'),
            dual('Support', LifeBuoyIcon, 'org-support', 'branch-support'),
          ],
        },
      ],
    },
  },
])

// --- Visibility filtering --------------------------------------------------
// Permission gating applies only to org-member sessions. Branch-member sessions
// have no org RBAC profile and keep their existing show/role gating.
function permitted(permission?: string): boolean {
  if (!permission) return true
  if (auth.meta?.memberType !== 'org_member') return true
  return auth.can(permission)
}

function filterPanel(panel: NavPanel): NavPanel | null {
  const groups = panel.groups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => it.show && permitted(it.permission))
        .map((it) => (it.panel ? { ...it, panel: filterPanel(it.panel) ?? undefined } : it))
        .filter((it) => it.to || it.href || it.panel),
    }))
    .filter((g) => g.items.length > 0)
  if (!groups.length) return null
  return { ...panel, groups }
}

const sections = computed<NavSection[]>(() =>
  rawSections.value
    .filter((s) => s.show && permitted(s.permission))
    .map((s) => (s.panel ? { ...s, panel: filterPanel(s.panel) ?? undefined } : s))
    .filter((s) => s.to || s.panel),
)

// --- Which panel path contains the current route --------------------------
function panelContains(panel: NavPanel, routeName: string): string[] | null {
  for (const group of panel.groups) {
    for (const item of group.items) {
      if (item.panel) {
        const sub = panelContains(item.panel, routeName)
        if (sub) return [item.panel.key, ...sub]
        continue
      }
      if (item.match.includes(routeName)) return []
    }
  }
  return null
}

const routePanelPath = computed<string[]>(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  for (const s of sections.value) {
    if (s.match?.includes(name)) return []
    if (s.panel) {
      const p = panelContains(s.panel, name)
      if (p) return [s.key, ...p]
    }
  }
  return []
})

// The drill path currently shown. Manual back/drill actions set it directly;
// on an actual route change it re-syncs to wherever that route lives so the
// panel always reflects the page you're on.
const drillStack = ref<string[]>([...routePanelPath.value])
watch(() => route.name, () => {
  drillStack.value = [...routePanelPath.value]
})

function resolvePanel(stack: string[]): NavPanel | null {
  if (!stack.length) return null
  const section = sections.value.find((s) => s.key === stack[0])
  let panel = section?.panel ?? null
  for (let i = 1; i < stack.length && panel; i++) {
    const key = stack[i]
    let next: NavPanel | undefined
    for (const g of panel.groups) {
      const found = g.items.find((it) => it.panel?.key === key)
      if (found?.panel) { next = found.panel; break }
    }
    panel = next ?? null
  }
  return panel
}

const activePanel = computed(() => resolvePanel(drillStack.value))
const currentSectionKey = computed(() => routePanelPath.value[0] ?? null)

function isCurrent(item: NavItem) {
  return typeof route.name === 'string' && item.match.includes(route.name)
}
function sectionIsCurrent(s: NavSection) {
  const name = typeof route.name === 'string' ? route.name : ''
  return (s.match?.includes(name) ?? false) || currentSectionKey.value === s.key
}

function openSection(s: NavSection) {
  isMobileMenuOpen.value = false
  if (s.panel) {
    drillStack.value = [s.key]
  } else if (s.to) {
    router.push(s.to)
  }
}
function drillInto(key: string) {
  drillStack.value = [...drillStack.value, key]
}
function goBack() {
  drillStack.value = drillStack.value.slice(0, -1)
}
function onLeafClick() {
  isMobileMenuOpen.value = false
}

// --- Quick actions widget (Money panel) ----------------------------------
const quickActions = computed(() => {
  const collect = dual('Collect money', WalletIcon, 'org-collect', 'branch-collect')
  const payout = dual('Send payout', BanknoteIcon, 'org-payouts', 'branch-payouts',
    ['org-payouts', 'branch-payouts'], undefined, 'payouts.initiate')
  return [collect, payout].filter((a) => a.show && a.to && permitted(a.permission))
})

// --- Breadcrumb ---------------------------------------------------------
const breadcrumb = computed<string[]>(() => {
  const path = routePanelPath.value
  if (!path.length) return [props.title]
  const section = sections.value.find((s) => s.key === path[0])
  if (!section) return [props.title]
  const panel = resolvePanel(path)
  const name = typeof route.name === 'string' ? route.name : ''
  let leafLabel = props.title
  if (panel) {
    for (const g of panel.groups) {
      const it = g.items.find((i) => i.match.includes(name))
      if (it) { leafLabel = it.label; break }
    }
  }
  const mid = path.length > 1 ? [section.label, activePanel.value?.label ?? ''] : [section.label]
  return [...mid.filter(Boolean), leafLabel]
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-bg text-text-primary text-[15px]">
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 lg:hidden"
      style="background: var(--color-overlay); backdrop-filter: blur(4px);"
      @click="isMobileMenuOpen = false"
    />

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col h-full w-[264px]',
        'bg-sidebar border-r shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out',
        isBranchMode ? 'border-primary/40' : 'border-border',
        'lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div v-if="isBranchMode" class="h-1 w-full bg-primary shrink-0" />

      <!-- Workspace identity -->
      <div class="shrink-0 flex items-center justify-between h-[68px] px-4 border-b border-border">
        <div class="flex items-center gap-2.5 min-w-0">
          <AppLogo size="sm" />
        </div>
        <button
          class="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          @click="isMobileMenuOpen = false"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Branch context card -->
      <div v-if="isBranchMode" class="shrink-0 px-3 pt-3">
        <div class="flex items-center gap-3 rounded-xl bg-primary-muted px-3.5 py-3 border border-primary/10">
          <MapPinIcon class="w-4.5 h-4.5 text-primary shrink-0" />
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">Branch view</p>
            <p class="text-sm font-semibold text-text-primary truncate mt-1 leading-none">{{ branchName }}</p>
          </div>
        </div>
        <RouterLink
          v-if="isOrgWide"
          :to="{ name: 'org-dashboard', params: { orgId: props.orgId } }"
          class="flex items-center gap-1.5 mt-2.5 px-1 text-[12px] font-semibold text-text-muted hover:text-primary transition-colors"
          @click="onLeafClick"
        >
          <ChevronLeftIcon class="w-3.5 h-3.5" />
          Back to organization
        </RouterLink>
      </div>

      <!-- NAV -->
      <nav class="sidebar-scroll flex-1 overflow-y-auto py-3 px-3">
        <!-- Root panel: top-level sections -->
        <div v-if="!activePanel" class="space-y-0.5">
          <template v-for="s in sections" :key="s.key">
            <hr v-if="s.key === 'developers'" class="my-2.5 border-border" />
            <button
              v-if="s.panel"
              type="button"
              :class="[
                'flex items-center justify-between w-full rounded-xl gap-3 px-3.5 py-3 text-[14px] font-semibold transition-colors',
                sectionIsCurrent(s) ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              ]"
              @click="openSection(s)"
            >
              <span class="flex items-center gap-3 min-w-0">
                <component :is="s.icon" class="w-[19px] h-[19px] shrink-0" />
                <span class="truncate">{{ s.label }}</span>
              </span>
              <ChevronRightIcon class="w-4 h-4 text-text-muted shrink-0" />
            </button>
            <RouterLink
              v-else-if="s.to"
              :to="s.to"
              :class="[
                'flex items-center gap-3 w-full rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-colors',
                sectionIsCurrent(s) ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              ]"
              @click="onLeafClick"
            >
              <component :is="s.icon" class="w-[19px] h-[19px] shrink-0" />
              <span class="truncate">{{ s.label }}</span>
            </RouterLink>
          </template>
        </div>

        <!-- Drilled-in panel -->
        <div v-else class="space-y-1">
          <button
            type="button"
            class="flex items-center gap-2 w-full rounded-lg px-2 py-2 text-[14px] font-bold text-text-primary hover:bg-surface-2 transition-colors mb-1"
            @click="goBack"
          >
            <ChevronLeftIcon class="w-4 h-4 shrink-0" />
            {{ activePanel.label }}
          </button>

          <div v-for="(group, gi) in activePanel.groups" :key="gi" class="pt-1">
            <p v-if="group.heading" class="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {{ group.heading }}
            </p>
            <template v-for="item in group.items" :key="item.label">
              <button
                v-if="item.panel"
                type="button"
                :class="[
                  'flex items-center justify-between w-full rounded-xl gap-3 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors',
                  isCurrent(item) ? 'bg-surface-2 text-text-primary font-semibold' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                ]"
                @click="drillInto(item.panel.key)"
              >
                <span class="flex items-center gap-3 min-w-0">
                  <component :is="item.icon" class="w-[17px] h-[17px] shrink-0" />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <ChevronRightIcon class="w-4 h-4 text-text-muted shrink-0" />
              </button>
              <a
                v-else-if="item.href"
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
                @click="onLeafClick"
              >
                <component :is="item.icon" class="w-[17px] h-[17px] shrink-0" />
                <span class="truncate flex-1">{{ item.label }}</span>
                <ExternalLinkIcon class="w-3.5 h-3.5 text-text-muted shrink-0" />
              </a>
              <RouterLink
                v-else
                :to="item.to!"
                :class="[
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors',
                  isCurrent(item) ? 'bg-primary-muted text-primary font-semibold' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                ]"
                @click="onLeafClick"
              >
                <component :is="item.icon" class="w-[17px] h-[17px] shrink-0" />
                <span class="truncate">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>

          <!-- Contextual quick-actions widget -->
          <div v-if="activePanel.quickActions && quickActions.length" class="mt-4 mx-1 rounded-xl border border-border bg-surface-2/40 p-3">
            <p class="text-[12px] font-bold text-text-primary">Quick actions</p>
            <p class="text-[11px] text-text-muted mt-0.5 mb-2.5">Collect money and make payments.</p>
            <div class="flex flex-col gap-1.5">
              <RouterLink
                v-for="a in quickActions" :key="a.label"
                :to="a.to!"
                class="text-center text-[12px] font-semibold rounded-lg py-2 bg-surface border border-border text-text-primary hover:border-primary/40 hover:text-primary transition-colors"
                @click="onLeafClick"
              >{{ a.label }}</RouterLink>
            </div>
          </div>
        </div>
      </nav>

      <!-- Footer: user + logout -->
      <div class="shrink-0 p-3 border-t border-border space-y-2">
        <RouterLink
          v-if="nextSettlement && nextSettlement.amount_cents > 0 && nextSettlement.eta"
          :to="settlementsRoute"
          class="block rounded-xl border border-border bg-surface-2/40 px-3 py-2.5 hover:border-primary/40 transition-colors"
        >
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Next settlement</p>
          <p class="text-[13px] font-bold text-text-primary mt-0.5">KES {{ formatMoney(nextSettlement.amount_cents) }}</p>
          <p class="text-[11px] text-text-muted">~{{ nextSettlementEta(nextSettlement.eta) }} · view settlements</p>
        </RouterLink>

        <div class="flex items-center gap-3 px-2 py-1.5">
          <div class="w-9 h-9 rounded-full bg-primary-muted text-primary flex items-center justify-center shrink-0">
            <UsersIcon class="w-4.5 h-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-bold text-text-primary leading-none truncate capitalize">{{ auth.meta?.role }}</p>
            <p class="text-[11px] text-text-muted mt-1 leading-none truncate">{{ workspaceName }}</p>
          </div>
        </div>
        <button
          class="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-error hover:bg-error-light transition-colors"
          @click="logout"
        >
          <LogOutIcon class="w-[18px] h-[18px] shrink-0" />
          Log out
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="shrink-0 flex items-center justify-between h-[68px] px-4 sm:px-7 bg-surface border-b border-border shadow-sm z-30">
        <div class="flex items-center gap-3.5 min-w-0">
          <button class="p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors lg:hidden" @click="isMobileMenuOpen = true">
            <MenuIcon class="w-5 h-5" />
          </button>
          <nav class="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
            <template v-for="(crumb, i) in breadcrumb" :key="i">
              <ChevronRightIcon v-if="i > 0" class="w-4 h-4 text-text-muted shrink-0" />
              <span
                :class="[
                  'truncate tracking-tight',
                  i === breadcrumb.length - 1 ? 'text-lg font-bold text-text-primary' : 'text-sm font-semibold text-text-muted',
                ]"
              >
                {{ crumb }}
              </span>
            </template>
          </nav>
          <span
            v-if="isBranchMode"
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary-muted text-primary shrink-0"
          >
            <MapPinIcon class="w-3.5 h-3.5" />
            {{ branchName }}
          </span>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <NotificationBell />
          <BranchSwitcher
            v-if="props.branches"
            :org-id="props.orgId"
            :branches="props.branches"
            :current-branch-id="props.branchId"
          />
        </div>
      </header>

      <section class="app-main-scroll flex-1 overflow-y-auto p-5 sm:p-8">
        <div class="max-w-7xl mx-auto pb-12">
          <slot />
        </div>
      </section>
    </main>

    <SessionTimeoutModal />
  </div>
</template>

<style scoped>
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 999px;
}
</style>
