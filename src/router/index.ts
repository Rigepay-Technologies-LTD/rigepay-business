import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resolveLandingRoute } from '@/lib/landing'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/onboard/email',
      name: 'onboard-email',
      component: () => import('@/views/onboarding/EmailStep.vue')
    },
    {
      path: '/onboard/verify',
      name: 'onboard-verify',
      component: () => import('@/views/onboarding/VerifyStep.vue')
    },
    {
      path: '/onboard/personal',
      name: 'onboard-personal',
      component: () => import('@/views/onboarding/PersonalStep.vue')
    },
    {
      path: '/onboard/business',
      name: 'onboard-business',
      component: () => import('@/views/onboarding/BusinessStep.vue')
    },
    {
      path: '/onboard/security',
      name: 'onboard-security',
      component: () => import('@/views/onboarding/SecurityStep.vue')
    },
    {
      path: '/onboard/complete',
      name: 'onboard-complete',
      component: () => import('@/views/onboarding/CompleteStep.vue')
    },

    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/org/forgot-password',
      name: 'org-forgot-password',
      component: () => import('@/views/OrgForgotPasswordView.vue'),
      meta: { guestOnly: true }
    },
    
    {
      path: '/org/accept-invite',
      name: 'org-accept-invite',
      component: () => import('@/views/AcceptInviteView.vue')
    },
    {
      path: '/2fa/enroll',
      name: '2fa-enroll',
      component: () => import('@/views/TwoFactorEnrollView.vue')
    },
    {
      path: '/2fa/challenge',
      name: '2fa-challenge',
      component: () => import('@/views/TwoFactorChallengeView.vue')
    },

  
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true }
    },

    {
      path: '/org/:orgId/dashboard',
      name: 'org-dashboard',
      component: () => import('@/views/OrgHomeView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/dashboard',
      name: 'branch-dashboard',
      component: () => import('@/views/BranchHomeView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/collect',
      name: 'branch-collect',
      component: () => import('@/views/BranchCollectView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/profile',
      name: 'branch-profile',
      component: () => import('@/views/BranchProfileView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/security',
      name: 'branch-security',
      component: () => import('@/views/BranchSecurityView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/documents',
      name: 'branch-documents',
      component: () => import('@/views/BranchDocumentsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/transactions',
      name: 'branch-transactions',
      component: () => import('@/views/BranchTransactionsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/payouts',
      name: 'branch-payouts',
      component: () => import('@/views/BranchPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/fraud',
      name: 'branch-fraud',
      component: () => import('@/views/BranchFraudActivityView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/analytics',
      name: 'branch-analytics',
      component: () => import('@/views/BranchAnalyticsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/payment-links',
      name: 'branch-payment-links',
      component: () => import('@/views/BranchPaymentLinksView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/invoices',
      name: 'branch-invoices',
      component: () => import('@/views/BranchInvoicesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/expenses',
      name: 'branch-expenses',
      component: () => import('@/views/BranchExpensesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/tags',
      name: 'branch-tags',
      component: () => import('@/views/BranchTagsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/petty-cash',
      name: 'branch-petty-cash',
      component: () => import('@/views/BranchPettyCashView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/transfers',
      name: 'branch-transfers',
      component: () => import('@/views/BranchTransfersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/support',
      name: 'branch-support',
      component: () => import('@/views/BranchSupportView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/bulk-invoices',
      name: 'branch-bulk-invoices',
      component: () => import('@/views/BranchBulkInvoicesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/invoice-schedules',
      name: 'branch-invoice-schedules',
      component: () => import('@/views/BranchInvoiceSchedulesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/recipient-suppressions',
      name: 'branch-recipient-suppressions',
      component: () => import('@/views/BranchRecipientSuppressionsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },

    {
      path: '/org/:orgId/documents',
      name: 'org-documents',
      component: () => import('@/views/OrgDocumentsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/profile',
      name: 'org-profile',
      component: () => import('@/views/OrgProfileView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/collect',
      name: 'org-collect',
      component: () => import('@/views/OrgCollectView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/audit-log',
      name: 'org-audit-log',
      component: () => import('@/views/OrgAuditLogView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
   
    {
      path: '/org/:orgId/security',
      name: 'org-security',
      component: () => import('@/views/OrgSecurityView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/support',
      name: 'org-support',
      component: () => import('@/views/OrgSupportView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },

    {
      path: '/org/:orgId/branches',
      name: 'org-branches',
      component: () => import('@/views/OrgBranchesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/transactions',
      name: 'org-transactions',
      component: () => import('@/views/OrgTransactionsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/limits',
      name: 'org-limits',
      component: () => import('@/views/OrgLimitsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/limits',
      name: 'branch-limits',
      component: () => import('@/views/BranchLimitsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/vaults',
      name: 'org-vaults',
      component: () => import('@/views/OrgVaultsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/scheduled-payouts',
      name: 'org-scheduled-payouts',
      component: () => import('@/views/OrgScheduledPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/scheduled-payouts',
      name: 'branch-scheduled-payouts',
      component: () => import('@/views/BranchScheduledPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/settlement-preferences',
      name: 'org-settlement-preferences',
      component: () => import('@/views/OrgSettlementPreferencesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/settlement-preferences',
      name: 'branch-settlement-preferences',
      component: () => import('@/views/BranchSettlementPreferencesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },

    {
      path: '/org/:orgId/directors',
      name: 'org-directors',
      component: () => import('@/views/OrgDirectorsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
  
    {
      path: '/org/:orgId/members',
      name: 'org-members',
      component: () => import('@/views/OrgMembersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
   
    {
      path: '/org/:orgId/credentials',
      name: 'org-credentials',
      component: () => import('@/views/OrgCredentialsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
  
    {
      path: '/org/:orgId/payouts',
      name: 'org-payouts',
      component: () => import('@/views/OrgPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    
    {
      path: '/org/:orgId/fraud',
      name: 'org-fraud',
      component: () => import('@/views/OrgFraudActivityView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/transfers',
      name: 'org-transfers',
      component: () => import('@/views/OrgTransfersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/statements',
      name: 'org-statements',
      component: () => import('@/views/OrgStatementsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/analytics',
      name: 'org-analytics',
      component: () => import('@/views/OrgAnalyticsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/bulk-payouts',
      name: 'org-bulk-payouts',
      component: () => import('@/views/OrgBulkPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/bulk-payouts',
      name: 'branch-bulk-payouts',
      component: () => import('@/views/BranchBulkPayoutsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/bulk-invoices',
      name: 'org-bulk-invoices',
      component: () => import('@/views/OrgBulkInvoicesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/invoice-schedules',
      name: 'org-invoice-schedules',
      component: () => import('@/views/OrgInvoiceSchedulesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/recipient-suppressions',
      name: 'org-recipient-suppressions',
      component: () => import('@/views/OrgRecipientSuppressionsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/payment-links',
      name: 'org-payment-links',
      component: () => import('@/views/OrgPaymentLinksView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/invoices',
      name: 'org-invoices',
      component: () => import('@/views/OrgInvoicesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/expenses',
      name: 'org-expenses',
      component: () => import('@/views/OrgExpensesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/tags',
      name: 'org-tags',
      component: () => import('@/views/OrgTagsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/petty-cash',
      name: 'org-petty-cash',
      component: () => import('@/views/OrgPettyCashView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },

    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return resolveLandingRoute(auth.meta!)
  }
  if (!auth.meta) {
    return true
  }

  if (to.name === 'home') {
    return resolveLandingRoute(auth.meta)
  }

  if (to.name === 'org-dashboard' || to.name === 'branch-dashboard') {
    if (to.params.orgId !== auth.meta.organizationId) {
      return resolveLandingRoute(auth.meta)
    }
 
    if (to.name === 'branch-dashboard' && auth.meta.memberType === 'branch_member') {
      if (to.params.branchId !== auth.meta.branchId) {
        return resolveLandingRoute(auth.meta)
      }
    }
  }

  const branchOperatorRoutes = [
    'branch-collect', 'branch-profile', 'branch-security', 'branch-transactions', 'branch-documents',
    'branch-payouts', 'branch-fraud', 'branch-payment-links', 'branch-invoices',
    'branch-expenses', 'branch-tags', 'branch-petty-cash', 'branch-analytics',
    'branch-scheduled-payouts', 'branch-bulk-payouts', 'branch-support',
    'branch-bulk-invoices', 'branch-invoice-schedules', 'branch-recipient-suppressions',
    'branch-settlement-preferences', 'branch-limits',
  ]
  if (typeof to.name === 'string' && branchOperatorRoutes.includes(to.name)) {
    if (to.params.orgId !== auth.meta.organizationId) {
      return resolveLandingRoute(auth.meta)
    }
    if (auth.meta.memberType === 'branch_member' && to.params.branchId !== auth.meta.branchId) {
      return resolveLandingRoute(auth.meta)
    }
  }

  if (
    to.name === 'org-documents' || to.name === 'org-profile' || to.name === 'org-directors' ||
    to.name === 'org-members' || to.name === 'org-credentials' || to.name === 'org-payouts' ||
    to.name === 'org-branches' || to.name === 'org-collect' || to.name === 'org-audit-log' ||
    to.name === 'org-security' || to.name === 'org-transactions' || to.name === 'org-limits' ||
    to.name === 'org-vaults' || to.name === 'org-scheduled-payouts' || to.name === 'org-fraud' ||
    to.name === 'org-transfers' || to.name === 'org-statements' || to.name === 'org-analytics' ||
    to.name === 'org-bulk-payouts' || to.name === 'org-petty-cash' || to.name === 'org-payment-links' ||
    to.name === 'org-invoices' || to.name === 'org-expenses' || to.name === 'org-tags' ||
    to.name === 'org-support' || to.name === 'org-bulk-invoices' || to.name === 'org-invoice-schedules' ||
    to.name === 'org-recipient-suppressions' || to.name === 'org-settlement-preferences'
  ) {
    if (to.params.orgId !== auth.meta.organizationId || auth.meta.memberType !== 'org_member') {
      return resolveLandingRoute(auth.meta)
    }
  }

  return true
})

export default router
