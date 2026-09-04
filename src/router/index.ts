import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resolveLandingRoute } from '@/lib/landing'

// While an org is still assembling its compliance documents, only these
// onboarding-adjacent screens are reachable — everything else redirects to
// the documents view until the core KYB pack is uploaded.
const ONBOARDING_ALLOWED_ROUTES = new Set<string>([
  'org-documents',
  'org-directors',
  'org-members',
  'org-branches',
  'org-profile',
  'org-security',
  'org-notification-preferences',
  'org-support',
  'org-settings',
  '2fa-enroll',
  '2fa-challenge',
  'org-accept-invite',
])

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
      path: '/org/:orgId/branch/:branchId/transactions/:txnId',
      name: 'branch-transaction-detail',
      component: () => import('@/views/BranchTransactionDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/beneficiaries',
      name: 'branch-beneficiaries',
      component: () => import('@/views/BeneficiariesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/payouts/:payoutId',
      name: 'branch-payout-detail',
      component: () => import('@/views/BranchPayoutDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/approvals',
      name: 'branch-approvals',
      component: () => import('@/views/BranchApprovalsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/approvals/:requestId',
      name: 'branch-approval-detail',
      component: () => import('@/views/BranchApprovalDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/invoices/:invoiceId',
      name: 'branch-invoice-detail',
      component: () => import('@/views/BranchInvoiceDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/expenses/:expenseId',
      name: 'branch-expense-detail',
      component: () => import('@/views/BranchExpenseDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/suppliers',
      name: 'branch-suppliers',
      component: () => import('@/views/BranchSuppliersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/suppliers/:supplierId',
      name: 'branch-supplier-detail',
      component: () => import('@/views/BranchSupplierDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/suppliers-overview',
      name: 'branch-suppliers-overview',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'overview' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/supplier-payables',
      name: 'branch-supplier-payables',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'payables' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/supplier-invoices',
      name: 'branch-supplier-invoices',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'invoices' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/supplier-invoices/:docId',
      name: 'branch-supplier-invoice-detail',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'invoice-detail' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/purchase-orders',
      name: 'branch-purchase-orders',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'purchase-orders' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/purchase-orders/:docId',
      name: 'branch-purchase-order-detail',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'po-detail' },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/suppliers-analytics',
      name: 'branch-suppliers-analytics',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'analytics' },
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
      path: '/org/:orgId/settings',
      name: 'org-settings',
      component: () => import('@/views/SettingsHomeView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/settings',
      name: 'branch-settings',
      component: () => import('@/views/SettingsHomeView.vue'),
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
      path: '/org/:orgId/notification-preferences',
      name: 'org-notification-preferences',
      component: () => import('@/views/NotificationPreferencesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/roles-permissions',
      name: 'org-roles',
      component: () => import('@/views/OrgRolesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/notification-preferences',
      name: 'branch-notification-preferences',
      component: () => import('@/views/NotificationPreferencesView.vue'),
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
      path: '/org/:orgId/transactions/:txnId',
      name: 'org-transaction-detail',
      component: () => import('@/views/OrgTransactionDetailView.vue'),
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
      path: '/org/:orgId/scheduled-payouts/:scheduleId',
      name: 'org-scheduled-payout-detail',
      component: () => import('@/views/OrgScheduledPayoutDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/scheduled-payouts/:scheduleId',
      name: 'branch-scheduled-payout-detail',
      component: () => import('@/views/BranchScheduledPayoutDetailView.vue'),
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
      path: '/org/:orgId/webhooks',
      name: 'org-webhooks',
      component: () => import('@/views/OrgWebhooksView.vue'),
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
      path: '/org/:orgId/beneficiaries',
      name: 'org-beneficiaries',
      component: () => import('@/views/BeneficiariesView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/payouts/:payoutId',
      name: 'org-payout-detail',
      component: () => import('@/views/OrgPayoutDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/approvals',
      name: 'org-approvals',
      component: () => import('@/views/OrgApprovalsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/approvals/:kind/:requestId',
      name: 'org-approval-detail',
      component: () => import('@/views/OrgApprovalDetailView.vue'),
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
      path: '/org/:orgId/statements/entries/:entryId',
      name: 'org-statement-entry-detail',
      component: () => import('@/views/OrgStatementEntryDetailView.vue'),
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
      path: '/org/:orgId/financial-accounts',
      name: 'org-financial-accounts',
      component: () => import('@/views/OrgFinancialAccountsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/financial-accounts',
      name: 'branch-financial-accounts',
      component: () => import('@/views/BranchFinancialAccountsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/settlements',
      name: 'org-settlements',
      component: () => import('@/views/OrgSettlementsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/settlements/:settlementId',
      name: 'org-settlement-detail',
      component: () => import('@/views/OrgSettlementDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/settlements',
      name: 'branch-settlements',
      component: () => import('@/views/BranchSettlementsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/settlements/:settlementId',
      name: 'branch-settlement-detail',
      component: () => import('@/views/BranchSettlementDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/refunds',
      name: 'org-refunds',
      component: () => import('@/views/OrgRefundsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/refunds',
      name: 'branch-refunds',
      component: () => import('@/views/BranchRefundsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/reversals',
      name: 'org-reversals',
      component: () => import('@/views/OrgReversalsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/reversals',
      name: 'branch-reversals',
      component: () => import('@/views/BranchReversalsView.vue'),
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
      path: '/org/:orgId/bulk-payouts/:batchId',
      name: 'org-bulk-payout-detail',
      component: () => import('@/views/OrgBulkPayoutBatchDetailView.vue'),
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
      path: '/org/:orgId/branch/:branchId/bulk-payouts/:batchId',
      name: 'branch-bulk-payout-detail',
      component: () => import('@/views/BranchBulkPayoutBatchDetailView.vue'),
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
      path: '/org/:orgId/payment-links/new',
      name: 'org-payment-link-new',
      component: () => import('@/views/OrgPaymentLinkCreateView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/payment-links/:linkId',
      name: 'org-payment-link-detail',
      component: () => import('@/views/OrgPaymentLinkDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/payment-links/new',
      name: 'branch-payment-link-new',
      component: () => import('@/views/BranchPaymentLinkCreateView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/payment-links/:linkId',
      name: 'branch-payment-link-detail',
      component: () => import('@/views/BranchPaymentLinkDetailView.vue'),
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
      path: '/org/:orgId/invoices/:invoiceId',
      name: 'org-invoice-detail',
      component: () => import('@/views/OrgInvoiceDetailView.vue'),
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
      path: '/org/:orgId/expenses/:expenseId',
      name: 'org-expense-detail',
      component: () => import('@/views/OrgExpenseDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/customers',
      name: 'org-customers',
      component: () => import('@/views/OrgCustomersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/customers/:customerId',
      name: 'org-customer-detail',
      component: () => import('@/views/OrgCustomerDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/customers',
      name: 'branch-customers',
      component: () => import('@/views/BranchCustomersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/customers/:customerId',
      name: 'branch-customer-detail',
      component: () => import('@/views/BranchCustomerDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/suppliers',
      name: 'org-suppliers',
      component: () => import('@/views/OrgSuppliersView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/suppliers/:supplierId',
      name: 'org-supplier-detail',
      component: () => import('@/views/OrgSupplierDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/suppliers-overview',
      name: 'org-suppliers-overview',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'overview' },
      props: true,
    },
    {
      path: '/org/:orgId/supplier-payables',
      name: 'org-supplier-payables',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'payables' },
      props: true,
    },
    {
      path: '/org/:orgId/supplier-invoices',
      name: 'org-supplier-invoices',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'invoices' },
      props: true,
    },
    {
      path: '/org/:orgId/supplier-invoices/:docId',
      name: 'org-supplier-invoice-detail',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'invoice-detail' },
      props: true,
    },
    {
      path: '/org/:orgId/purchase-orders',
      name: 'org-purchase-orders',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'purchase-orders' },
      props: true,
    },
    {
      path: '/org/:orgId/purchase-orders/:docId',
      name: 'org-purchase-order-detail',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'po-detail' },
      props: true,
    },
    {
      path: '/org/:orgId/suppliers-analytics',
      name: 'org-suppliers-analytics',
      component: () => import('@/views/suppliers/SuppliersModuleView.vue'),
      meta: { requiresAuth: true, apPanel: 'analytics' },
      props: true,
    },
    {
      path: '/suppliers/onboard/:token',
      name: 'supplier-onboard',
      component: () => import('@/views/suppliers/SupplierOnboardView.vue'),
    },
    {
      path: '/customers/onboard/:token',
      name: 'customer-onboard',
      component: () => import('@/views/customers/CustomerOnboardView.vue'),
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
    {
      path: '/org/:orgId/settlement-calendar',
      name: 'org-settlement-calendar',
      component: () => import('@/views/OrgSettlementCalendarView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/org/:orgId/branch/:branchId/settlement-calendar',
      name: 'branch-settlement-calendar',
      component: () => import('@/views/BranchSettlementCalendarView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },

    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

// Org-member RBAC gate for state-changing sections. Mirrors the permission
// strings the backend middleware.OrgPermission enforces and the nav gating in
// DashboardLayout. Read-only sections are intentionally absent.
const ORG_ROUTE_PERMISSIONS: Record<string, string> = {
  'org-transfers': 'transfers.initiate',
  'org-invoices': 'invoices.manage',
  'org-invoice-detail': 'invoices.manage',
  'org-bulk-invoices': 'invoices.manage',
  'org-invoice-schedules': 'invoices.manage',
  'org-customers': 'customers.manage',
  'org-customer-detail': 'customers.manage',
  'org-suppliers': 'suppliers.manage',
  'org-supplier-detail': 'suppliers.manage',
  'org-suppliers-overview': 'suppliers.manage',
  'org-supplier-payables': 'suppliers.manage',
  'org-supplier-invoices': 'suppliers.manage',
  'org-supplier-invoice-detail': 'suppliers.manage',
  'org-purchase-orders': 'suppliers.manage',
  'org-purchase-order-detail': 'suppliers.manage',
  'org-suppliers-analytics': 'suppliers.manage',
}

router.beforeEach(async (to) => {
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

  if (
    to.meta.requiresAuth &&
    auth.meta.memberType === 'org_member' &&
    typeof to.name === 'string' &&
    !ONBOARDING_ALLOWED_ROUTES.has(to.name)
  ) {
    const complete = await auth.ensureOnboarding()
    if (!complete) {
      return { name: 'org-documents', params: { orgId: auth.meta.organizationId } }
    }
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
    'branch-collect', 'branch-profile', 'branch-security', 'branch-transactions', 'branch-transaction-detail', 'branch-documents', 'branch-settings',
    'branch-payouts', 'branch-payout-detail', 'branch-approvals', 'branch-approval-detail', 'branch-fraud', 'branch-payment-links', 'branch-payment-link-new', 'branch-payment-link-detail', 'branch-invoices', 'branch-invoice-detail',
    'branch-expenses', 'branch-expense-detail', 'branch-tags', 'branch-petty-cash', 'branch-analytics',
    'branch-scheduled-payouts', 'branch-scheduled-payout-detail', 'branch-bulk-payouts', 'branch-bulk-payout-detail', 'branch-transfers', 'branch-support',
    'branch-bulk-invoices', 'branch-invoice-schedules', 'branch-recipient-suppressions',
    'branch-beneficiaries',
    'branch-settlement-preferences', 'branch-limits',
    'branch-suppliers', 'branch-supplier-detail',
    'branch-customers', 'branch-customer-detail',
    'branch-suppliers-overview', 'branch-supplier-payables', 'branch-supplier-invoices',
    'branch-supplier-invoice-detail', 'branch-purchase-orders', 'branch-purchase-order-detail',
    'branch-suppliers-analytics',
    'branch-settlements', 'branch-settlement-detail', 'branch-settlement-calendar', 'branch-refunds', 'branch-reversals', 'branch-financial-accounts',
    'branch-notification-preferences',
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
    to.name === 'org-approvals' || to.name === 'org-approval-detail' ||
    to.name === 'org-documents' || to.name === 'org-profile' || to.name === 'org-directors' || to.name === 'org-settings' ||
    to.name === 'org-members' || to.name === 'org-credentials' || to.name === 'org-webhooks' || to.name === 'org-payouts' || to.name === 'org-payout-detail' ||
    to.name === 'org-beneficiaries' ||
    to.name === 'org-branches' || to.name === 'org-collect' || to.name === 'org-audit-log' ||
    to.name === 'org-security' || to.name === 'org-transactions' || to.name === 'org-transaction-detail' || to.name === 'org-limits' ||
    to.name === 'org-notification-preferences' || to.name === 'org-roles' ||
    to.name === 'org-vaults' || to.name === 'org-scheduled-payouts' || to.name === 'org-scheduled-payout-detail' || to.name === 'org-fraud' ||
    to.name === 'org-transfers' || to.name === 'org-statements' || to.name === 'org-statement-entry-detail' || to.name === 'org-analytics' ||
    to.name === 'org-bulk-payouts' || to.name === 'org-bulk-payout-detail' || to.name === 'org-petty-cash' || to.name === 'org-payment-links' ||
    to.name === 'org-payment-link-new' || to.name === 'org-payment-link-detail' ||
    to.name === 'org-invoices' || to.name === 'org-invoice-detail' || to.name === 'org-expenses' || to.name === 'org-expense-detail' || to.name === 'org-tags' ||
    to.name === 'org-suppliers' || to.name === 'org-supplier-detail' ||
    to.name === 'org-customers' || to.name === 'org-customer-detail' ||
    to.name === 'org-suppliers-overview' || to.name === 'org-supplier-payables' ||
    to.name === 'org-supplier-invoices' || to.name === 'org-supplier-invoice-detail' ||
    to.name === 'org-purchase-orders' || to.name === 'org-purchase-order-detail' ||
    to.name === 'org-suppliers-analytics' ||
    to.name === 'org-support' || to.name === 'org-bulk-invoices' || to.name === 'org-invoice-schedules' ||
    to.name === 'org-recipient-suppressions' || to.name === 'org-settlement-preferences' ||
    to.name === 'org-settlements' || to.name === 'org-settlement-detail' || to.name === 'org-refunds' || to.name === 'org-reversals' ||
    to.name === 'org-financial-accounts'
  ) {
    if (to.params.orgId !== auth.meta.organizationId || auth.meta.memberType !== 'org_member') {
      return resolveLandingRoute(auth.meta)
    }
  }

  if (
    typeof to.name === 'string' &&
    ORG_ROUTE_PERMISSIONS[to.name] &&
    auth.meta.memberType === 'org_member' &&
    auth.meta.role !== 'owner'
  ) {
    if (!auth.permissionsLoaded) {
      await auth.loadPermissions()
    }
    if (!auth.can(ORG_ROUTE_PERMISSIONS[to.name])) {
      return resolveLandingRoute(auth.meta)
    }
  }

  return true
})

export default router
