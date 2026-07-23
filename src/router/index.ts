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

    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
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

  if (
    to.name === 'org-documents' || to.name === 'org-profile' || to.name === 'org-directors' ||
    to.name === 'org-members' || to.name === 'org-credentials' || to.name === 'org-payouts' ||
    to.name === 'org-branches' || to.name === 'org-collect' || to.name === 'org-audit-log' ||
    to.name === 'org-security' || to.name === 'org-transactions' || to.name === 'org-limits' ||
    to.name === 'org-vaults' || to.name === 'org-scheduled-payouts' || to.name === 'org-fraud'
  ) {
    if (to.params.orgId !== auth.meta.organizationId || auth.meta.memberType !== 'org_member') {
      return resolveLandingRoute(auth.meta)
    }
  }

  return true
})

export default router
