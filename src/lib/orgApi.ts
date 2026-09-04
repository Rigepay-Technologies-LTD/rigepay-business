import { http } from './http'

export interface WalletBalances {
  main_cents: number
  escrow_cents: number
  chargeback_cents: number
}

export interface BranchSummary {
  id: string
  name: string
  location?: string
  collection_code: string
  status: string
  manager_email: string
  main_cents: number
  escrow_cents: number
  chargeback_cents: number

  parent_organization_identifier: string | null
  branch_type: string | null
  relationship_declaration: string | null
  operating_address: string | null
  contact_person_name: string | null
  contact_person_email: string | null
  contact_person_phone: string | null
  settlement_mode: string
  settlement_bank_name: string | null
  settlement_bank_code: string | null
  settlement_bank_account_number: string | null
  branch_tax_license_number: string | null
  risk_score: number
}

export interface CreateBranchInput {
  name: string
  location?: string
  manager_first_name: string
  manager_last_name: string
  manager_email: string
  manager_phone: string
  parent_organization_identifier?: string
  branch_type?: string
  relationship_declaration?: string
  operating_address?: string
  contact_person_name?: string
  contact_person_email?: string
  contact_person_phone?: string
  settlement_mode?: string
  settlement_bank_name?: string
  settlement_bank_code?: string
  settlement_bank_account_number?: string
  branch_tax_license_number?: string
}

export interface CreateBranchResult {
  id: string
  name: string
  collection_code: string
  manager_email: string
  temp_password: string
}


export async function createOrgBranch(input: CreateBranchInput): Promise<CreateBranchResult> {
  const res = await http.post<{ status: string; data: CreateBranchResult }>('/org/v1/org-branches', input)
  return res.data.data
}

export interface UpdateBranchInput {
  location?: string
  branch_type?: string
  relationship_declaration?: string
  operating_address?: string
  contact_person_name?: string
  contact_person_email?: string
  contact_person_phone?: string
  settlement_mode?: string
  settlement_bank_name?: string
  settlement_bank_code?: string
  settlement_bank_account_number?: string
  branch_tax_license_number?: string
}

export async function updateOrgBranch(branchId: string, input: UpdateBranchInput): Promise<void> {
  await http.put(`/org/v1/org-branches/${branchId}`, input)
}

export interface BranchesResponse {
  rollup: WalletBalances
  branch_count: number
  page: number
  page_size: number
  total_pages: number
  branches: BranchSummary[]
}

export interface Transaction {
  id: string
  type: string
  status: string
  amountCents: number
  feeCents: number
  rail: string
  reference: string
  ledgerTxnId: string
  description: string
  created_at: string
}

export interface PaginatedTransactions {
  total_count: number
  page: number
  page_size: number
  total_pages: number
  transactions: Transaction[]
}

export interface TransactionSearchParams {
  page?: number
  page_size?: number
  search?: string
  start_date?: string
  end_date?: string
  branch_id?: string
}


export async function fetchOrgBranches(params?: { page?: number; page_size?: number }): Promise<BranchesResponse> {
  const res = await http.get<{ status: string; data: BranchesResponse }>('/org/v1/org-branches', { params })
  return res.data.data
}

export interface SiblingBranch {
  id: string
  name: string
  collection_code: string
}


export async function fetchSiblingBranches(): Promise<SiblingBranch[]> {
  const res = await http.get<{ status: string; data: SiblingBranch[] }>('/org/v1/branch/sibling-branches')
  return res.data.data
}


export async function fetchOrgTransactions(params: TransactionSearchParams): Promise<PaginatedTransactions> {
  const res = await http.get<{ status: string; data: PaginatedTransactions }>('/org/v1/transactions', { params })
  return res.data.data
}


export async function fetchBranchWallets(): Promise<WalletBalances> {
  const res = await http.get<{ status: string; data: WalletBalances }>('/org/v1/branch/wallets')
  return res.data.data
}

export interface BranchProfileDetail {
  id: string
  name: string
  location?: string
  collection_code: string
  status: string
  manager_email: string
  parent_organization_identifier: string | null
  branch_type: string | null
  relationship_declaration: string | null
  operating_address: string | null
  contact_person_name: string | null
  contact_person_email: string | null
  contact_person_phone: string | null
  settlement_mode: string
  settlement_bank_name: string | null
  settlement_bank_code: string | null
  settlement_bank_account_number: string | null
  branch_tax_license_number: string | null
  risk_score: number
}


export async function fetchBranchProfile(): Promise<BranchProfileDetail> {
  const res = await http.get<{ status: string; data: BranchProfileDetail }>('/org/v1/branch/profile')
  return res.data.data
}


export interface TransactionDetail extends Transaction {
  currency: string
  settlement_status: string
  externalTxnId?: string | null
  customer_phone?: string
  customer_name?: string
  metadata?: Record<string, unknown> | null
}

export async function fetchOrgTransaction(id: string): Promise<TransactionDetail> {
  const res = await http.get<{ status: string; data: TransactionDetail }>(`/org/v1/transactions/${id}`)
  return res.data.data
}

export async function fetchBranchTransaction(id: string): Promise<TransactionDetail> {
  const res = await http.get<{ status: string; data: TransactionDetail }>(`/org/v1/branch/transactions/${id}`)
  return res.data.data
}

export async function openTransactionReceipt(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? `/org/v1/branch/transactions/${id}/receipt` : `/org/v1/transactions/${id}/receipt`
  const res = await http.get(base, { responseType: 'blob' })
  const ct = String(res.headers['content-type'] || '')
  if (ct.includes('application/json')) {
    const text = await (res.data as Blob).text()
    const url = JSON.parse(text)?.data?.url
    if (url) {
      window.open(url, '_blank', 'noopener')
      return
    }
    throw new Error('Receipt is not available yet.')
  }
  const blobUrl = URL.createObjectURL(res.data as Blob)
  window.open(blobUrl, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

export interface RelatedRefundRow {
  id: string
  created_at: string
  amount_cents: number
  currency: string
  rail: string
  status: string
  reason: string
  source: string
  completed_at?: string | null
}
export interface RelatedReversalRow {
  transaction_id: string
  created_at: string
  type: string
  status: string
  rail: string
  reference: string
  amount_cents: number
  fee_cents: number
  details: string
}
export interface TransactionRelated {
  transaction_id: string
  balance_before_cents?: number | null
  balance_after_cents?: number | null
  refunds: RelatedRefundRow[]
  reversals: RelatedReversalRow[]
}
export async function fetchTransactionRelated(id: string, isBranch: boolean): Promise<TransactionRelated> {
  const base = isBranch ? `/org/v1/branch/transactions/${id}/related` : `/org/v1/transactions/${id}/related`
  const res = await http.get<{ status: string; data: TransactionRelated }>(base)
  return res.data.data
}

export interface OrgLimitsSnapshot {
  is_active: boolean
  using_defaults: boolean
  daily_payout_amount_cents: number
  daily_payout_amount_used_cents: number
  daily_payout_count: number
  daily_payout_count_used: number
  daily_collection_amount_cents: number
  daily_collection_amount_used_cents: number
  daily_collection_count: number
  daily_collection_count_used: number
  daily_payout_amount_used_cents_org: number
  daily_payout_amount_used_cents_branch: number
  daily_payout_count_used_org: number
  daily_payout_count_used_branch: number
  daily_collection_amount_used_cents_org: number
  daily_collection_amount_used_cents_branch: number
  daily_collection_count_used_org: number
  daily_collection_count_used_branch: number
}


export async function fetchOrgLimits(): Promise<OrgLimitsSnapshot> {
  const res = await http.get<{ status: string; data: OrgLimitsSnapshot }>('/org/v1/limits')
  return res.data.data
}

export async function fetchBranchLimits(): Promise<OrgLimitsSnapshot> {
  const res = await http.get<{ status: string; data: OrgLimitsSnapshot }>('/org/v1/branch/limits')
  return res.data.data
}

export interface LimitChangeRequestInput {
  requested_daily_payout_amount_cents?: number
  requested_daily_payout_count?: number
  requested_daily_collection_amount_cents?: number
  requested_daily_collection_count?: number
  reason: string
}


export async function requestLimitChange(input: LimitChangeRequestInput): Promise<string> {
  const res = await http.post<{ status: string; message: string }>('/org/v1/limits/request-change', input)
  return res.data.message
}

export async function requestBranchLimitChange(input: LimitChangeRequestInput): Promise<string> {
  const res = await http.post<{ status: string; message: string }>('/org/v1/branch/limits/request-change', input)
  return res.data.message
}

export interface CashFlowDayPoint {
  date: string
  collections_cents: number
  payouts_cents: number
  net_flow_cents: number
}


export async function fetchOrgCashFlow(days = 14): Promise<CashFlowDayPoint[]> {
  const res = await http.get<{ status: string; data: CashFlowDayPoint[] }>('/org/v1/analytics/cashflow', { params: { days } })
  return res.data.data
}

export async function fetchBranchCashFlow(days = 14): Promise<CashFlowDayPoint[]> {
  const res = await http.get<{ status: string; data: CashFlowDayPoint[] }>('/org/v1/branch/analytics/cashflow', { params: { days } })
  return res.data.data
}

export interface KpiMetric {
  cents: number
  prev_cents: number
  count?: number
  delta_pct: number
  delta_dir: 'up' | 'down' | 'flat'
}

export interface DashboardKpis {
  available_balance_cents: number
  escrow_cents: number
  settlement_due_cents: number
  todays_collections: KpiMetric
  todays_payouts: KpiMetric
  window_start: string
  generated_at: string
}

export async function fetchOrgDashboardKpis(branchId?: string): Promise<DashboardKpis> {
  const res = await http.get<{ status: string; data: DashboardKpis }>('/org/v1/dashboard/kpis', {
    params: branchId ? { branch_id: branchId } : undefined,
  })
  return res.data.data
}

export async function fetchBranchDashboardKpis(): Promise<DashboardKpis> {
  const res = await http.get<{ status: string; data: DashboardKpis }>('/org/v1/branch/dashboard/kpis')
  return res.data.data
}

export interface CollectionInstructions {
  collection_code: string
  mpesa_paybill: string
  kcb_account_number: string
  stanbic_account_number: string
}


export async function fetchCollectionInstructions(
  isBranchSession: boolean,
  branchId?: string,
): Promise<CollectionInstructions> {
  const path = isBranchSession ? '/org/v1/branch/collection-instructions' : '/org/v1/collection-instructions'
  const res = await http.get<{ status: string; data: CollectionInstructions }>(path, {
    params: branchId ? { branch_id: branchId } : undefined,
  })
  return res.data.data
}


export type StkChannel = 'mpesa' | 'airtel' | 'tkash' | 'wallet'

export interface StkPushInput {
  amount_cents: number
  customer_phone: string
  remarks?: string
  branch_id?: string
  channel?: StkChannel
}

export interface StkPushResult {
  checkout_request_id: string
  merchant_request_id: string
  customer_message: string
  provider: string
  reference: string
  wallet_id: string
  requires_otp?: boolean
  channel?: string
}


export async function requestStkPush(isBranchSession: boolean, input: StkPushInput): Promise<StkPushResult> {
  const path = isBranchSession ? '/org/v1/branch/collect/stk-push' : '/org/v1/collect/stk-push'
  const res = await http.post<{ status: string; data: StkPushResult }>(path, input)
  return res.data.data
}

export interface CompleteSasaPayOtpInput {
  checkout_request_id: string
  otp: string
}


export async function confirmSasaPayOtp(isBranchSession: boolean, input: CompleteSasaPayOtpInput): Promise<{ status: string; message: string }> {
  const path = isBranchSession ? '/org/v1/branch/collect/sasapay/complete-otp' : '/org/v1/collect/sasapay/complete-otp'
  const res = await http.post<{ status: string; message: string }>(path, input)
  return res.data
}

export interface BranchDocument {
  id: string
  doc_type: string
  status: string
  created_at: string
  expires_at: string | null
}


export async function fetchBranchDocuments(branchId: string): Promise<BranchDocument[]> {
  const res = await http.get<{ status: string; data: BranchDocument[] }>(`/org/v1/org-branches/${branchId}/documents`)
  return res.data.data
}

export async function uploadBranchDocument(branchId: string, file: File, docType: string): Promise<BranchDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: BranchDocument }>(`/org/v1/org-branches/${branchId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function fetchBranchTransactions(
  params: Omit<TransactionSearchParams, 'branch_id'>,
): Promise<PaginatedTransactions> {
  const res = await http.get<{ status: string; data: PaginatedTransactions }>('/org/v1/branch/transactions', { params })
  return res.data.data
}

export interface OrgDocument {
  id: string
  doc_type: string
  status: string
  created_at: string
  expires_at: string | null
}


export async function fetchOrgDocuments(): Promise<OrgDocument[]> {
  const res = await http.get<{ status: string; data: OrgDocument[] }>('/org/v1/documents')
  return res.data.data
}

export interface VerificationInfoRequest {
  id: string
  message: string
  status: 'open' | 'supplied' | 'cancelled'
  response_note: string
  created_at: string
}

export async function fetchOrgVerificationRequests(): Promise<VerificationInfoRequest[]> {
  const res = await http.get<{ status: string; data: VerificationInfoRequest[] }>(
    '/org/v1/verification/open-requests',
  )
  return res.data.data ?? []
}

export async function supplyOrgVerificationInfo(id: string, responseNote: string): Promise<void> {
  await http.post(`/org/v1/verification/info-requests/${id}`, { response_note: responseNote })
}

export async function uploadOrgDocument(file: File, docType: string): Promise<OrgDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: OrgDocument }>('/org/v1/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function fetchOwnBranchMemberDocuments(): Promise<OrgDocument[]> {
  const res = await http.get<{ status: string; data: OrgDocument[] }>('/org/v1/branch/documents')
  return res.data.data
}

export async function uploadOwnBranchMemberDocument(file: File, docType: string): Promise<OrgDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: OrgDocument }>('/org/v1/branch/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function fetchOwnBranchMemberDocumentUrl(docId: string): Promise<string> {
  const res = await http.get<{ status: string; data: { url: string } }>(`/org/v1/branch/documents/${docId}`)
  return res.data.data.url
}

export async function fetchOrgScopedDocumentUrl(docId: string): Promise<string> {
  const res = await http.get<{ status: string; data: { url: string } }>(`/org/v1/documents/${docId}`)
  return res.data.data.url
}

export interface OrgProfile {
  legal_name: string
  brs_registration_number: string | null
  kra_pin: string | null
  business_type: string | null
  phone: string | null
  country: string | null
  county: string | null
  sub_county: string | null
  region: string | null
  location: string | null
  nearest_landmark: string | null
  year_of_registration: number | null
  website: string | null
  industry: string | null
  employee_count: number | null
  annual_revenue_cents: number | null
  tax_residency_country: string | null
  status: string
  trading_name: string | null
  entity_type: string | null
  date_of_incorporation: string | null
  registered_office_address: string | null
  principal_place_of_business: string | null
  business_email: string | null
  mcc_code: string | null
  nature_of_business_description: string | null
  estimated_monthly_volume_cents: number | null
  estimated_transaction_count: number | null
  regulatory_license_number: string | null
  regulatory_license_expiry: string | null
  collection_code: string | null
  wallet: WalletBalances
  risk_score: number
}

export interface OrgMemberProfile {
  first_name: string
  last_name: string
  email: string
  role: string
  phone: string | null
  has_national_id: boolean
}

export interface ProfileResponse {
  organization: OrgProfile
  member: OrgMemberProfile
}

export interface ProfileUpdateInput {
  website?: string
  industry?: string
  employee_count?: number
  annual_revenue_cents?: number
  tax_residency_country?: string
  member_phone?: string
  member_national_id_number?: string
  trading_name?: string
  entity_type?: string
  date_of_incorporation?: string
  registered_office_address?: string
  principal_place_of_business?: string
  business_email?: string
  mcc_code?: string
  nature_of_business_description?: string
  estimated_monthly_volume_cents?: number
  estimated_transaction_count?: number
  regulatory_license_number?: string
  regulatory_license_expiry?: string
}

export async function fetchOrgProfile(): Promise<ProfileResponse> {
  const res = await http.get<{ status: string; data: ProfileResponse }>('/org/v1/profile')
  return res.data.data
}


export async function updateOrgProfile(input: ProfileUpdateInput): Promise<void> {
  await http.put('/org/v1/profile', input)
}

export type OrgIdentityChangeField = 'legal_name' | 'brs_registration_number' | 'kra_pin'

export interface OrgIdentityChangeRequest {
  id: string
  organization_id: string
  field: OrgIdentityChangeField
  old_value: string | null
  new_value: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string | null
  created_at: string
  reviewed_at?: string | null
}

export async function requestOrgIdentityChange(field: OrgIdentityChangeField, newValue: string): Promise<void> {
  await http.post('/org/v1/profile/identity-change-request', { field, new_value: newValue })
}

export async function fetchOrgIdentityChangeRequests(): Promise<OrgIdentityChangeRequest[]> {
  const res = await http.get<{ status: string; data: OrgIdentityChangeRequest[] }>('/org/v1/profile/identity-change-requests')
  return res.data.data
}

export interface OrgDirector {
  id: string
  full_name: string
  ownership_percent: number
  is_pep: boolean
  last_screened_at: string | null
  created_at: string
  has_kyc_details: boolean
}

export interface DirectorInput {
  full_name: string
  national_id_number: string
  ownership_percent: number
  is_pep: boolean
  date_of_birth?: string
  nationality?: string
  tax_id_number?: string
  residential_address?: string
  phone_number?: string
  email?: string
}

export interface DirectorUpdateInput {
  full_name?: string
  national_id_number?: string
  ownership_percent?: number
  is_pep?: boolean
  date_of_birth?: string
  nationality?: string
  tax_id_number?: string
  residential_address?: string
  phone_number?: string
  email?: string
}


export async function fetchOrgDirectors(): Promise<OrgDirector[]> {
  const res = await http.get<{ status: string; data: OrgDirector[] }>('/org/v1/directors')
  return res.data.data
}

export async function createOrgDirector(input: DirectorInput): Promise<OrgDirector> {
  const res = await http.post<{ status: string; data: OrgDirector }>('/org/v1/directors', input)
  return res.data.data
}

export async function updateOrgDirector(directorId: string, input: DirectorUpdateInput): Promise<OrgDirector> {
  const res = await http.put<{ status: string; data: OrgDirector }>(`/org/v1/directors/${directorId}`, input)
  return res.data.data
}

export interface DirectorDocument {
  id: string
  doc_type: string
  status: string
  created_at: string
  expires_at: string | null
}


export async function fetchDirectorDocuments(directorId: string): Promise<DirectorDocument[]> {
  const res = await http.get<{ status: string; data: DirectorDocument[] }>(`/org/v1/directors/${directorId}/documents`)
  return res.data.data
}

export async function uploadDirectorDocument(directorId: string, file: File, docType: string): Promise<DirectorDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: DirectorDocument }>(`/org/v1/directors/${directorId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}


export interface OrgMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  last_login_at?: string | null
  can_initiate_payments: boolean
  phone: string | null
  has_national_id: boolean
  has_tax_id: boolean
  corporate_designation: string | null
  is_signatory: boolean
  signing_mandate: string | null
  custom_role_id?: string | null
}

export interface RBACPermission {
  key: string
  label: string
  group: string
}
export interface OrgCustomRole {
  id: string
  organization_id: string
  name: string
  description: string
  permissions: string[]
  created_at: string
}
export interface MemberRBAC {
  custom_role_id?: string | null
  per_txn_cents: number
  daily_cents: number
}
export interface MyRBAC {
  role: string
  is_owner: boolean
  has_custom_role: boolean
  permissions: string[]
}
export async function fetchMyRBAC(): Promise<MyRBAC> {
  const res = await http.get<{ status: string; data: MyRBAC }>('/org/v1/rbac/me')
  return res.data.data
}
export async function fetchRBACPermissions(): Promise<RBACPermission[]> {
  const res = await http.get<{ status: string; data: RBACPermission[] }>('/org/v1/rbac/permissions')
  return res.data.data
}
export async function fetchCustomRoles(): Promise<OrgCustomRole[]> {
  const res = await http.get<{ status: string; data: OrgCustomRole[] }>('/org/v1/rbac/roles')
  return res.data.data
}
export async function createCustomRole(input: { name: string; description?: string; permissions: string[] }): Promise<OrgCustomRole> {
  const res = await http.post<{ status: string; data: OrgCustomRole }>('/org/v1/rbac/roles', input)
  return res.data.data
}
export async function updateCustomRole(id: string, input: { name?: string; description?: string; permissions?: string[] }): Promise<OrgCustomRole> {
  const res = await http.patch<{ status: string; data: OrgCustomRole }>(`/org/v1/rbac/roles/${id}`, input)
  return res.data.data
}
export async function deleteCustomRole(id: string): Promise<void> {
  await http.delete(`/org/v1/rbac/roles/${id}`)
}
export async function fetchMemberRBAC(memberId: string): Promise<MemberRBAC> {
  const res = await http.get<{ status: string; data: MemberRBAC }>(`/org/v1/rbac/members/${memberId}`)
  return res.data.data
}
export async function assignMemberRBAC(
  memberId: string,
  input: { custom_role_id?: string | null; per_txn_cents?: number; daily_cents?: number },
): Promise<void> {
  await http.put(`/org/v1/rbac/members/${memberId}`, input)
}
export async function fetchRequireApprovedPayees(): Promise<boolean> {
  const res = await http.get<{ status: string; data: { require_approved_payees: boolean } }>('/org/v1/rbac/require-approved-payees')
  return res.data.data.require_approved_payees
}
export async function setRequireApprovedPayees(enabled: boolean): Promise<void> {
  await http.put('/org/v1/rbac/require-approved-payees', { enabled })
}

export interface UpdateMemberInput {
  corporate_designation?: string
  is_signatory?: boolean
  signing_mandate?: string
  phone?: string
  national_id_number?: string
  tax_id_number?: string
  can_initiate_payments?: boolean
  role?: string
}

export async function fetchOrgMember(memberId: string): Promise<OrgMember> {
  const res = await http.get<{ status: string; data: OrgMember }>(`/org/v1/members/${memberId}`)
  return res.data.data
}

export async function updateOrgMember(memberId: string, input: UpdateMemberInput): Promise<void> {
  await http.put(`/org/v1/members/${memberId}`, input)
}

export async function suspendOrgMember(memberId: string): Promise<void> {
  await http.post(`/org/v1/members/${memberId}/suspend`)
}

export async function reactivateOrgMember(memberId: string): Promise<void> {
  await http.post(`/org/v1/members/${memberId}/reactivate`)
}

export async function resetOrgMemberPassword(memberId: string): Promise<string> {
  const res = await http.post<{ status: string; message: string }>(`/org/v1/members/${memberId}/reset-password`)
  return res.data.message
}

export async function fetchOrgMembers(): Promise<OrgMember[]> {
  const res = await http.get<{ status: string; data: OrgMember[] }>('/org/v1/members')
  return res.data.data
}

export interface InviteMemberInput {
  email: string
  role: string
  branch_id?: string
  can_initiate_payments?: boolean
  corporate_designation?: string
  is_signatory?: boolean
  signing_mandate?: string
}

export async function inviteOrgMember(input: InviteMemberInput): Promise<void> {
  await http.post('/org/v1/members/invite', input)
}

export interface AcceptInviteInput {
  token: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  national_id_number?: string
  tax_id_number?: string
}

export async function acceptOrgInvite(input: AcceptInviteInput): Promise<void> {
  await http.post('/org/v1/members/accept-invite', input)
}

export interface MemberDocument {
  id: string
  doc_type: string
  status: string
  created_at: string
  expires_at: string | null
}

export async function fetchMemberDocuments(memberId: string): Promise<MemberDocument[]> {
  const res = await http.get<{ status: string; data: MemberDocument[] }>(`/org/v1/members/${memberId}/documents`)
  return res.data.data
}

export async function uploadMemberDocument(memberId: string, file: File, docType: string): Promise<MemberDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: MemberDocument }>(`/org/v1/members/${memberId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export interface OrgCredential {
  id: string
  client_id: string
  name?: string
  description?: string
  branch_ids: string[]
  scopes: string[]
  status: string
  created_at: string
}

export interface CreateCredentialInput {
  name?: string
  description?: string
  branch_ids?: string[]
  scopes: string[]
}

export const API_CLIENT_SCOPES = [
  { value: 'collections:read', label: 'collections:read' },
  { value: 'collections:write', label: 'collections:write' },
  { value: 'payouts:read', label: 'payouts:read' },
  { value: 'payouts:write', label: 'payouts:write' },
  { value: 'transfers:read', label: 'transfers:read' },
  { value: 'transfers:write', label: 'transfers:write' },
  { value: 'checkout:read', label: 'checkout:read' },
  { value: 'checkout:write', label: 'checkout:write' },
  { value: 'invoices:read', label: 'invoices:read' },
  { value: 'invoices:write', label: 'invoices:write' },
  { value: 'balance:read', label: 'balance:read' },
  { value: 'transactions:read', label: 'transactions:read' },
  { value: 'screening:read', label: 'screening:read' },
  { value: 'utils:read', label: 'utils:read' },
] as const

export interface CreateCredentialResult extends OrgCredential {
  client_secret: string
}

export async function fetchOrgCredentials(): Promise<OrgCredential[]> {
  const res = await http.get<{ status: string; data: OrgCredential[] }>('/org/v1/credentials')
  return res.data.data
}

export async function createOrgCredential(input: CreateCredentialInput): Promise<CreateCredentialResult> {
  const res = await http.post<{ status: string; data: CreateCredentialResult }>('/org/v1/credentials', input)
  return res.data.data
}

export async function revokeOrgCredential(id: string): Promise<void> {
  await http.delete(`/org/v1/credentials/${id}`)
}

export interface RotateCredentialResult {
  id: string
  client_secret: string
}

export async function rotateOrgCredential(id: string): Promise<RotateCredentialResult> {
  const res = await http.post<{ status: string; data: RotateCredentialResult }>(`/org/v1/credentials/${id}/rotate`)
  return res.data.data
}

export type ApiKeyAuthScheme = 'bearer' | 'hmac'

export interface OrgApiKey {
  id: string
  name: string
  auth_scheme: ApiKeyAuthScheme
  key_id?: string
  prefix: string
  display: string
  branch_id: string | null
  scopes: string[]
  status: string
  created_at: string
}

export interface CreateApiKeyInput {
  name: string
  branch_id?: string
  scopes: string[]
  auth_scheme?: ApiKeyAuthScheme
}

export interface CreateApiKeyResult {
  id: string
  name: string
  auth_scheme: ApiKeyAuthScheme
  branch_id: string | null
  scopes: string[]
  full_key?: string
  key_prefix?: string
  key_id?: string
  secret?: string
}

export async function fetchOrgApiKeys(): Promise<OrgApiKey[]> {
  const res = await http.get<{ status: string; data: OrgApiKey[] }>('/org/v1/api-keys')
  return res.data.data
}

export async function createOrgApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const res = await http.post<{ status: string; data: CreateApiKeyResult }>('/org/v1/api-keys', input)
  return res.data.data
}

export async function revokeOrgApiKey(id: string): Promise<void> {
  await http.delete(`/org/v1/api-keys/${id}`)
}

export interface RotateApiKeyResult {
  id: string
  auth_scheme: ApiKeyAuthScheme
  full_key?: string
  key_prefix?: string
  key_id?: string
  secret?: string
}

export async function rotateOrgApiKey(id: string): Promise<RotateApiKeyResult> {
  const res = await http.post<{ status: string; data: RotateApiKeyResult }>(`/org/v1/api-keys/${id}/rotate`)
  return res.data.data
}

export const WEBHOOK_EVENT_TYPES = [
  'collection.completed',
  'collection.failed',
  'payout.completed',
  'payout.failed',
  'transfer.completed',
  'checkout.session.completed',
] as const

export interface OrgWebhookEndpoint {
  id: string
  name?: string
  description?: string
  url: string
  event_types: string[]
  is_active: boolean
  environment?: string
  last_success_at?: string
  created_at: string
}

export interface CreateWebhookEndpointInput {
  name?: string
  description?: string
  url: string
  event_types: string[]
}

export interface WebhookStats {
  active_endpoints: number
  successful_deliveries: number
  failed_deliveries: number
  pending_retries: number
  success_rate: number
}

export interface WebhookEventTypeInfo {
  event_type: string
  description: string
}

export async function fetchOrgWebhookStats(): Promise<WebhookStats> {
  const res = await http.get<{ status: string; data: WebhookStats }>('/org/v1/webhook-endpoints/stats')
  return res.data.data
}

export async function fetchOrgWebhookEventTypes(): Promise<WebhookEventTypeInfo[]> {
  const res = await http.get<{ status: string; data: WebhookEventTypeInfo[] }>('/org/v1/webhook-endpoints/event-types')
  return res.data.data
}

export async function fetchOrgAllWebhookDeliveries(limit = 100): Promise<OrgWebhookDelivery[]> {
  const res = await http.get<{ status: string; data: OrgWebhookDelivery[] }>('/org/v1/webhook-endpoints/deliveries', { params: { limit } })
  return res.data.data
}

export async function setOrgWebhookEndpointActive(id: string, active: boolean): Promise<void> {
  await http.post(`/org/v1/webhook-endpoints/${id}/status`, { active })
}

export interface WebhookTestResult {
  reachable: boolean
  status_code?: number
  error?: string
  duration_ms: number
}

export async function testOrgWebhookEndpoint(id: string): Promise<WebhookTestResult> {
  const res = await http.post<{ status: string; data: WebhookTestResult }>(`/org/v1/webhook-endpoints/${id}/test`)
  return res.data.data
}

export async function testOrgWebhookUrl(url: string): Promise<{ valid: boolean; normalized?: string; reachable?: boolean; status_code?: number; error?: string }> {
  const res = await http.post<{ status: string; data: { valid: boolean; normalized?: string; reachable?: boolean; status_code?: number; error?: string } }>(
    '/org/v1/webhook-endpoints/test-url', { url },
  )
  return res.data.data
}

export async function updateOrgWebhookEndpoint(
  id: string, fields: { name?: string; description?: string; url?: string; event_types?: string[] },
): Promise<void> {
  await http.patch(`/org/v1/webhook-endpoints/${id}`, fields)
}

export interface CreateWebhookEndpointResult extends OrgWebhookEndpoint {
  secret: string
  test?: { reachable: boolean; status_code?: number; error?: string; duration_ms: number }
}

export interface OrgWebhookDelivery {
  id: string
  event_type: string
  status: string
  attempt_count: number
  last_attempted_at: string | null
  last_response_code: number | null
  last_error: string | null
  next_retry_at: string | null
  created_at: string
}

export async function fetchOrgWebhookEndpoints(): Promise<OrgWebhookEndpoint[]> {
  const res = await http.get<{ status: string; data: OrgWebhookEndpoint[] }>('/org/v1/webhook-endpoints')
  return res.data.data
}

export async function createOrgWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<CreateWebhookEndpointResult> {
  const res = await http.post<{ status: string; data: CreateWebhookEndpointResult }>('/org/v1/webhook-endpoints', input)
  return res.data.data
}

export async function deleteOrgWebhookEndpoint(id: string): Promise<void> {
  await http.delete(`/org/v1/webhook-endpoints/${id}`)
}

export async function fetchOrgWebhookDeliveries(endpointId: string): Promise<OrgWebhookDelivery[]> {
  const res = await http.get<{ status: string; data: OrgWebhookDelivery[] }>(`/org/v1/webhook-endpoints/${endpointId}/deliveries`)
  return res.data.data
}


export interface RequestPayoutInput {
  amount: number
  phone_number?: string
  shortcode?: string
  account_reference?: string
  recipient_name: string
  remarks: string
  branch_id?: string
  destination_type?: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  bank_code?: string
  bank_account_number?: string
  password?: string
  pin?: string
  beneficiary_nickname?: string
}

export interface RequestPayoutResult {
  status: string
  message: string
  approval_id?: string
  amount?: number
  payout_id?: string
  fee_cents?: number
}


export async function requestOrgPayoutAsMember(input: RequestPayoutInput): Promise<RequestPayoutResult> {
  const res = await http.post<RequestPayoutResult>('/org/v1/payouts/member', input)
  return res.data
}

export async function confirmOrgPayoutAsMember(otp: string): Promise<RequestPayoutResult> {
  const res = await http.post<RequestPayoutResult>('/org/v1/payouts/member/confirm', { otp })
  return res.data
}

export async function requestBranchPayout(input: RequestPayoutInput): Promise<RequestPayoutResult> {
  const res = await http.post<RequestPayoutResult>('/org/v1/branch/payouts', input)
  return res.data
}

export async function confirmBranchPayout(otp: string): Promise<RequestPayoutResult> {
  const res = await http.post<RequestPayoutResult>('/org/v1/branch/payouts/confirm', { otp })
  return res.data
}

export async function fetchBranchPayoutFeeEstimate(amountCents: number, destinationType: string): Promise<PayoutFeeEstimate> {
  const res = await http.get<{ status: string; data: PayoutFeeEstimate }>('/org/v1/branch/payouts/fee-estimate', {
    params: { amount_cents: amountCents, destination_type: destinationType },
  })
  return res.data.data
}

export interface PayoutApproval {
  id: string
  organization_id: string
  branch_id: string | null
  initiator_org_member_id: string
  status: string
  amount_cents: number
  fee_cents: number
  recipient_name: string
  phone_number: string
  remarks: string
  created_at: string
}

export async function fetchPendingPayoutApprovals(): Promise<PayoutApproval[]> {
  const res = await http.get<{ status: string; data: PayoutApproval[] }>('/org/v1/payouts/approvals')
  return res.data.data
}


export async function approvePayoutRequest(id: string): Promise<void> {
  await http.post(`/org/v1/payouts/approvals/${id}/approve`)
}

export async function rejectPayoutRequest(id: string, reason?: string): Promise<void> {
  await http.post(`/org/v1/payouts/approvals/${id}/reject`, { reason })
}


export interface AuditLogListItem {
  id: string
  trace_id: string
  actor_type: string
  actor_role: string
  actor_id: string | null
  actor_name?: string
  actor_email?: string
  actor_tenant_id: string | null
  tenant_name?: string
  action: string
  resource_type: string
  resource_id: string
  method: string
  path: string
  status_code: number
  status: string
  duration_ms: number
  ip_address: string
  country?: string
  country_code?: string
  city?: string
  isp?: string
  asn?: number
  device_name?: string
  device_platform?: string
  app_version?: string
  occurred_at: string
}

export interface AuditLogSearchParams {
  page?: number
  page_size?: number
  action?: string
  resource_type?: string
  status?: string
  start_date?: string
  end_date?: string
  search?: string
}

export interface PaginatedAuditLogs {
  logs: AuditLogListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export async function fetchOrgAuditLogs(params: AuditLogSearchParams): Promise<PaginatedAuditLogs> {
  const res = await http.get<{ status: string; data: PaginatedAuditLogs }>('/org/v1/audit-logs', { params })
  return res.data.data
}

export interface AuditLogDetail extends AuditLogListItem {
  query?: string
  body?: string
  error_msg?: string
  user_agent?: string
  town?: string
  network?: string
  actor: {
    id: string | null
    type: string
    role: string
    tenant_id: string | null
    first_name?: string
    last_name?: string
    full_name?: string
    email?: string
    phone?: string
    is_active?: boolean
    business_name?: string
    collection_code?: string
    merchant_status?: string
  }
}

export async function fetchOrgAuditLogDetail(id: string): Promise<AuditLogDetail> {
  const res = await http.get<{ status: string; data: AuditLogDetail }>(`/org/v1/audit-logs/${id}`)
  return res.data.data
}


export async function orgForgotPassword(email: string): Promise<void> {
  await http.post('/org/v1/auth/forgot-password', { email })
}

export async function orgResetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  await http.post('/org/v1/auth/reset-password', { email, otp, new_password: newPassword })
}


export async function setTransactionPin(currentPassword: string, pin: string): Promise<void> {
  await http.post('/org/v1/security/transaction-pin', { current_password: currentPassword, pin })
}


export async function setOrgPanicPin(currentPassword: string, panicPin: string): Promise<void> {
  await http.post('/org/v1/security/panic-pin', {
    current_password: currentPassword, panic_pin: panicPin, panic_pin_confirm: panicPin,
  })
}
export async function requestOrgPanicPinChange(currentPassword: string, action: 'change' | 'remove'): Promise<{ available_at: string }> {
  const res = await http.post<{ status: string; available_at: string }>('/org/v1/security/panic-pin/request-change', {
    current_password: currentPassword, action,
  })
  return { available_at: res.data.available_at }
}
export async function requestOrgPanicPinChangeOtp(currentPassword: string): Promise<void> {
  await http.post('/org/v1/security/panic-pin/request-otp', { current_password: currentPassword })
}
export async function finalizeOrgPanicPinChange(currentPassword: string, otp: string, panicPin?: string): Promise<void> {
  await http.post('/org/v1/security/panic-pin/finalize', {
    current_password: currentPassword, otp,
    ...(panicPin ? { panic_pin: panicPin, panic_pin_confirm: panicPin } : {}),
  })
}

export async function setBranchPanicPassword(currentPassword: string, panicPassword: string): Promise<void> {
  await http.post('/org/v1/branch/security/panic-password', {
    current_password: currentPassword, panic_password: panicPassword, panic_password_confirm: panicPassword,
  })
}
export async function requestBranchPanicPasswordChange(currentPassword: string, action: 'change' | 'remove'): Promise<{ available_at: string }> {
  const res = await http.post<{ status: string; available_at: string }>('/org/v1/branch/security/panic-password/request-change', {
    current_password: currentPassword, action,
  })
  return { available_at: res.data.available_at }
}
export async function requestBranchPanicPasswordChangeOtp(currentPassword: string): Promise<void> {
  await http.post('/org/v1/branch/security/panic-password/request-otp', { current_password: currentPassword })
}
export async function finalizeBranchPanicPasswordChange(currentPassword: string, otp: string, panicPassword?: string): Promise<void> {
  await http.post('/org/v1/branch/security/panic-password/finalize', {
    current_password: currentPassword, otp,
    ...(panicPassword ? { panic_password: panicPassword, panic_password_confirm: panicPassword } : {}),
  })
}


export interface EnrolledPasskey {
  id: string
  name: string
  last_used_at: string | null
}

export interface Enrolled2FAMethods {
  totp_enabled: boolean
  passkey_count: number
  passkeys: EnrolledPasskey[]
}


export async function fetchEnrolled2FAMethods(isBranchSession: boolean): Promise<Enrolled2FAMethods> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/methods' : '/org/v1/security/2fa/methods'
  const res = await http.get<{ status: string; data: Enrolled2FAMethods }>(path)
  return res.data.data
}

export interface AddTOTPSetupResult {
  secret: string
  otpauth_uri: string
}

export async function addTotpSetup(isBranchSession: boolean): Promise<AddTOTPSetupResult> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/totp/setup' : '/org/v1/security/2fa/totp/setup'
  const res = await http.post<AddTOTPSetupResult>(path)
  return res.data
}

export async function addTotpVerify(isBranchSession: boolean, code: string): Promise<string[]> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/totp/verify' : '/org/v1/security/2fa/totp/verify'
  const res = await http.post<{ status: string; data: { backup_codes: string[] } }>(path, { code })
  return res.data.data.backup_codes
}

export async function regenerateBackupCodes(isBranchSession: boolean): Promise<string[]> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/backup-codes/regenerate' : '/org/v1/security/2fa/backup-codes/regenerate'
  const res = await http.post<{ status: string; data: { backup_codes: string[] } }>(path)
  return res.data.data.backup_codes
}

export interface PasskeyRegisterBeginResult {
  session_id: string
  creation_options: Record<string, unknown>
}

export async function addPasskeyBegin(isBranchSession: boolean): Promise<PasskeyRegisterBeginResult> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/passkey/register/begin' : '/org/v1/security/2fa/passkey/register/begin'
  const res = await http.post<PasskeyRegisterBeginResult>(path)
  return res.data
}

export async function addPasskeyFinish(
  isBranchSession: boolean,
  sessionId: string,
  credentialName: string,
  attestationResponse: unknown,
): Promise<void> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/passkey/register/finish' : '/org/v1/security/2fa/passkey/register/finish'
  await http.post(path, {
    session_id: sessionId,
    credential_name: credentialName,
    attestation_response: attestationResponse,
  })
}

export async function disableTotp(isBranchSession: boolean): Promise<void> {
  const path = isBranchSession ? '/org/v1/branch/security/2fa/totp/disable' : '/org/v1/security/2fa/totp/disable'
  await http.post(path)
}

export async function deletePasskey(isBranchSession: boolean, passkeyId: string): Promise<void> {
  const path = isBranchSession ? `/org/v1/branch/security/2fa/passkey/${passkeyId}` : `/org/v1/security/2fa/passkey/${passkeyId}`
  await http.delete(path)
}


export interface BankCode {
  code: string
  name: string
}

export async function fetchOrgBankCodes(isBranchSession: boolean): Promise<BankCode[]> {
  const path = isBranchSession ? '/org/v1/branch/utils/bank-codes' : '/org/v1/utils/bank-codes'
  const res = await http.get<{ status: string; data: BankCode[] }>(path)
  return res.data.data
}


export interface BankAccountValidationResult {
  account_number: string
  account_name: string
  account_status: string
  currency: string
  bank_code: string
}

export async function validateOrgBankAccount(accountNumber: string, bankCode: string, isBranchSession = false): Promise<BankAccountValidationResult> {
  const path = isBranchSession ? '/org/v1/branch/utils/validate/bank-account' : '/org/v1/utils/validate/bank-account'
  const res = await http.post<{ status: string; data: BankAccountValidationResult }>(path, {
    account_number: accountNumber,
    bank_code: bankCode,
  })
  return res.data.data
}

export interface MobileMoneyValidationResult {
  phone: string
  account_name: string
  carrier: string
  channel_code: string
}


export async function validateOrgMobileMoney(phone: string, carrier?: string, isBranchSession = false): Promise<MobileMoneyValidationResult> {
  const path = isBranchSession ? '/org/v1/branch/utils/validate/mobile-money' : '/org/v1/utils/validate/mobile-money'
  const res = await http.post<{ status: string; data: MobileMoneyValidationResult }>(path, {
    phone,
    carrier,
  })
  return res.data.data
}

export interface ShortcodeValidationResult {
  shortcode: string
  account_name: string
  type: string
}

export async function validateOrgShortcode(isBranchSession: boolean, shortcode: string, type: 'paybill' | 'till'): Promise<ShortcodeValidationResult> {
  const path = isBranchSession ? '/org/v1/branch/utils/validate/shortcode' : '/org/v1/utils/validate/shortcode'
  const res = await http.post<{ status: string; data: ShortcodeValidationResult }>(path, {
    shortcode,
    type,
  })
  return res.data.data
}

export interface ScreenNameMatch {
  score: number
  matched_field: string
  list_names: string[]
  entity_type: string
  country: string
}

export interface ScreenNameResult {
  is_match: boolean
  matches: ScreenNameMatch[]
}


export async function validateOrgScreenName(name: string, isBranchSession = false): Promise<ScreenNameResult> {
  const path = isBranchSession ? '/org/v1/branch/utils/validate/screen-name' : '/org/v1/utils/validate/screen-name'
  const res = await http.post<{ status: string; data: ScreenNameResult }>(path, { name })
  return res.data.data
}


export interface OrgVault {
  id: string
  name: string
  balance_cents: number
  created_at: string
}

export async function fetchOrgVaults(): Promise<OrgVault[]> {
  const res = await http.get<{ status: string; data: OrgVault[] }>('/org/v1/vaults')
  return res.data.data
}

export async function createOrgVault(name: string): Promise<OrgVault> {
  const res = await http.post<{ status: string; data: OrgVault }>('/org/v1/vaults', { name })
  return res.data.data
}

export interface VaultTransferInput {
  amount: number
  password?: string
  pin?: string
}

export async function fundOrgVault(vaultId: string, input: VaultTransferInput): Promise<void> {
  await http.post(`/org/v1/vaults/${vaultId}/fund`, input)
}

export async function withdrawOrgVault(vaultId: string, input: VaultTransferInput): Promise<void> {
  await http.post(`/org/v1/vaults/${vaultId}/withdraw`, input)
}


export interface ScheduledPayout {
  id: string
  organization_id: string
  branch_id?: string | null
  funding_source: 'MAIN' | 'VAULT'
  vault_id: string | null
  amount_cents: number
  sweep_full_balance: boolean
  destination_type: string
  phone_number: string | null
  bank_code: string | null
  bank_account_number: string | null
  recipient_name: string
  remarks: string
  trigger_type?: 'SCHEDULE' | 'THRESHOLD'
  threshold_cents?: number | null
  threshold_armed?: boolean
  schedule_type: 'ONE_TIME' | 'RECURRING'
  recurrence_interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null
  recurrence_day_of_week?: number | null
  recurrence_time_of_day?: string | null
  next_run_at: string | null
  end_date: string | null
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED'
  last_run_at: string | null
  last_run_status: string | null
  tags?: string[] | null
  created_at: string
}

export interface CreateScheduledPayoutInput {
  amount: number
  sweep_full_balance?: boolean
  destination_type?: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  phone_number?: string
  shortcode?: string
  account_reference?: string
  bank_code?: string
  bank_account_number?: string
  recipient_name: string
  remarks: string
  funding_source?: 'MAIN' | 'VAULT'
  vault_id?: string
  trigger_type?: 'SCHEDULE' | 'THRESHOLD'
  threshold_cents?: number
  schedule_type?: 'ONE_TIME' | 'RECURRING'
  recurrence_interval?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  recurrence_day_of_week?: number
  recurrence_time_of_day?: string
  start_at?: string
  end_date?: string
  tags?: string[]
  password?: string
  pin?: string
}

export interface SettlementPreferences {
  destination_type: string | null
  phone_number: string | null
  bank_code: string | null
  bank_account_number: string | null
}

export interface UpdateSettlementPreferencesInput {
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  phone_number?: string
  shortcode?: string
  bank_code?: string
  bank_account_number?: string
  pin?: string
  password?: string
}

export async function fetchOrgSettlementPreferences(isBranch = false): Promise<SettlementPreferences> {
  const base = isBranch ? '/org/v1/branch/settlement-preferences' : '/org/v1/settlement-preferences'
  const res = await http.get<{ status: string; data: SettlementPreferences }>(base)
  return res.data.data
}

export async function updateOrgSettlementPreferences(
  input: UpdateSettlementPreferencesInput,
  isBranch = false,
): Promise<{ status: string; message?: string }> {
  const base = isBranch ? '/org/v1/branch/settlement-preferences' : '/org/v1/settlement-preferences'
  const res = await http.put<{ status: string; message?: string }>(base, input)
  return res.data
}

export async function confirmOrgSettlementPreferences(otp: string, isBranch = false): Promise<{ status: string; message?: string }> {
  const base = isBranch ? '/org/v1/branch/settlement-preferences' : '/org/v1/settlement-preferences'
  const res = await http.post<{ status: string; message?: string }>(`${base}/confirm`, { otp })
  return res.data
}

export async function fetchScheduledPayouts(isBranch = false): Promise<ScheduledPayout[]> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  const res = await http.get<{ status: string; data: ScheduledPayout[] }>(base)
  return res.data.data
}

export async function fetchScheduledPayout(id: string, isBranch = false): Promise<ScheduledPayout> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  const res = await http.get<{ status: string; data: ScheduledPayout }>(`${base}/${id}`)
  return res.data.data
}

export interface ScheduledPayoutCreateResult {
  status: string
  message?: string
  next_run_at?: string
  data?: { id: string; next_run_at: string }
}

export async function createScheduledPayout(input: CreateScheduledPayoutInput, isBranch = false): Promise<ScheduledPayoutCreateResult> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  const res = await http.post<ScheduledPayoutCreateResult>(base, input)
  return res.data
}

export async function confirmScheduledPayout(otp: string, isBranch = false): Promise<ScheduledPayoutCreateResult> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  const res = await http.post<ScheduledPayoutCreateResult>(`${base}/confirm`, { otp })
  return res.data
}

export async function pauseScheduledPayout(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  await http.post(`${base}/${id}/pause`)
}

export async function resumeScheduledPayout(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  await http.post(`${base}/${id}/resume`)
}

export async function cancelScheduledPayout(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/scheduled-payouts' : '/org/v1/scheduled-payouts'
  await http.post(`${base}/${id}/cancel`)
}


export interface Beneficiary {
  id: string
  organization_id: string
  branch_id?: string | null
  created_by_org_member_id?: string | null
  created_by_branch_member_id?: string | null
  nickname: string
  recipient_name: string
  destination_type: BeneficiaryDestinationType
  phone_number: string | null
  bank_code: string | null
  bank_account_number: string | null
  shortcode: string | null
  account_reference: string | null
  verified_name: string | null
  name_verified_at: string | null
  is_active: boolean
  source: 'MANUAL' | 'AUTO'
  created_at: string
}

export type BeneficiaryDestinationType = 'PHONE_NUMBER' | 'TILL_NUMBER' | 'PAYBILL' | 'BANK_ACCOUNT'

export interface CreateBeneficiaryInput {
  nickname: string
  recipient_name: string
  destination_type?: BeneficiaryDestinationType
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
  shortcode?: string
  account_reference?: string
  verified_name?: string
  pin?: string
  password?: string
}

export interface UpdateBeneficiaryInput {
  nickname?: string
  is_active?: boolean
}

export type CreateBeneficiaryResult =
  | { outcome: 'saved'; beneficiary: Beneficiary }
  | { outcome: 'otp_required' }

export async function fetchOrgBeneficiaries(isBranch = false): Promise<Beneficiary[]> {
  const base = isBranch ? '/org/v1/branch/beneficiaries' : '/org/v1/beneficiaries'
  const res = await http.get<{ status: string; data: Beneficiary[] }>(base)
  return res.data.data
}


export async function createOrgBeneficiary(input: CreateBeneficiaryInput, isBranch = false): Promise<CreateBeneficiaryResult> {
  const base = isBranch ? '/org/v1/branch/beneficiaries' : '/org/v1/beneficiaries'
  const res = await http.post<{ status: string; data?: Beneficiary }>(base, input)
  if (res.data.status === 'otp_required') return { outcome: 'otp_required' }
  return { outcome: 'saved', beneficiary: res.data.data as Beneficiary }
}


export async function confirmOrgBeneficiary(otp: string, isBranch = false): Promise<Beneficiary> {
  const base = isBranch ? '/org/v1/branch/beneficiaries' : '/org/v1/beneficiaries'
  const res = await http.post<{ status: string; data: Beneficiary }>(`${base}/confirm`, { otp })
  return res.data.data
}


export async function updateOrgBeneficiary(id: string, input: UpdateBeneficiaryInput, isBranch = false): Promise<Beneficiary> {
  const base = isBranch ? '/org/v1/branch/beneficiaries' : '/org/v1/beneficiaries'
  const res = await http.patch<{ status: string; data: Beneficiary }>(`${base}/${id}`, input)
  return res.data.data
}


export async function deleteOrgBeneficiary(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/beneficiaries' : '/org/v1/beneficiaries'
  await http.delete(`${base}/${id}`)
}


export interface RecentSettlement {
  recipient_name: string
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  recipient_info: string
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
  amount_cents: number
  branch_id: string | null
  last_paid_at: string
}


export async function fetchRecentSettlements(isBranch = false): Promise<RecentSettlement[]> {
  const base = isBranch ? '/org/v1/branch/payouts/recent' : '/org/v1/payouts/recent'
  const res = await http.get<{ status: string; data: RecentSettlement[] }>(base)
  return res.data.data
}


export interface OrgNotification {
  id: string
  created_at: string
  organization_id: string
  org_member_id?: string | null
  branch_member_id?: string | null
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
}

export interface OrgNotificationsResponse {
  notifications: OrgNotification[]
  unread_count: number
}


export async function fetchOrgNotifications(): Promise<OrgNotificationsResponse> {
  const res = await http.get<{ status: string; data: OrgNotificationsResponse }>('/org/v1/notifications')
  return res.data.data
}

export async function markNotificationRead(id: string): Promise<void> {
  await http.post(`/org/v1/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post('/org/v1/notifications/read-all')
}

export async function fetchBranchNotifications(): Promise<OrgNotificationsResponse> {
  const res = await http.get<{ status: string; data: OrgNotificationsResponse }>('/org/v1/branch/notifications')
  return res.data.data
}

export async function markBranchNotificationRead(id: string): Promise<void> {
  await http.post(`/org/v1/branch/notifications/${id}/read`)
}

export async function markAllBranchNotificationsRead(): Promise<void> {
  await http.post('/org/v1/branch/notifications/read-all')
}

export interface NotificationPrefCategory {
  category: string
  enabled: boolean
}
export interface NotificationPreferences {
  categories: NotificationPrefCategory[]
  locked_category: string
}
export async function fetchNotificationPreferences(isBranch = false): Promise<NotificationPreferences> {
  const base = isBranch ? '/org/v1/branch/notifications/preferences' : '/org/v1/notifications/preferences'
  const res = await http.get<{ status: string; data: NotificationPreferences }>(base)
  return res.data.data
}
export async function updateNotificationPreferences(
  categories: NotificationPrefCategory[],
  isBranch = false,
): Promise<NotificationPreferences> {
  const base = isBranch ? '/org/v1/branch/notifications/preferences' : '/org/v1/notifications/preferences'
  const res = await http.put<{ status: string; data: NotificationPreferences }>(base, { categories })
  return res.data.data
}

export async function fetchReceiptEmailPref(isBranch = false): Promise<boolean> {
  const base = isBranch ? '/org/v1/branch/settings/receipt-emails' : '/org/v1/settings/receipt-emails'
  const res = await http.get<{ status: string; data: { enabled: boolean } }>(base)
  return res.data.data.enabled
}
export async function updateReceiptEmailPref(enabled: boolean, isBranch = false): Promise<boolean> {
  const base = isBranch ? '/org/v1/branch/settings/receipt-emails' : '/org/v1/settings/receipt-emails'
  const res = await http.put<{ status: string; data: { enabled: boolean } }>(base, { enabled })
  return res.data.data.enabled
}

export interface OrgFraudDecision {
  id: string
  subject_type: string
  amount_cents: number
  action: string
  severity: string
  score: number
  veto_rule?: string
  outcome?: string
  created_at: string
  outcome_at?: string | null
}

export interface OrgFraudActivity {
  open_blocks: number
  open_holds: number
  decisions: OrgFraudDecision[]
}


export async function fetchOrgFraudActivity(): Promise<OrgFraudActivity> {
  const res = await http.get<{ status: string; data: OrgFraudActivity }>('/org/v1/fraud/decisions')
  return res.data.data
}

export async function fetchBranchFraudActivity(): Promise<OrgFraudActivity> {
  const res = await http.get<{ status: string; data: OrgFraudActivity }>('/org/v1/branch/fraud/decisions')
  return res.data.data
}

export interface OrgFraudBranchBreakdownRow {
  branch_id: string
  branch_name: string
  open_blocks: number
  open_holds: number
  total_decisions: number
}

export async function fetchFraudBranchBreakdown(): Promise<OrgFraudBranchBreakdownRow[]> {
  const res = await http.get<{ status: string; data: OrgFraudBranchBreakdownRow[] | null }>('/org/v1/fraud/branch-breakdown')
  return res.data.data ?? []
}

export interface OrgFraudAggregateScore {
  window_days: number
  branches_with_risk_activity: number
  total_blocks: number
  total_holds: number
  total_decisions: number
  device_overlap_count: number
  ip_overlap_count: number
  phone_overlap_count: number
  score: number
}

export async function fetchFraudAggregateScore(days = 30): Promise<OrgFraudAggregateScore> {
  const res = await http.get<{ status: string; data: OrgFraudAggregateScore }>('/org/v1/fraud/aggregate-score', { params: { days } })
  return res.data.data
}



export interface TransferInput {
  from: string
  to: string
  amount: number
  remarks?: string
  password?: string
  pin?: string
}

export interface TransferResult {
  txn_id: string
  amount_cents: number
  from: string
  to: string
}

export async function createOrgTransfer(input: TransferInput): Promise<TransferResult> {
  const res = await http.post<{ status: string; data: TransferResult }>('/org/v1/transfers', input)
  return res.data.data
}


export async function createBranchTransfer(input: Omit<TransferInput, 'from' | 'pin'>): Promise<TransferResult> {
  const res = await http.post<{ status: string; data: TransferResult }>('/org/v1/branch/transfers', input)
  return res.data.data
}

export interface TransferHistoryRow {
  id: string
  type: 'INTERNAL_TRANSFER' | 'CROSS_ORG_TRANSFER'
  amount_cents: number
  description: string
  status: string
  direction: 'INTERNAL' | 'OUT' | 'IN'
  created_at: string
}

export interface TransferHistory {
  page: number
  page_size: number
  total: number
  transfers: TransferHistoryRow[]
}

export async function fetchTransferHistory(isBranch = false, params: { page?: number; page_size?: number } = {}): Promise<TransferHistory> {
  const base = isBranch ? '/org/v1/branch/transfers' : '/org/v1/transfers'
  const res = await http.get<{ status: string; data: TransferHistory }>(base, { params })
  return res.data.data
}


export interface TransferRecipientLookup {
  name: string
  type: 'organization' | 'branch'
  collection_code: string
}


export async function lookupTransferRecipient(code: string, isBranch = false): Promise<TransferRecipientLookup> {
  const base = isBranch ? '/org/v1/branch/transfers/lookup' : '/org/v1/transfers/lookup'
  const res = await http.get<{ status: string; data: TransferRecipientLookup }>(base, { params: { code } })
  return res.data.data
}

export interface ExternalTransferInput {
  from?: string
  recipient_collection_code: string
  amount: number
  remarks: string
  password?: string
  pin?: string
}

export interface ExternalTransferOtpRequired {
  status: 'otp_required'
  message: string
  transfer_id: string
}

export interface ExternalTransferComplete {
  status: 'success'
  message: string
  data: { transfer_id: string; amount_cents: number; from: string; to: string }
}

export async function requestExternalTransfer(
  input: ExternalTransferInput,
): Promise<ExternalTransferOtpRequired | ExternalTransferComplete> {
  const res = await http.post<ExternalTransferOtpRequired | ExternalTransferComplete>('/org/v1/transfers/external', input)
  return res.data
}

export async function confirmExternalTransfer(otp: string): Promise<ExternalTransferComplete['data']> {
  const res = await http.post<{ status: string; data: ExternalTransferComplete['data'] }>('/org/v1/transfers/external/confirm', { otp })
  return res.data.data
}


export async function requestBranchExternalTransfer(
  input: Omit<ExternalTransferInput, 'from' | 'pin'>,
): Promise<ExternalTransferOtpRequired | ExternalTransferComplete> {
  const res = await http.post<ExternalTransferOtpRequired | ExternalTransferComplete>('/org/v1/branch/transfers/external', input)
  return res.data
}

export async function confirmBranchExternalTransfer(otp: string): Promise<ExternalTransferComplete['data']> {
  const res = await http.post<{ status: string; data: ExternalTransferComplete['data'] }>('/org/v1/branch/transfers/external/confirm', { otp })
  return res.data.data
}



export interface StatementTypeRow {
  type: string
  count: number
  amount_cents: number
}

export interface Statement {
  period: string
  scope: string
  branch_id?: string
  opening_balance_cents: number
  closing_balance_cents: number
  total_in_cents: number
  total_out_cents: number
  net_cents: number
  transaction_count: number
  by_type: StatementTypeRow[]
}

export async function fetchStatement(params: { period?: string; scope?: 'consolidated' | 'org'; branch_id?: string }): Promise<Statement> {
  const res = await http.get<{ status: string; data: Statement }>('/org/v1/statements', { params })
  return res.data.data
}

export async function downloadStatementCsv(params: { period?: string; scope?: 'consolidated' | 'org'; branch_id?: string }): Promise<Blob> {
  const res = await http.get('/org/v1/statements', { params: { ...params, format: 'csv' }, responseType: 'blob' })
  return res.data
}

export interface StatementEntry {
  id: number
  created_at: string
  transaction_id: string
  wallet_id: string
  entry_type: 'CREDIT' | 'DEBIT'
  amount_cents: number
  money_in_cents: number
  money_out_cents: number
  running_balance_cents: number
  txn_type: string
  status: string
  reference: string
  details: string
  rail: string
  provider_ref: string
  customer_ref: string
  posting_type: string
}

export interface StatementEntries {
  period: string
  from: string
  to: string
  scope: string
  branch_id?: string
  opening_balance_cents: number
  closing_balance_cents: number
  total_in_cents: number
  total_out_cents: number
  page: number
  page_size: number
  total: number
  posting_types: string[]
  entries: StatementEntry[]
}

export interface StatementEntryParams {
  from?: string
  to?: string
  period?: string
  scope?: 'consolidated' | 'org'
  branch_id?: string
  direction?: 'in' | 'out'
  txn_type?: string
  posting_type?: string
  search?: string
  page?: number
  page_size?: number
}

export interface OrgStatementSchedule {
  id: string
  organization_id: string
  branch_id?: string | null
  scope: 'org' | 'consolidated' | 'branch'
  recipient_email: string
  day_of_month: number
  format: string
  active: boolean
  last_run_at?: string | null
  next_run_at: string
  created_at: string
}
export interface StatementScheduleInput {
  scope?: 'org' | 'consolidated' | 'branch'
  branch_id?: string
  recipient_email?: string
  day_of_month?: number
  active?: boolean
}
export async function fetchStatementSchedules(orgOnly = false): Promise<OrgStatementSchedule[]> {
  const res = await http.get<{ status: string; data: OrgStatementSchedule[] }>('/org/v1/statements/schedules', {
    params: orgOnly ? { scope: 'org' } : undefined,
  })
  return res.data.data
}
export async function createStatementSchedule(input: StatementScheduleInput): Promise<OrgStatementSchedule> {
  const res = await http.post<{ status: string; data: OrgStatementSchedule }>('/org/v1/statements/schedules', input)
  return res.data.data
}
export async function updateStatementSchedule(id: string, input: StatementScheduleInput): Promise<OrgStatementSchedule> {
  const res = await http.patch<{ status: string; data: OrgStatementSchedule }>(`/org/v1/statements/schedules/${id}`, input)
  return res.data.data
}
export async function deleteStatementSchedule(id: string): Promise<void> {
  await http.delete(`/org/v1/statements/schedules/${id}`)
}

export async function fetchStatementEntries(params: StatementEntryParams): Promise<StatementEntries> {
  const res = await http.get<{ status: string; data: StatementEntries }>('/org/v1/statements/entries', { params })
  return res.data.data
}

export async function downloadStatementEntriesCsv(params: StatementEntryParams): Promise<Blob> {
  const res = await http.get('/org/v1/statements/entries', { params: { ...params, format: 'csv' }, responseType: 'blob' })
  return res.data
}

export interface StatementEntryDetail {
  id: number
  created_at: string
  ledger_txn_id: string
  wallet_id: string
  wallet_name: string
  wallet_type: string
  entry_type: string
  amount_cents: number
  direction: 'IN' | 'OUT'
  branch_id?: string
  transaction_id?: string
  txn_type?: string
  status?: string
  rail?: string
  reference?: string
  description?: string
  fee_cents: number
  currency?: string
  provider_ref?: string
  customer_name?: string
  customer_phone?: string
  settlement_status?: string
  txn_created_at?: string
}

export async function fetchStatementEntry(id: string | number, params: { scope?: string; branch_id?: string } = {}): Promise<StatementEntryDetail> {
  const res = await http.get<{ status: string; data: StatementEntryDetail }>(`/org/v1/statements/entries/${id}`, { params })
  return res.data.data
}

export interface SettlementRow {
  settlement_id: string
  reference: string
  settled_at: string
  wallet_id: string
  net_cents: number
  gross_cents: number
  fees_cents: number
  refunds_cents: number
  item_count: number
  status: string
}

export interface SettlementList {
  scope: string
  branch_id?: string
  from: string
  to: string
  page: number
  page_size: number
  total: number
  total_net_cents: number
  settlements: SettlementRow[]
}

export interface SettlementItem {
  transaction_id: string
  created_at: string
  type: string
  status: string
  settlement_status: string
  rail: string
  reference: string
  external_txn_id: string | null
  description: string
  currency: string
  amount_cents: number
  fee_cents: number
  customer_name: string
  customer_phone: string
  customer_ref: string
}

export interface SettlementDetail {
  settlement_id: string
  transaction_id: string
  ledger_txn_id: string
  reference: string
  external_txn_id: string | null
  settled_at: string
  updated_at: string
  net_cents: number
  transfer_fee_cents: number
  gross_cents: number
  fees_cents: number
  refunds_cents: number
  currency: string
  status: string
  settlement_status: string
  rail: string
  source: string
  description: string
  is_escrow: boolean
  scope: string
  wallet_id: string
  wallet_name: string
  wallet_type: string
  item_count: number
  items: SettlementItem[]
}

export interface SettlementQuery {
  from?: string
  to?: string
  period?: string
  scope?: 'consolidated' | 'org'
  branch_id?: string
  page?: number
  page_size?: number
}

export async function fetchOrgSettlements(params: SettlementQuery): Promise<SettlementList> {
  const res = await http.get<{ status: string; data: SettlementList }>('/org/v1/settlements', { params })
  return res.data.data
}
export async function fetchBranchSettlements(params: SettlementQuery): Promise<SettlementList> {
  const res = await http.get<{ status: string; data: SettlementList }>('/org/v1/branch/settlements', { params })
  return res.data.data
}
export interface NextSettlementTranche {
  amount_cents: number
  matures_on: string
}
export interface NextSettlement {
  scope: string
  branch_id?: string | null
  currency: string
  amount_cents: number
  held_now_cents: number
  eta?: string | null
  tranche_count: number
  tranches: NextSettlementTranche[]
  estimate_note: string
}
export async function fetchNextSettlement(isBranch = false, branchId?: string): Promise<NextSettlement> {
  const base = isBranch ? '/org/v1/branch/settlements/next' : '/org/v1/settlements/next'
  const res = await http.get<{ status: string; data: NextSettlement }>(base, {
    params: !isBranch && branchId ? { branch_id: branchId } : undefined,
  })
  return res.data.data
}
export const fetchOrgNextSettlement = (branchId?: string) => fetchNextSettlement(false, branchId)
export const fetchBranchNextSettlement = () => fetchNextSettlement(true)

export async function fetchOrgSettlementDetail(id: string): Promise<SettlementDetail> {
  const res = await http.get<{ status: string; data: SettlementDetail }>(`/org/v1/settlements/${id}`)
  return res.data.data
}
export async function fetchBranchSettlementDetail(id: string): Promise<SettlementDetail> {
  const res = await http.get<{ status: string; data: SettlementDetail }>(`/org/v1/branch/settlements/${id}`)
  return res.data.data
}
export function fetchSettlementDetail(id: string, isBranch = false): Promise<SettlementDetail> {
  return isBranch ? fetchBranchSettlementDetail(id) : fetchOrgSettlementDetail(id)
}

export interface PayoutHistoryRow {
  id: string
  created_at: string
  updated_at: string
  reference: string
  recipient_name: string
  recipient_info: string
  destination_type: string
  amount_cents: number
  fee_cents: number
  provider: string
  status: string
  failure_reason: string
  mpesa_transaction_id: string
  bank_reference_id: string
  branch_id?: string
}

export interface PayoutHistoryList {
  scope: string
  branch_id?: string
  page: number
  page_size: number
  total: number
  total_paid_cents: number
  total_fees_cents: number
  payouts: PayoutHistoryRow[]
}

export interface PayoutHistoryQuery {
  status?: string
  from?: string
  to?: string
  search?: string
  scope?: 'consolidated' | 'org'
  branch_id?: string
  page?: number
  page_size?: number
}

export async function fetchOrgPayoutHistory(params: PayoutHistoryQuery): Promise<PayoutHistoryList> {
  const res = await http.get<{ status: string; data: PayoutHistoryList }>('/org/v1/payouts', { params })
  return res.data.data
}
export async function fetchBranchPayoutHistory(params: PayoutHistoryQuery): Promise<PayoutHistoryList> {
  const res = await http.get<{ status: string; data: PayoutHistoryList }>('/org/v1/branch/payouts', { params })
  return res.data.data
}

export interface PayoutDetail extends PayoutHistoryRow {
  total_cents: number
  currency: string
  attempts: number
  wallet_id: string
  metadata: Record<string, unknown> | null
}

export async function fetchOrgPayout(id: string): Promise<PayoutDetail> {
  const res = await http.get<{ status: string; data: PayoutDetail }>(`/org/v1/payouts/${id}`)
  return res.data.data
}
export async function fetchBranchPayout(id: string): Promise<PayoutDetail> {
  const res = await http.get<{ status: string; data: PayoutDetail }>(`/org/v1/branch/payouts/${id}`)
  return res.data.data
}

export interface CreditNoteRow {
  transaction_id: string
  created_at: string
  type: string
  status: string
  rail: string
  reference: string
  amount_cents: number
  fee_cents: number
  customer_ref: string
  details: string
  original_reference: string
  original_transaction_id?: string
}

export interface CreditNoteList {
  kind: 'refunds' | 'reversals'
  scope: string
  branch_id?: string
  from: string
  to: string
  page: number
  page_size: number
  total: number
  total_amount_cents: number
  rows: CreditNoteRow[]
}

export interface CreditNoteQuery {
  from?: string
  to?: string
  period?: string
  scope?: 'consolidated' | 'org'
  branch_id?: string
  status?: string
  search?: string
  page?: number
  page_size?: number
}

export async function fetchOrgRefunds(params: CreditNoteQuery): Promise<CreditNoteList> {
  const res = await http.get<{ status: string; data: CreditNoteList }>('/org/v1/refunds', { params })
  return res.data.data
}
export async function fetchBranchRefunds(params: CreditNoteQuery): Promise<CreditNoteList> {
  const res = await http.get<{ status: string; data: CreditNoteList }>('/org/v1/branch/refunds', { params })
  return res.data.data
}
export interface CreateRefundPayload {
  transaction_id: string
  amount_cents?: number
  reason: string
}

export async function createOrgRefund(payload: CreateRefundPayload, isBranch = false): Promise<{ id: string; status: string }> {
  const base = isBranch ? '/org/v1/branch/refunds' : '/org/v1/refunds'
  const res = await http.post<{ status: string; data: { id: string; status: string } }>(base, payload)
  return res.data.data
}

export async function fetchOrgReversals(params: CreditNoteQuery): Promise<CreditNoteList> {
  const res = await http.get<{ status: string; data: CreditNoteList }>('/org/v1/reversals', { params })
  return res.data.data
}
export async function fetchBranchReversals(params: CreditNoteQuery): Promise<CreditNoteList> {
  const res = await http.get<{ status: string; data: CreditNoteList }>('/org/v1/branch/reversals', { params })
  return res.data.data
}

export interface FinancialAccount {
  id: string
  type: string
  wallet_name: string
  name?: string
  currency: string
  balance_cents: number
  reserved_cents: number
  locked_cents: number
  available_cents: number
  status: string
  freeze_reason?: string
  organization_id?: string
  branch_id?: string
  branch_name?: string
  store_id?: string
  last_credited_at?: string
  created_at?: string
}

export interface FinancialAccountGroup {
  type: string
  count: number
  balance_cents: number
  available_cents: number
}

export interface FinancialAccounts {
  scope: string
  branch_id?: string
  accounts: FinancialAccount[]
  groups: FinancialAccountGroup[]
}

export async function fetchOrgFinancialAccounts(params?: { scope?: 'org' | 'consolidated'; branch_id?: string }): Promise<FinancialAccounts> {
  const res = await http.get<{ status: string; data: FinancialAccounts }>('/org/v1/financial-accounts', { params })
  return res.data.data
}
export async function fetchBranchFinancialAccounts(): Promise<FinancialAccounts> {
  const res = await http.get<{ status: string; data: FinancialAccounts }>('/org/v1/branch/financial-accounts')
  return res.data.data
}

export async function freezeOrgWallet(id: string, reason: string, pin: string): Promise<{ message?: string }> {
  const res = await http.post<{ status: string; message?: string }>(`/org/v1/wallets/${id}/freeze`, { reason, pin })
  return res.data
}
export async function unfreezeOrgWallet(id: string, pin: string): Promise<{ message?: string }> {
  const res = await http.post<{ status: string; message?: string }>(`/org/v1/wallets/${id}/unfreeze`, { pin })
  return res.data
}
export async function closeOrgWallet(id: string, pin: string): Promise<{ message?: string }> {
  const res = await http.post<{ status: string; message?: string }>(`/org/v1/wallets/${id}/close`, { pin })
  return res.data
}



export interface BranchAnalyticsRow {
  branch_id?: string
  branch_name: string
  settlement_mode?: string
  collections_cents: number
  collections_count: number
  payouts_cents: number
  payouts_count: number
  net_cents: number
  current_balance_cents: number
}

export interface BranchAnalytics {
  period: string
  org_totals: BranchAnalyticsRow
  org_wallet: BranchAnalyticsRow
  branches: BranchAnalyticsRow[]
  highlights: string[]
}

export async function fetchBranchAnalytics(period?: string): Promise<BranchAnalytics> {
  const res = await http.get<{ status: string; data: BranchAnalytics }>('/org/v1/analytics/branches', { params: { period } })
  return res.data.data
}

export interface AnalyticsTotals {
  collections_cents: number
  collections_count: number
  payouts_cents: number
  payouts_count: number
  net_cents: number
  volume_cents: number
  txn_count: number
  avg_txn_cents: number
  avg_collection_cents: number
  avg_payout_cents: number
  fees_cents: number
  success_rate: number
}

export interface AnalyticsTimeseriesPoint {
  date: string
  collections_cents: number
  payouts_cents: number
  volume_cents: number
}

export interface AnalyticsStatusRow {
  direction: 'collection' | 'payout'
  status: string
  count: number
  amount_cents: number
}

export interface AnalyticsRailRow {
  rail: string
  count: number
  amount_cents: number
}

export interface AnalyticsTagRow {
  tag_id: string
  tag_name: string
  tag_color?: string
  total_cents: number
  count: number
}

export interface AnalyticsDetail {
  period_start: string
  period_end: string
  totals: AnalyticsTotals
  prior_period: { start: string; end: string; totals: AnalyticsTotals }
  comparison: {
    collections_change_pct: number | null
    payouts_change_pct: number | null
    net_change_pct: number | null
  }
  status_breakdown: AnalyticsStatusRow[]
  rail_breakdown: AnalyticsRailRow[]
  tag_breakdown: AnalyticsTagRow[] | null
  untagged_spend: { total_cents: number; count: number }
  timeseries: AnalyticsTimeseriesPoint[]
}

export interface AnalyticsRangeParams {
  period?: string
  from?: string
  to?: string
}

export async function fetchOrgAnalyticsDetail(params: AnalyticsRangeParams = {}): Promise<AnalyticsDetail> {
  const res = await http.get<{ status: string; data: AnalyticsDetail }>('/org/v1/analytics/detail', { params })
  return res.data.data
}

export async function fetchBranchAnalyticsDetail(params: AnalyticsRangeParams = {}): Promise<AnalyticsDetail> {
  const res = await http.get<{ status: string; data: AnalyticsDetail }>('/org/v1/branch/analytics/detail', { params })
  return res.data.data
}

export interface InvoiceAnalyticsSummary {
  total_count: number
  total_cents: number
  paid_count: number
  paid_cents: number
  unpaid_count: number
  unpaid_cents: number
  overdue_count: number
  overdue_cents: number
  cancelled_count: number
  cancelled_cents: number
  collection_rate_pct: number
}

export interface InvoiceAnalytics {
  period: string
  summary: InvoiceAnalyticsSummary
}

export async function fetchOrgInvoiceAnalytics(period?: string): Promise<InvoiceAnalytics> {
  const res = await http.get<{ status: string; data: InvoiceAnalytics }>('/org/v1/analytics/invoices', { params: { period } })
  return res.data.data
}

export async function fetchBranchInvoiceAnalytics(period?: string): Promise<InvoiceAnalytics> {
  const res = await http.get<{ status: string; data: InvoiceAnalytics }>('/org/v1/branch/analytics/invoices', { params: { period } })
  return res.data.data
}



export interface ApprovalThreshold {
  configured: boolean
  amount_cents: number
  active: boolean
  active_owner_count: number
  enforceable: boolean
}

export async function fetchApprovalThreshold(): Promise<ApprovalThreshold> {
  const res = await http.get<{ status: string; data: ApprovalThreshold }>('/org/v1/payouts/approval-threshold')
  return res.data.data
}

export async function setApprovalThreshold(input: { amount_cents: number; active: boolean }): Promise<{ amount_cents: number; active: boolean; warning: string }> {
  const res = await http.put<{ status: string; data: { amount_cents: number; active: boolean; warning: string } }>('/org/v1/payouts/approval-threshold', input)
  return res.data.data
}

export interface RoleApprovalThreshold {
  role: string
  amount_cents: number
  active: boolean
}

export async function fetchRoleApprovalThresholds(): Promise<RoleApprovalThreshold[]> {
  const res = await http.get<{ status: string; data: RoleApprovalThreshold[] }>('/org/v1/payouts/approval-thresholds')
  return res.data.data
}

export async function setRoleApprovalThreshold(role: string, input: { amount_cents: number; active: boolean }): Promise<RoleApprovalThreshold> {
  const res = await http.put<{ status: string; data: RoleApprovalThreshold }>(`/org/v1/payouts/approval-thresholds/${role}`, input)
  return res.data.data
}



export interface BulkPayoutBatchItemInput {
  amount_cents: number
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  phone_number?: string
  shortcode?: string
  account_reference?: string
  bank_code?: string
  bank_account_number?: string
  recipient_name: string
  remarks?: string
}

export interface CreateBulkPayoutBatchInput {
  funding_source?: 'MAIN' | 'VAULT'
  vault_id?: string
  remarks?: string
  items: BulkPayoutBatchItemInput[]
  pin?: string
  password?: string
}

export interface BulkPayoutBatch {
  id: string
  organization_id: string
  funding_source: 'MAIN' | 'VAULT'
  vault_id: string | null
  escrow_wallet_id: string
  currency: string
  item_count: number
  total_amount_cents: number
  total_fee_reserve_cents: number
  remarks: string
  status: 'ESCROWED' | 'DISPATCHED'
  dispatched_count: number
  rejected_count: number
  created_at: string
}

export interface BulkPayoutItem {
  id: string
  batch_id: string
  row_number: number
  amount_cents: number
  destination_type: string
  phone_number: string | null
  bank_code: string | null
  bank_account_number: string | null
  recipient_name: string
  remarks: string
  status: 'PENDING' | 'DISPATCHED' | 'REJECTED'
  payout_id: string | null
  payout_status?: string
  rejection_reason: string | null
  created_at: string
}

export interface BulkPayoutBatchCreateResult {
  status: string
  message?: string
  item_count?: number
  total_amount_cents?: number
  total_fee_reserve_cents?: number
  data?: { id: string; item_count: number; total_amount_cents: number; total_fee_reserve_cents: number }
}

export async function createBulkPayoutBatch(input: CreateBulkPayoutBatchInput, isBranch = false): Promise<BulkPayoutBatchCreateResult> {
  const base = isBranch ? '/org/v1/branch/bulk-payouts' : '/org/v1/bulk-payouts'
  const res = await http.post<BulkPayoutBatchCreateResult>(base, input)
  return res.data
}

export async function confirmBulkPayoutBatch(otp: string, isBranch = false): Promise<BulkPayoutBatchCreateResult> {
  const base = isBranch ? '/org/v1/branch/bulk-payouts' : '/org/v1/bulk-payouts'
  const res = await http.post<BulkPayoutBatchCreateResult>(`${base}/confirm`, { otp })
  return res.data
}

export async function fetchBulkPayoutBatches(isBranch = false): Promise<BulkPayoutBatch[]> {
  const base = isBranch ? '/org/v1/branch/bulk-payouts' : '/org/v1/bulk-payouts'
  const res = await http.get<{ status: string; data: BulkPayoutBatch[] }>(base)
  return res.data.data
}

export async function fetchBulkPayoutBatch(id: string, isBranch = false): Promise<{ batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number }> {
  const base = isBranch ? '/org/v1/branch/bulk-payouts' : '/org/v1/bulk-payouts'
  const res = await http.get<{ status: string; data: { batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number } }>(`${base}/${id}`)
  return res.data.data
}


export interface OrgPaymentLink {
  id: string
  organization_id?: string
  branch_id?: string
  code: string
  name?: string
  amount_cents: number
  currency: string
  description: string
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  display_status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DISABLED' | 'EXPIRED'
  customer_label?: string
  checkout_url?: string
  expires_at: string
  is_reusable: boolean
  allow_open_amount: boolean
  link_type?: string
  customer_id?: string
  paused?: boolean
  created_at: string
  payments_count?: number
  collected_cents?: number
  max_uses?: number
  use_count?: number
  redirect_url?: string
  cancel_url?: string
  brand_logo_url?: string
  brand_color?: string
  payment_image_url?: string
  header_banner_url?: string
  image_alt?: string
  collect_name?: boolean
  collect_phone?: boolean
  collect_email?: boolean
  require_reference?: boolean
  allow_message?: boolean
  payment_methods?: string
}

export interface PaymentLinkStats {
  collected_cents: number
  successful_count: number
  pending_count: number
  failed_count: number
  total_count: number
  conversion_pct: number
}

export interface PaymentLinkPayment {
  id: string
  payment_link_id: string
  transaction_id?: string
  amount_cents: number
  payer_phone?: string
  payer_email?: string
  method: string
  status: string
  customer_reference?: string
  customer_message?: string
  paid_at: string
  created_at: string
}

export interface CreatePaymentLinkInput {
  name?: string
  amount_cents: number
  currency?: string
  description?: string
  is_reusable?: boolean
  allow_open_amount?: boolean
  branch_id?: string
  expires_in_days?: number
  max_uses?: number
  redirect_url?: string
  cancel_url?: string
  payment_image_url?: string
  header_banner_url?: string
  image_alt?: string
  brand_color?: string
  collect_name?: boolean
  collect_phone?: boolean
  collect_email?: boolean
  require_reference?: boolean
  allow_message?: boolean
  payment_methods?: string
  link_type?: 'STANDARD' | 'INVOICE' | 'CUSTOMER' | 'DONATION'
  customer_id?: string
}

export interface OrgCustomerLite {
  id: string
  phone: string
  display_name?: string
}

export async function fetchOrgCustomersLite(search = ''): Promise<OrgCustomerLite[]> {
  const res = await http.get<{ status: string; data: { items?: OrgCustomerLite[] } }>(
    '/org/v1/customers', { params: { search: search || undefined, limit: 100 } },
  )
  return res.data.data.items ?? []
}

export interface PaymentLinkCreateResult {
  status: string
  message: string
  data: OrgPaymentLink
  url: string
}

export interface PaymentLinkAppearanceInput {
  payment_image_url?: string | null
  header_banner_url?: string | null
  image_alt?: string | null
  brand_color?: string | null
  redirect_url?: string | null
  cancel_url?: string | null
}

export interface PaginatedPaymentLinksResponse {
  total_count: number
  page: number
  page_size: number
  total_pages: number
  payment_links: OrgPaymentLink[]
}

function plBase(isBranch: boolean) {
  return isBranch ? '/org/v1/branch/payment-links' : '/org/v1/payment-links'
}

export async function createPaymentLink(input: CreatePaymentLinkInput, isBranch = false): Promise<PaymentLinkCreateResult> {
  const res = await http.post<PaymentLinkCreateResult>(plBase(isBranch), input)
  return res.data
}
export const createOrgPaymentLink = (input: CreatePaymentLinkInput) => createPaymentLink(input, false)
export const createBranchPaymentLink = (input: CreatePaymentLinkInput) => createPaymentLink(input, true)

export async function fetchPaymentLinks(isBranch = false): Promise<OrgPaymentLink[]> {
  const res = await http.get<PaginatedPaymentLinksResponse>(plBase(isBranch), { params: { page_size: 200 } })
  return res.data.payment_links ?? []
}
export const fetchOrgPaymentLinks = () => fetchPaymentLinks(false)
export const fetchBranchPaymentLinks = () => fetchPaymentLinks(true)

export interface PaymentLinksPageParams {
  page?: number
  page_size?: number
  status?: string
  search?: string
}

export async function fetchPaymentLinksPage(
  isBranch = false,
  params: PaymentLinksPageParams = {},
): Promise<PaginatedPaymentLinksResponse> {
  const res = await http.get<PaginatedPaymentLinksResponse>(plBase(isBranch), { params })
  return {
    total_count: res.data.total_count ?? 0,
    page: res.data.page ?? 1,
    page_size: res.data.page_size ?? 20,
    total_pages: res.data.total_pages ?? 1,
    payment_links: res.data.payment_links ?? [],
  }
}

export async function fetchPaymentLink(id: string, isBranch = false): Promise<{ link: OrgPaymentLink; stats: PaymentLinkStats }> {
  const res = await http.get<{ status: string; data: OrgPaymentLink; stats: PaymentLinkStats }>(`${plBase(isBranch)}/${id}`)
  return { link: res.data.data, stats: res.data.stats }
}
export const fetchOrgPaymentLink = async (id: string) => (await fetchPaymentLink(id, false)).link
export const fetchBranchPaymentLink = async (id: string) => (await fetchPaymentLink(id, true)).link

export async function fetchPaymentLinkPayments(
  id: string, isBranch = false, page = 1, pageSize = 50,
): Promise<{ payments: PaymentLinkPayment[]; total: number; page: number; page_size: number }> {
  const res = await http.get<{ status: string; data: { payments: PaymentLinkPayment[]; total: number; page: number; page_size: number } }>(
    `${plBase(isBranch)}/${id}/payments`, { params: { page, page_size: pageSize } },
  )
  return res.data.data
}

export async function fetchPaymentLinkSession(id: string, isBranch = false): Promise<Record<string, unknown> | null> {
  const res = await http.get<{ status: string; data: { session: Record<string, unknown> | null } }>(`${plBase(isBranch)}/${id}/session`)
  return res.data.data.session
}

export async function closePaymentLink(id: string, isBranch = false): Promise<void> {
  await http.post(`${plBase(isBranch)}/${id}/close`)
}
export const closeOrgPaymentLink = (id: string) => closePaymentLink(id, false)
export const closeBranchPaymentLink = (id: string) => closePaymentLink(id, true)

export async function pausePaymentLink(id: string, isBranch = false): Promise<void> {
  await http.post(`${plBase(isBranch)}/${id}/pause`)
}
export async function resumePaymentLink(id: string, isBranch = false): Promise<void> {
  await http.post(`${plBase(isBranch)}/${id}/resume`)
}
export async function updatePaymentLinkAppearance(id: string, input: PaymentLinkAppearanceInput, isBranch = false): Promise<void> {
  await http.patch(`${plBase(isBranch)}/${id}/appearance`, input)
}

export interface PaymentLinkImageUpload {
  upload_url: string
  public_url: string
  content_type: string
}

export async function presignPaymentLinkImage(
  contentType: string, purpose: 'payment_image' | 'header_banner', isBranch = false,
): Promise<PaymentLinkImageUpload> {
  const res = await http.post<{ status: string; data: PaymentLinkImageUpload }>(
    `${plBase(isBranch)}/upload-url`, { content_type: contentType, purpose },
  )
  return res.data.data
}

export async function uploadPaymentLinkImage(
  file: File, purpose: 'payment_image' | 'header_banner', isBranch = false,
): Promise<string> {
  const { upload_url, public_url } = await presignPaymentLinkImage(file.type, purpose, isBranch)
  await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  return public_url
}

export async function reclaimBulkPayoutResidual(id: string, isBranch = false): Promise<{ reclaimed_cents: number }> {
  const base = isBranch ? '/org/v1/branch/bulk-payouts' : '/org/v1/bulk-payouts'
  const res = await http.post<{ status: string; data: { reclaimed_cents: number } }>(`${base}/${id}/reclaim`)
  return res.data.data
}


export interface BulkInvoiceRecipientInput {
  email: string
  phone: string
  name?: string
  amount_cents: number
  due_date: string 
  description?: string
  tax_category?: string
}

export interface BulkInvoiceEstimateResult {
  recipient_count: number
  suppressed_count: number
  fee_cents_per_invoice: number
  estimated_cost_cents: number
  wallet_balance_cents: number
  sufficient_funds: boolean
}

export interface InvoiceBatch {
  id: string
  organization_id: string
  branch_id: string | null
  schedule_id: string | null
  status: 'pending' | 'partially_sent' | 'sent' | 'failed'
  recipient_count: number
  fee_cents_per_invoice: number
  estimated_cost_cents: number
  actual_cost_cents: number
  sent_count: number
  failed_count: number
  suppressed_count: number
  created_at: string
  completed_at: string | null
}

export interface InvoiceBatchItem {
  id: string
  batch_id: string
  row_number: number
  recipient_email: string
  recipient_phone: string
  recipient_name: string
  amount_cents: number
  due_date: string
  description: string
  invoice_id: string | null
  send_status: 'queued' | 'processing' | 'sent' | 'failed' | 'suppressed'
  charged: boolean
  error_message: string | null
}

function idempotencyHeaders() {
  const key = (crypto as { randomUUID?: () => string }).randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return { headers: { 'X-Idempotency-Key': key } }
}

export async function estimateBulkInvoices(
  input: { branch_id?: string; recipients: BulkInvoiceRecipientInput[] },
  isBranch = false,
): Promise<BulkInvoiceEstimateResult> {
  const base = isBranch ? '/org/v1/branch/invoices/bulk' : '/org/v1/invoices/bulk'
  const res = await http.post<{ status: string; data: BulkInvoiceEstimateResult }>(`${base}/estimate`, input)
  return res.data.data
}

export interface BulkInvoiceSendResult {
  status: string
  message?: string
  data?: {
    id: string
    recipient_count: number
    suppressed_count: number
    estimated_cost_cents: number
    status: string
  }
}

export async function sendBulkInvoices(
  input: { branch_id?: string; recipients: BulkInvoiceRecipientInput[] },
  isBranch = false,
): Promise<BulkInvoiceSendResult> {
  const base = isBranch ? '/org/v1/branch/invoices/bulk' : '/org/v1/invoices/bulk'
  const res = await http.post<BulkInvoiceSendResult>(`${base}/send`, input, idempotencyHeaders())
  return res.data
}

export async function fetchInvoiceBatches(isBranch = false): Promise<InvoiceBatch[]> {
  const base = isBranch ? '/org/v1/branch/invoice-batches' : '/org/v1/invoice-batches'
  const res = await http.get<{ status: string; data: InvoiceBatch[] }>(base)
  return res.data.data
}

export async function fetchInvoiceBatch(id: string, isBranch = false): Promise<{ batch: InvoiceBatch; items: InvoiceBatchItem[] }> {
  const base = isBranch ? '/org/v1/branch/invoice-batches' : '/org/v1/invoice-batches'
  const res = await http.get<{ status: string; data: { batch: InvoiceBatch; items: InvoiceBatchItem[] } }>(`${base}/${id}`)
  return res.data.data
}


export interface InvoiceScheduleRecipientInput {
  email: string
  name?: string
  amount_cents: number
  due_offset_days?: number
  description?: string
  tax_category?: string
}

export interface InvoiceScheduleRecipient {
  id: string
  schedule_id: string
  email: string
  recipient_name: string
  amount_cents: number
  due_offset_days: number
  description: string
}

export interface InvoiceSchedule {
  id: string
  organization_id: string
  branch_id: string | null
  name: string
  recurrence: 'monthly'
  next_run_date: string
  status: 'active' | 'paused_insufficient_funds' | 'paused_manual' | 'cancelled'
  created_at: string
  recipients: InvoiceScheduleRecipient[]
}

export async function createInvoiceSchedule(
  input: { branch_id?: string; name?: string; recurrence: 'monthly'; next_run_date: string; recipients: InvoiceScheduleRecipientInput[] },
  isBranch = false,
): Promise<InvoiceSchedule> {
  const base = isBranch ? '/org/v1/branch/invoice-schedules' : '/org/v1/invoice-schedules'
  const res = await http.post<{ status: string; data: InvoiceSchedule }>(base, input, idempotencyHeaders())
  return res.data.data
}

export async function fetchInvoiceSchedules(isBranch = false): Promise<InvoiceSchedule[]> {
  const base = isBranch ? '/org/v1/branch/invoice-schedules' : '/org/v1/invoice-schedules'
  const res = await http.get<{ status: string; data: InvoiceSchedule[] }>(base)
  return res.data.data
}

export async function patchInvoiceSchedule(
  scheduleId: string,
  input: { action?: 'pause' | 'resume' | 'cancel'; name?: string; recipients?: InvoiceScheduleRecipientInput[] },
  isBranch = false,
): Promise<InvoiceSchedule> {
  const base = isBranch ? '/org/v1/branch/invoice-schedules' : '/org/v1/invoice-schedules'
  const res = await http.patch<{ status: string; data: InvoiceSchedule }>(`${base}/${scheduleId}`, input)
  return res.data.data
}


export interface RecipientSuppression {
  id: string
  organization_id: string
  email: string
  revoked_by: string | null
  revoked_at: string
  reason: string | null
}

export async function createRecipientSuppression(
  input: { email: string; reason?: string },
  isBranch = false,
): Promise<RecipientSuppression> {
  const base = isBranch ? '/org/v1/branch/recipient-suppressions' : '/org/v1/recipient-suppressions'
  const res = await http.post<{ status: string; data: RecipientSuppression }>(base, input)
  return res.data.data
}

export async function fetchRecipientSuppressions(isBranch = false): Promise<RecipientSuppression[]> {
  const base = isBranch ? '/org/v1/branch/recipient-suppressions' : '/org/v1/recipient-suppressions'
  const res = await http.get<{ status: string; data: RecipientSuppression[] }>(base)
  return res.data.data
}

export async function deleteRecipientSuppression(email: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/recipient-suppressions' : '/org/v1/recipient-suppressions'
  await http.delete(`${base}/${encodeURIComponent(email)}`)
}


export interface PayoutFeeEstimate {
  amount_cents: number
  fee_cents: number
  total_cents: number
  is_estimate: boolean
}

export async function fetchPayoutFeeEstimate(amountCents: number, destinationType: string): Promise<PayoutFeeEstimate> {
  const res = await http.get<{ status: string; data: PayoutFeeEstimate }>('/org/v1/payouts/fee-estimate', {
    params: { amount_cents: amountCents, destination_type: destinationType },
  })
  return res.data.data
}


export interface OrgInvoiceItem {
  id: string
  item_name: string
  description?: string | null
  quantity: number
  unit_price_cents: number
  total_cents: number
  tax_category: string
  hs_code?: string | null
}

export interface InvoiceMessagingLog {
  id: string
  channel: string
  recipient: string
  status: string
  provider_ref?: string | null
  charge_amount_cents?: number
  sent_at?: string | null
  error_message?: string | null
  created_at: string
}

export interface OrgInvoice {
  id: string
  organization_id?: string
  branch_id?: string
  store_id?: string | null
  invoice_number: string
  shareable_code: string
  currency: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_kra_pin?: string | null
  sub_total_cents: number
  tax_amount_cents: number
  total_cents: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED'
  due_date: string
  paid_at?: string | null
  payment_link_id?: string | null
  is_etims_synced?: boolean
  notes?: string | null
  items: OrgInvoiceItem[]
  messaging_logs?: InvoiceMessagingLog[]
  created_at: string
  updated_at?: string
}

export interface CreateOrgInvoiceItemInput {
  item_name: string
  description?: string
  quantity: number
  unit_price_cents: number
  tax_category?: string
}

export interface CreateOrgInvoiceInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_kra_pin?: string
  currency: string
  due_date: string
  notes?: string
  org_customer_id?: string
  items: CreateOrgInvoiceItemInput[]
  branch_id?: string
}

export interface OrgInvoiceCreateResult {
  status: string
  message: string
  data: OrgInvoice
  url: string
  payment_link_code: string | null
}

export async function createOrgInvoice(input: CreateOrgInvoiceInput): Promise<OrgInvoiceCreateResult> {
  const res = await http.post<OrgInvoiceCreateResult>('/org/v1/invoices', input)
  return res.data
}

export async function createBranchInvoice(input: CreateOrgInvoiceInput): Promise<OrgInvoiceCreateResult> {
  const res = await http.post<OrgInvoiceCreateResult>('/org/v1/branch/invoices', input)
  return res.data
}

export async function fetchOrgInvoices(): Promise<OrgInvoice[]> {
  const res = await http.get<{ status: string; data: OrgInvoice[] }>('/org/v1/invoices')
  return res.data.data ?? []
}

export async function fetchBranchInvoices(): Promise<OrgInvoice[]> {
  const res = await http.get<{ status: string; data: OrgInvoice[] }>('/org/v1/branch/invoices')
  return res.data.data ?? []
}

export async function sendOrgInvoice(id: string, channels: string[], isBranch = false): Promise<{ fee_charged_cents: number }> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.post<{ status: string; data: { fee_charged_cents: number } }>(`${base}/${id}/send`, { channels })
  return res.data.data
}

export async function downloadOrgInvoicePdf(id: string, isBranch = false): Promise<Blob> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.get(`${base}/${id}/pdf`, { responseType: 'blob' })
  return res.data
}

export async function fetchOrgInvoiceDetail(id: string, isBranch = false): Promise<OrgInvoice> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.get<{ status: string; data: OrgInvoice }>(`${base}/${id}`)
  return res.data.data
}

export async function markOrgInvoicePaid(id: string, isBranch = false): Promise<OrgInvoice> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.post<{ status: string; data: OrgInvoice }>(`${base}/${id}/mark-paid`)
  return res.data.data
}

export async function cancelOrgInvoice(id: string, isBranch = false): Promise<OrgInvoice> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.post<{ status: string; data: OrgInvoice }>(`${base}/${id}/cancel`)
  return res.data.data
}

export interface InvoiceRecipientHistoryEntry {
  email: string
  name: string
  last_sent_at: string
}

export async function fetchInvoiceRecipientHistory(isBranch = false): Promise<InvoiceRecipientHistoryEntry[]> {
  const base = isBranch ? '/org/v1/branch/invoices' : '/org/v1/invoices'
  const res = await http.get<{ status: string; data: InvoiceRecipientHistoryEntry[] }>(`${base}/recipients`)
  return res.data.data ?? []
}


export interface OrgExpense {
  id: string
  organization_id?: string
  branch_id?: string
  amount_cents: number
  currency: string
  category: string
  vendor: string
  receipt_url: string
  occurred_at: string
  notes: string
  reference_code: string
  payment_method: string
  status: string
  tax_amount_cents: number
  is_tax_deductible: boolean
  vendor_pin: string
  created_at: string
}

export interface CreateOrgExpenseInput {
  amount_cents: number
  category: string
  vendor: string
  date: string
  receipt_url?: string
  notes?: string
  reference_code?: string
  payment_method?: string
  status?: string
  tax_amount_cents?: number
  is_tax_deductible?: boolean
  vendor_pin?: string
  branch_id?: string
}

interface OrgExpenseListResponse {
  expenses: OrgExpense[]
  totalCount: number
  page: number
  totalPages: number
}

export async function createOrgExpense(input: CreateOrgExpenseInput): Promise<OrgExpense> {
  const res = await http.post<{ status: string; data: OrgExpense }>('/org/v1/expenses', input)
  return res.data.data
}

export async function createBranchExpense(input: CreateOrgExpenseInput): Promise<OrgExpense> {
  const res = await http.post<{ status: string; data: OrgExpense }>('/org/v1/branch/expenses', input)
  return res.data.data
}

export async function fetchOrgExpenses(page = 1): Promise<OrgExpenseListResponse> {
  const res = await http.get<{ status: string; data: OrgExpenseListResponse }>('/org/v1/expenses', { params: { page } })
  return res.data.data
}

export async function fetchBranchExpenses(page = 1): Promise<OrgExpenseListResponse> {
  const res = await http.get<{ status: string; data: OrgExpenseListResponse }>('/org/v1/branch/expenses', { params: { page } })
  return res.data.data
}

export async function fetchOrgExpense(id: string, isBranch = false): Promise<OrgExpense> {
  const base = isBranch ? '/org/v1/branch/expenses' : '/org/v1/expenses'
  const res = await http.get<{ status: string; data: OrgExpense }>(`${base}/${id}`)
  return res.data.data
}

export interface ReceiptUploadPresign {
  upload_url: string
  public_url: string
}

export async function presignExpenseReceiptUpload(contentType: string, isBranch = false): Promise<ReceiptUploadPresign> {
  const base = isBranch ? '/org/v1/branch/expenses' : '/org/v1/expenses'
  const res = await http.post<{ status: string; data: ReceiptUploadPresign }>(`${base}/upload-presign`, { content_type: contentType })
  return res.data.data
}


export async function uploadExpenseReceipt(file: File, isBranch = false): Promise<string> {
  const presign = await presignExpenseReceiptUpload(file.type, isBranch)
  const res = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) {
    throw new Error(`Receipt upload failed (${res.status})`)
  }
  return presign.public_url
}


export interface OrgTag {
  id: string
  organization_id: string
  name: string
  color?: string
  created_at: string
}

export async function createTag(name: string, color: string | undefined, isBranch = false): Promise<OrgTag> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  const res = await http.post<{ status: string; data: OrgTag }>(base, { name, color })
  return res.data.data
}

export async function fetchTags(isBranch = false): Promise<OrgTag[]> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  const res = await http.get<{ status: string; data: OrgTag[] }>(base)
  return res.data.data ?? []
}

export async function deleteTag(id: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  await http.delete(`${base}/${id}`)
}

export type TagSubjectType = 'payout' | 'expense' | 'transaction' | 'petty_cash_draw'

export async function assignTag(tagId: string, subjectType: TagSubjectType, subjectId: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  await http.post(`${base}/assign`, { tag_id: tagId, subject_type: subjectType, subject_id: subjectId })
}

export async function unassignTag(tagId: string, subjectType: TagSubjectType, subjectId: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  await http.post(`${base}/unassign`, { tag_id: tagId, subject_type: subjectType, subject_id: subjectId })
}

export interface TagBreakdownRow {
  tag_id: string
  tag_name: string
  tag_color?: string
  total_cents: number
  count: number
}

export interface TagBreakdown {
  from: string
  to: string
  tags: TagBreakdownRow[]
  untagged: { total_cents: number; count: number }
}

export async function fetchTagBreakdown(params: { from?: string; to?: string }, isBranch = false): Promise<TagBreakdown> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  const res = await http.get<{ status: string; data: TagBreakdown }>(`${base}/breakdown`, { params })
  return res.data.data
}

export async function fetchTagsForSubject(subjectType: TagSubjectType, subjectId: string, isBranch = false): Promise<OrgTag[]> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  const res = await http.get<{ status: string; data: OrgTag[] }>(`${base}/for/${subjectType}/${subjectId}`)
  return res.data.data ?? []
}

export interface PettyCashFloat {
  id: string
  name: string
  branch_id?: string | null
  is_active: boolean
  balance_cents: number
  created_at: string
}

export interface PettyCashDraw {
  id: string
  float_id: string
  amount_cents: number
  payee: string
  category?: string
  receipt_url?: string
  notes?: string
  drawn_by_org_member_id?: string | null
  drawn_by_branch_member_id?: string | null
  drawn_at: string
}

export async function createPettyCashFloat(name: string, branchId?: string): Promise<{ id: string; name: string; branch_id?: string | null }> {
  const res = await http.post<{ status: string; data: { id: string; name: string; branch_id?: string | null } }>(
    '/org/v1/petty-cash', { name, branch_id: branchId },
  )
  return res.data.data
}

export async function fetchPettyCashFloats(isBranch = false): Promise<PettyCashFloat[]> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.get<{ status: string; data: PettyCashFloat[] }>(base)
  return res.data.data ?? []
}

export async function fundPettyCashFloat(floatId: string, amount: number, confirm: { password?: string; pin?: string }): Promise<void> {
  await http.post(`/org/v1/petty-cash/${floatId}/fund`, { amount, ...confirm })
}

export async function recordPettyCashDraw(
  floatId: string,
  input: { amount: number; payee: string; category?: string; receipt_url?: string; notes?: string },
  isBranch = false,
): Promise<PettyCashDraw> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.post<{ status: string; data: PettyCashDraw }>(`${base}/${floatId}/draw`, input)
  return res.data.data
}

export async function fetchPettyCashHistory(floatId: string, isBranch = false): Promise<PettyCashDraw[]> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.get<{ status: string; data: PettyCashDraw[] }>(`${base}/${floatId}/history`)
  return res.data.data ?? []
}

export interface PettyCashPayoutInput {
  amount: number
  recipient_name: string
  remarks: string
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'PAYBILL' | 'TILL_NUMBER'
  phone_number?: string
  shortcode?: string
  account_reference?: string
  bank_code?: string
  bank_account_number?: string
  password?: string
  pin?: string
  category?: string
}

export interface PettyCashPayoutResult {
  status: 'success' | 'otp_required'
  message: string
  payout_id?: string
  fee_cents?: number
}


export async function requestPettyCashPayout(floatId: string, input: PettyCashPayoutInput, isBranch = false): Promise<PettyCashPayoutResult> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.post<PettyCashPayoutResult>(`${base}/${floatId}/payout`, input)
  return res.data
}

export async function confirmPettyCashPayout(floatId: string, otp: string, isBranch = false): Promise<PettyCashPayoutResult> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.post<PettyCashPayoutResult>(`${base}/${floatId}/payout/confirm`, { otp })
  return res.data
}

export interface OrgSupportMessage {
  id: string
  created_at: string
  ticket_id: string
  sender_type: 'org_member' | 'branch_member' | 'admin' | 'system'
  sender_id: string
  body: string
  is_read: boolean
}

export interface OrgSupportTicket {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  org_member_id?: string | null
  branch_member_id?: string | null
  branch_id?: string | null
  admin_user_id?: string | null
  subject: string
  status: string
  priority: string
  last_message_at: string
  last_message_from: string
  messages?: OrgSupportMessage[]
}

export async function fetchOrgSupportTickets(isBranch = false): Promise<OrgSupportTicket[]> {
  const base = isBranch ? '/org/v1/branch/support/tickets' : '/org/v1/support/tickets'
  const res = await http.get<{ status: string; data: OrgSupportTicket[] }>(base)
  return res.data.data
}

export async function fetchOrgSupportTicket(ticketId: string, isBranch = false): Promise<OrgSupportTicket> {
  const base = isBranch ? '/org/v1/branch/support/tickets' : '/org/v1/support/tickets'
  const res = await http.get<{ status: string; data: OrgSupportTicket }>(`${base}/${ticketId}`)
  return res.data.data
}

export async function createOrgSupportTicket(subject: string, message: string, isBranch = false): Promise<OrgSupportTicket> {
  const base = isBranch ? '/org/v1/branch/support/tickets' : '/org/v1/support/tickets'
  const res = await http.post<{ status: string; data: OrgSupportTicket }>(base, { subject, message })
  return res.data.data
}

export async function sendOrgSupportMessage(ticketId: string, message: string, isBranch = false): Promise<OrgSupportMessage> {
  const base = isBranch ? '/org/v1/branch/support/tickets' : '/org/v1/support/tickets'
  const res = await http.post<{ status: string; data: OrgSupportMessage }>(`${base}/${ticketId}/send`, { message })
  return res.data.data
}

export interface OrgMemberLoginHistoryRow {
  id: string
  organization_id: string
  org_member_id?: string | null
  branch_member_id?: string | null
  ip_address: string
  country: string
  country_code: string
  city: string
  latitude?: number | null
  longitude?: number | null
  isp: string
  user_agent: string
  login_method: string
  created_at: string
}

export interface PagedLoginHistory {
  rows: OrgMemberLoginHistoryRow[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface LoginHistoryApiResponse {
  status: string
  data: OrgMemberLoginHistoryRow[]
  page: number
  page_size: number
  total_count: number
  total_pages: number
}

export async function fetchLoginHistory(isBranchSession: boolean, page = 1, pageSize = 20, search = ''): Promise<PagedLoginHistory> {
  const path = isBranchSession ? '/org/v1/branch/security/login-history' : '/org/v1/security/login-history'
  const res = await http.get<LoginHistoryApiResponse>(path, { params: { page, page_size: pageSize, search: search || undefined } })
  return {
    rows: res.data.data,
    page: res.data.page,
    pageSize: res.data.page_size,
    totalCount: res.data.total_count,
    totalPages: res.data.total_pages,
  }
}

export async function fetchOrganizationLoginHistory(page = 1, pageSize = 20, search = ''): Promise<PagedLoginHistory> {
  const res = await http.get<LoginHistoryApiResponse>('/org/v1/security/login-history/organization', { params: { page, page_size: pageSize, search: search || undefined } })
  return {
    rows: res.data.data,
    page: res.data.page,
    pageSize: res.data.page_size,
    totalCount: res.data.total_count,
    totalPages: res.data.total_pages,
  }
}

export interface OrgActiveSession {
  session_id: string
  device_id: string
  device_name: string
  platform: string
  app_version: string
  ip_address: string
  user_agent: string
  created_at: string
  last_activity: string
  expires_at: string
  is_current: boolean
}

export async function fetchActiveSessions(isBranchSession: boolean): Promise<OrgActiveSession[]> {
  const path = isBranchSession ? '/org/v1/branch/security/sessions' : '/org/v1/security/sessions'
  const res = await http.get<{ status: string; data: OrgActiveSession[] }>(path)
  return res.data.data ?? []
}

export async function revokeSession(isBranchSession: boolean, sessionId: string): Promise<void> {
  const base = isBranchSession ? '/org/v1/branch/security/sessions' : '/org/v1/security/sessions'
  await http.delete(`${base}/${sessionId}`)
}

export async function logoutAllSessions(isBranchSession: boolean): Promise<void> {
  const path = isBranchSession ? '/org/v1/branch/security/logout-all' : '/org/v1/security/logout-all'
  await http.post(path)
}

export interface OrgFraudAlert {
  id: string
  alert_type: string
  severity: string
  description: string
  status: string
  detected_at: string
  transaction_id?: string | null
}

export async function fetchOrgFraudAlerts(isBranchSession: boolean, status = 'NEW', limit = 20): Promise<{ alerts: OrgFraudAlert[]; total: number }> {
  const path = isBranchSession ? '/org/v1/branch/security/alerts' : '/org/v1/security/alerts'
  const res = await http.get<{ alerts: OrgFraudAlert[]; total: number }>(path, { params: { status, limit } })
  return res.data
}

export async function fetchOrgFraudAlertStats(isBranchSession: boolean): Promise<Record<string, number>> {
  const path = isBranchSession ? '/org/v1/branch/security/alerts/stats' : '/org/v1/security/alerts/stats'
  const res = await http.get<{ stats: Record<string, number> }>(path)
  return res.data.stats ?? {}
}

export async function reviewOrgFraudAlert(isBranchSession: boolean, alertId: string, action: 'CONFIRMED' | 'DISMISSED', note = ''): Promise<void> {
  const base = isBranchSession ? '/org/v1/branch/security/alerts' : '/org/v1/security/alerts'
  await http.post(`${base}/${alertId}/review`, { action, note })
}

export interface OrgSupportContact {
  type: string
  name: string
  email: string
  phone: string
}

export async function fetchOrgSupportContacts(isBranchSession = false): Promise<OrgSupportContact[]> {
  const path = isBranchSession ? '/org/v1/branch/utils/support-details' : '/org/v1/utils/support-details'
  const res = await http.get<{ contacts: OrgSupportContact[] }>(path)
  return res.data.contacts ?? []
}


export type SupplierStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type SupplierVerification = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
export type SupplierRisk = 'NORMAL' | 'ELEVATED' | 'HIGH'
export type SupplierPayoutMethodKind = 'MOBILE_MONEY' | 'BANK' | 'PAYBILL' | 'TILL'

export interface SupplierPayoutMethod {
  id: string
  method: SupplierPayoutMethodKind
  label: string
  currency: string
  country: string
  phone_number?: string | null
  bank_code?: string | null
  bank_account_number?: string | null
  account_name: string
  is_primary: boolean
}

export interface SupplierContact {
  id: string
  name: string
  email: string
  phone: string
  role: string
  is_primary: boolean
}

export interface Supplier {
  id: string
  organization_id: string
  branch_id?: string | null
  supplier_type: 'BUSINESS' | 'INDIVIDUAL'
  category: string
  legal_name: string
  trading_name: string
  registration_number: string
  tax_number: string
  supplier_code: string
  country: string
  preferred_currency: string
  email: string
  phone: string
  payment_terms_days: number
  status: SupplierStatus
  verification_status: SupplierVerification
  risk_level: SupplierRisk
  risk_level_override?: SupplierRisk | null
  risk_flags: unknown[]
  readiness_score: number
  screening_match_count: number
  screened_at?: string | null
  notes: string
  payout_methods?: SupplierPayoutMethod[]
  contacts?: SupplierContact[]
  created_at: string
  outstanding_cents?: number
  last_payment_at?: string | null
  readiness?: 'READY' | 'PENDING_VERIFICATION' | 'NO_PAYOUT_METHOD' | 'NOT_READY'
}

export interface SupplierListResponse {
  suppliers: Supplier[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface SupplierListParams {
  status?: string
  verification?: string
  readiness?: string
  q?: string
  branch_id?: string
  page?: number
  page_size?: number
}

export interface SupplierInput {
  branch_id?: string
  supplier_type?: string
  category?: string
  legal_name?: string
  trading_name?: string
  registration_number?: string
  tax_number?: string
  supplier_code?: string
  country?: string
  preferred_currency?: string
  email?: string
  phone?: string
  payment_terms_days?: number
  notes?: string
}

export interface SupplierPayoutMethodInput {
  method: SupplierPayoutMethodKind
  label?: string
  currency?: string
  country?: string
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
  account_name?: string
  is_primary?: boolean
}

export interface SupplierContactInput {
  name: string
  email?: string
  phone?: string
  role?: string
  is_primary?: boolean
}

function supplierBase(isBranch: boolean): string {
  return isBranch ? '/org/v1/branch/suppliers' : '/org/v1/suppliers'
}

export async function fetchSuppliers(isBranch: boolean, params: SupplierListParams = {}): Promise<SupplierListResponse> {
  const res = await http.get<{ status: string; data: SupplierListResponse }>(supplierBase(isBranch), { params })
  return res.data.data
}

export async function fetchSupplier(isBranch: boolean, id: string): Promise<Supplier> {
  const res = await http.get<{ status: string; data: Supplier }>(`${supplierBase(isBranch)}/${id}`)
  return res.data.data
}

export async function createSupplier(isBranch: boolean, input: SupplierInput): Promise<Supplier> {
  const res = await http.post<{ status: string; data: Supplier }>(supplierBase(isBranch), input)
  return res.data.data
}

export async function updateSupplier(isBranch: boolean, id: string, input: SupplierInput): Promise<Supplier> {
  const res = await http.patch<{ status: string; data: Supplier }>(`${supplierBase(isBranch)}/${id}`, input)
  return res.data.data
}

export async function setSupplierStatus(isBranch: boolean, id: string, action: 'suspend' | 'reactivate'): Promise<Supplier> {
  const res = await http.post<{ status: string; data: Supplier }>(`${supplierBase(isBranch)}/${id}/${action}`)
  return res.data.data
}

export async function rescreenSupplier(isBranch: boolean, id: string): Promise<void> {
  await http.post(`${supplierBase(isBranch)}/${id}/rescreen`)
}

export async function setSupplierVerification(id: string, action: 'verify' | 'reject-verification'): Promise<Supplier> {
  const res = await http.post<{ status: string; data: Supplier }>(`/org/v1/suppliers/${id}/${action}`)
  return res.data.data
}

export async function fetchSupplierPayoutMethods(isBranch: boolean, id: string): Promise<SupplierPayoutMethod[]> {
  const res = await http.get<{ status: string; data: SupplierPayoutMethod[] }>(`${supplierBase(isBranch)}/${id}/payout-methods`)
  return res.data.data
}

export async function replaceSupplierPayoutMethods(isBranch: boolean, id: string, methods: SupplierPayoutMethodInput[]): Promise<SupplierPayoutMethod[]> {
  const res = await http.put<{ status: string; data: SupplierPayoutMethod[] }>(`${supplierBase(isBranch)}/${id}/payout-methods`, { methods })
  return res.data.data
}

export async function fetchSupplierContacts(isBranch: boolean, id: string): Promise<SupplierContact[]> {
  const res = await http.get<{ status: string; data: SupplierContact[] }>(`${supplierBase(isBranch)}/${id}/contacts`)
  return res.data.data
}

export async function createSupplierContact(isBranch: boolean, id: string, input: SupplierContactInput): Promise<SupplierContact> {
  const res = await http.post<{ status: string; data: SupplierContact }>(`${supplierBase(isBranch)}/${id}/contacts`, input)
  return res.data.data
}

export async function updateSupplierContact(isBranch: boolean, id: string, contactId: string, input: SupplierContactInput): Promise<SupplierContact> {
  const res = await http.patch<{ status: string; data: SupplierContact }>(`${supplierBase(isBranch)}/${id}/contacts/${contactId}`, input)
  return res.data.data
}

export async function deleteSupplierContact(isBranch: boolean, id: string, contactId: string): Promise<void> {
  await http.delete(`${supplierBase(isBranch)}/${id}/contacts/${contactId}`)
}


export type CrmCustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type CrmCustomerVerification = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
export type CrmPaymentMethodKind = 'MOBILE_MONEY' | 'BANK' | 'PAYBILL' | 'TILL' | 'CARD'

export interface CrmCustomerContact {
  id: string
  customer_id: string
  name: string
  email: string
  phone: string
  role: string
  is_primary: boolean
}

export interface CrmCustomerPaymentMethod {
  id: string
  customer_id: string
  method: CrmPaymentMethodKind
  label: string
  currency: string
  country: string
  phone_number?: string | null
  bank_code?: string | null
  bank_account_number?: string | null
  paybill_number?: string | null
  till_number?: string | null
  account_name: string
  is_primary: boolean
}

export interface CrmCustomer {
  id: string
  organization_id: string
  branch_id?: string | null
  customer_type: 'BUSINESS' | 'INDIVIDUAL'
  category: string
  legal_name: string
  trading_name: string
  registration_number: string
  tax_number: string
  customer_code: string
  country: string
  preferred_currency: string
  email: string
  phone: string
  billing_address: string
  payment_terms_days: number
  credit_limit_cents: number
  status: CrmCustomerStatus
  verification_status: CrmCustomerVerification
  notes: string
  payment_methods?: CrmCustomerPaymentMethod[]
  contacts?: CrmCustomerContact[]
  created_at: string
  outstanding_cents?: number
  last_invoice_at?: string | null
  readiness?: 'READY' | 'PENDING_VERIFICATION' | 'NOT_READY'
}

export interface CrmCustomerListResponse {
  customers: CrmCustomer[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CrmCustomerListParams {
  status?: string
  verification?: string
  q?: string
  branch_id?: string
  page?: number
  page_size?: number
}

export interface CrmCustomerSummary {
  total_customers: number
  active_customers: number
  verified_customers: number
  pending_verification: number
  outstanding_cents: number
  overdue_cents: number
  overdue_count: number
}

export interface CrmCustomerInput {
  branch_id?: string
  customer_type?: string
  category?: string
  legal_name?: string
  trading_name?: string
  registration_number?: string
  tax_number?: string
  customer_code?: string
  country?: string
  preferred_currency?: string
  email?: string
  phone?: string
  billing_address?: string
  payment_terms_days?: number
  credit_limit_cents?: number
  notes?: string
}

export interface CrmContactInput {
  name: string
  email?: string
  phone?: string
  role?: string
  is_primary?: boolean
}

export interface CrmPaymentMethodInput {
  method: CrmPaymentMethodKind
  label?: string
  currency?: string
  country?: string
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
  paybill_number?: string
  till_number?: string
  account_name?: string
  is_primary?: boolean
}

function crmCustomerBase(isBranch: boolean): string {
  return isBranch ? '/org/v1/branch/crm-customers' : '/org/v1/crm-customers'
}

export async function fetchCrmCustomers(isBranch: boolean, params: CrmCustomerListParams = {}): Promise<CrmCustomerListResponse> {
  const res = await http.get<{ status: string; data: CrmCustomerListResponse }>(crmCustomerBase(isBranch), { params })
  return res.data.data
}

export async function fetchCrmCustomersSummary(isBranch: boolean, branchId?: string): Promise<CrmCustomerSummary> {
  const res = await http.get<{ status: string; data: CrmCustomerSummary }>(`${crmCustomerBase(isBranch)}/summary`, {
    params: branchId ? { branch_id: branchId } : undefined,
  })
  return res.data.data
}

export async function fetchCrmCustomer(isBranch: boolean, id: string): Promise<CrmCustomer> {
  const res = await http.get<{ status: string; data: CrmCustomer }>(`${crmCustomerBase(isBranch)}/${id}`)
  return res.data.data
}

export async function createCrmCustomer(isBranch: boolean, input: CrmCustomerInput): Promise<CrmCustomer> {
  const res = await http.post<{ status: string; data: CrmCustomer }>(crmCustomerBase(isBranch), input)
  return res.data.data
}

export async function updateCrmCustomer(isBranch: boolean, id: string, input: CrmCustomerInput): Promise<CrmCustomer> {
  const res = await http.patch<{ status: string; data: CrmCustomer }>(`${crmCustomerBase(isBranch)}/${id}`, input)
  return res.data.data
}

export async function setCrmCustomerStatus(isBranch: boolean, id: string, action: 'suspend' | 'reactivate' | 'archive'): Promise<CrmCustomer> {
  const res = await http.post<{ status: string; data: CrmCustomer }>(`${crmCustomerBase(isBranch)}/${id}/${action}`)
  return res.data.data
}

export async function setCrmCustomerVerification(id: string, action: 'verify' | 'reject-verification'): Promise<CrmCustomer> {
  const res = await http.post<{ status: string; data: CrmCustomer }>(`/org/v1/crm-customers/${id}/${action}`)
  return res.data.data
}

export async function fetchCrmCustomerContacts(isBranch: boolean, id: string): Promise<CrmCustomerContact[]> {
  const res = await http.get<{ status: string; data: CrmCustomerContact[] }>(`${crmCustomerBase(isBranch)}/${id}/contacts`)
  return res.data.data
}

export async function createCrmCustomerContact(isBranch: boolean, id: string, input: CrmContactInput): Promise<CrmCustomerContact> {
  const res = await http.post<{ status: string; data: CrmCustomerContact }>(`${crmCustomerBase(isBranch)}/${id}/contacts`, input)
  return res.data.data
}

export async function updateCrmCustomerContact(isBranch: boolean, id: string, contactId: string, input: CrmContactInput): Promise<CrmCustomerContact> {
  const res = await http.patch<{ status: string; data: CrmCustomerContact }>(`${crmCustomerBase(isBranch)}/${id}/contacts/${contactId}`, input)
  return res.data.data
}

export async function deleteCrmCustomerContact(isBranch: boolean, id: string, contactId: string): Promise<void> {
  await http.delete(`${crmCustomerBase(isBranch)}/${id}/contacts/${contactId}`)
}

export async function fetchCrmCustomerPaymentMethods(isBranch: boolean, id: string): Promise<CrmCustomerPaymentMethod[]> {
  const res = await http.get<{ status: string; data: CrmCustomerPaymentMethod[] }>(`${crmCustomerBase(isBranch)}/${id}/payment-methods`)
  return res.data.data
}

export async function replaceCrmCustomerPaymentMethods(isBranch: boolean, id: string, methods: CrmPaymentMethodInput[]): Promise<CrmCustomerPaymentMethod[]> {
  const res = await http.put<{ status: string; data: CrmCustomerPaymentMethod[] }>(`${crmCustomerBase(isBranch)}/${id}/payment-methods`, { methods })
  return res.data.data
}

export interface CrmCustomerInvoiceRow {
  id: string
  invoice_number: string
  shareable_code: string
  status: string
  currency: string
  total_cents: number
  created_at: string
  due_date: string
  paid_at?: string | null
}

export interface CrmCustomerStatement {
  invoice_count: number
  total_invoiced_cents: number
  total_paid_cents: number
  outstanding_cents: number
  overdue_cents: number
  invoices: CrmCustomerInvoiceRow[]
}

export async function fetchCrmCustomerStatement(isBranch: boolean, id: string): Promise<CrmCustomerStatement> {
  const res = await http.get<{ status: string; data: CrmCustomerStatement }>(`${crmCustomerBase(isBranch)}/${id}/statement`)
  return res.data.data
}

export interface CrmCustomerInvite {
  id: string
  customer_id: string
  email: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  expires_at: string
  accepted_at?: string | null
  created_at: string
}

export async function fetchCrmCustomerInvites(isBranch: boolean, id: string): Promise<CrmCustomerInvite[]> {
  const res = await http.get<{ status: string; data: CrmCustomerInvite[] }>(`${crmCustomerBase(isBranch)}/${id}/invites`)
  return res.data.data
}

export async function inviteCrmCustomer(isBranch: boolean, id: string, email?: string): Promise<{ invite_id: string; link: string; expires_at: string }> {
  const res = await http.post<{ status: string; data: { invite_id: string; link: string; expires_at: string } }>(
    `${crmCustomerBase(isBranch)}/${id}/invite`, email ? { email } : {},
  )
  return res.data.data
}

export interface CustomerOnboardInfo {
  legal_name: string
  trading_name: string
  country: string
  preferred_currency: string
  category: string
}

export interface CustomerOnboardSubmission {
  payment_method?: {
    method: string
    currency?: string
    country?: string
    phone_number?: string
    bank_code?: string
    bank_account_number?: string
    paybill_number?: string
    till_number?: string
    account_name?: string
  }
  contact?: { name: string; email?: string; phone?: string; role?: string }
  registration_number?: string
  tax_number?: string
  billing_address?: string
}

export async function fetchCustomerOnboard(token: string): Promise<CustomerOnboardInfo> {
  const res = await http.get<{ status: string; data: CustomerOnboardInfo }>(`/org/v1/public/customers/onboard/${token}`)
  return res.data.data
}

export async function submitCustomerOnboard(token: string, body: CustomerOnboardSubmission): Promise<void> {
  await http.post(`/org/v1/public/customers/onboard/${token}`, body)
}

function apBase(isBranch: boolean): string {
  return isBranch ? '/org/v1/branch' : '/org/v1'
}

export interface SupplierLineItem {
  id?: string
  description: string
  sku?: string
  quantity_milli?: number
  unit_price_cents: number
  tax_rate_bps?: number
  tax_cents?: number
  discount_cents?: number
  line_total_cents?: number
}

export type SupplierInvoiceStatus = 'DRAFT' | 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOID'
export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SupplierInvoice {
  id: string
  organization_id: string
  branch_id?: string | null
  supplier_id: string
  purchase_order_id?: string | null
  invoice_number: string
  supplier_reference: string
  invoice_date?: string | null
  due_date?: string | null
  currency: string
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  paid_cents: number
  status: SupplierInvoiceStatus
  approval_status: ApprovalStatus
  approval_request_id?: string | null
  attachment_ref: string
  notes: string
  supplier?: Supplier
  lines?: SupplierLineItem[]
  created_at: string
}

export interface SupplierInvoiceInput {
  supplier_id: string
  purchase_order_id?: string
  invoice_date?: string
  due_date?: string
  currency?: string
  attachment_ref?: string
  notes?: string
  lines: SupplierLineItem[]
}

export interface PayablesSummary {
  outstanding_cents: number
  due_this_week_cents: number
  overdue_cents: number
  open_invoice_count: number
  overdue_count: number
}

export interface AgingBucket {
  currency: string
  current_cents: number
  d1_30_cents: number
  d31_60_cents: number
  d61_90_cents: number
  d90_plus_cents: number
}

export interface SupplierAttentionItem {
  supplier_id: string
  legal_name: string
  reason: string
}

export interface SuppliersOverview {
  total_suppliers: number
  active_suppliers: number
  payment_ready: number
  pending_verification: number
  payables: PayablesSummary
  recent_suppliers: Supplier[]
  upcoming_payables: SupplierInvoice[]
  attention: SupplierAttentionItem[]
  recent_payments: SupplierPayment[]
}

export interface SuppliersAnalytics {
  total_suppliers: number
  payment_ready: number
  overdue_invoices: number
  avg_payment_days: number
  spend_over_time: { month: string; spend_cents: number }[]
  aging: AgingBucket[]
  top_suppliers: { supplier_id: string; legal_name: string; spend_cents: number }[]
  spend_by_category: { category: string; spend_cents: number }[]
  failed_payments: number
}

export async function fetchSuppliersOverview(isBranch: boolean): Promise<SuppliersOverview> {
  const res = await http.get<{ status: string; data: SuppliersOverview }>(`${apBase(isBranch)}/suppliers-overview`)
  return res.data.data
}

export async function fetchSuppliersAnalytics(isBranch: boolean): Promise<SuppliersAnalytics> {
  const res = await http.get<{ status: string; data: SuppliersAnalytics }>(`${apBase(isBranch)}/suppliers-analytics`)
  return res.data.data
}

export async function fetchSupplierInvoices(isBranch: boolean, params: { supplier_id?: string; status?: string; payable?: boolean; page?: number } = {}): Promise<{ invoices: SupplierInvoice[]; total: number }> {
  const res = await http.get<{ status: string; data: { invoices: SupplierInvoice[]; total: number } }>(`${apBase(isBranch)}/supplier-invoices`, { params })
  return res.data.data
}

export async function fetchSupplierInvoice(isBranch: boolean, id: string): Promise<SupplierInvoice> {
  const res = await http.get<{ status: string; data: SupplierInvoice }>(`${apBase(isBranch)}/supplier-invoices/${id}`)
  return res.data.data
}

export async function createSupplierInvoice(isBranch: boolean, input: SupplierInvoiceInput): Promise<SupplierInvoice> {
  const res = await http.post<{ status: string; data: SupplierInvoice }>(`${apBase(isBranch)}/supplier-invoices`, input)
  return res.data.data
}

export async function updateSupplierInvoice(isBranch: boolean, id: string, input: Partial<SupplierInvoiceInput>): Promise<SupplierInvoice> {
  const res = await http.patch<{ status: string; data: SupplierInvoice }>(`${apBase(isBranch)}/supplier-invoices/${id}`, input)
  return res.data.data
}

export async function submitSupplierInvoice(isBranch: boolean, id: string): Promise<SupplierInvoice> {
  const res = await http.post<{ status: string; data: SupplierInvoice }>(`${apBase(isBranch)}/supplier-invoices/${id}/submit`)
  return res.data.data
}

export async function voidSupplierInvoice(isBranch: boolean, id: string): Promise<SupplierInvoice> {
  const res = await http.post<{ status: string; data: SupplierInvoice }>(`${apBase(isBranch)}/supplier-invoices/${id}/void`)
  return res.data.data
}

export async function sendSupplierInvoiceEmail(isBranch: boolean, id: string): Promise<{ emailed_to: string; fee_charged_cents: number }> {
  const res = await http.post<{ status: string; message: string; data: { emailed_to: string; fee_charged_cents: number } }>(
    `${apBase(isBranch)}/supplier-invoices/${id}/send`,
  )
  return res.data.data
}

export async function decideSupplierInvoice(id: string, action: 'approve' | 'reject', reason?: string): Promise<SupplierInvoice> {
  const res = await http.post<{ status: string; data: SupplierInvoice }>(`/org/v1/supplier-invoices/${id}/${action}`, { reason })
  return res.data.data
}

export async function fetchSupplierPayables(isBranch: boolean): Promise<{ invoices: SupplierInvoice[]; total: number; summary: PayablesSummary }> {
  const res = await http.get<{ status: string; data: { invoices: SupplierInvoice[]; total: number; summary: PayablesSummary } }>(`${apBase(isBranch)}/supplier-payables`)
  return res.data.data
}

export async function fetchPayablesAging(isBranch: boolean): Promise<AgingBucket[]> {
  const res = await http.get<{ status: string; data: AgingBucket[] }>(`${apBase(isBranch)}/supplier-payables/aging`)
  return res.data.data
}

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ISSUED' | 'CANCELLED' | 'CLOSED'
export type POFulfillment = 'NOT_STARTED' | 'PARTIAL' | 'FULFILLED'

export interface PurchaseOrder {
  id: string
  organization_id: string
  branch_id?: string | null
  supplier_id: string
  po_number: string
  issue_date?: string | null
  expected_delivery_date?: string | null
  currency: string
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  status: POStatus
  approval_status: ApprovalStatus
  approval_request_id?: string | null
  fulfillment_status: POFulfillment
  notes: string
  supplier?: Supplier
  lines?: SupplierLineItem[]
  created_at: string
}

export interface PurchaseOrderInput {
  supplier_id: string
  issue_date?: string
  expected_delivery_date?: string
  currency?: string
  notes?: string
  lines: SupplierLineItem[]
}

export async function fetchPurchaseOrders(isBranch: boolean, params: { supplier_id?: string; status?: string; page?: number } = {}): Promise<{ purchase_orders: PurchaseOrder[]; total: number }> {
  const res = await http.get<{ status: string; data: { purchase_orders: PurchaseOrder[]; total: number } }>(`${apBase(isBranch)}/purchase-orders`, { params })
  return res.data.data
}

export async function fetchPurchaseOrder(isBranch: boolean, id: string): Promise<PurchaseOrder> {
  const res = await http.get<{ status: string; data: PurchaseOrder }>(`${apBase(isBranch)}/purchase-orders/${id}`)
  return res.data.data
}

export async function createPurchaseOrder(isBranch: boolean, input: PurchaseOrderInput): Promise<PurchaseOrder> {
  const res = await http.post<{ status: string; data: PurchaseOrder }>(`${apBase(isBranch)}/purchase-orders`, input)
  return res.data.data
}

export async function updatePurchaseOrder(isBranch: boolean, id: string, input: Partial<PurchaseOrderInput>): Promise<PurchaseOrder> {
  const res = await http.patch<{ status: string; data: PurchaseOrder }>(`${apBase(isBranch)}/purchase-orders/${id}`, input)
  return res.data.data
}

export async function poAction(isBranch: boolean, id: string, action: 'submit' | 'issue' | 'cancel'): Promise<PurchaseOrder> {
  const res = await http.post<{ status: string; data: PurchaseOrder }>(`${apBase(isBranch)}/purchase-orders/${id}/${action}`)
  return res.data.data
}

export async function setPOFulfillment(isBranch: boolean, id: string, fulfillment_status: POFulfillment): Promise<PurchaseOrder> {
  const res = await http.post<{ status: string; data: PurchaseOrder }>(`${apBase(isBranch)}/purchase-orders/${id}/fulfillment`, { fulfillment_status })
  return res.data.data
}

export async function decidePurchaseOrder(id: string, action: 'approve' | 'reject', reason?: string): Promise<PurchaseOrder> {
  const res = await http.post<{ status: string; data: PurchaseOrder }>(`/org/v1/purchase-orders/${id}/${action}`, { reason })
  return res.data.data
}

export interface ApprovalStage {
  id: string
  stage_index: number
  name: string
  rule: string
  required_approvals: number
  received_approvals: number
  status: string
  verification_methods: string
}

export interface ApprovalDecisionRecord {
  id: string
  created_at: string
  stage_index: number
  decider_label: string
  decision: 'APPROVE' | 'REJECT'
  note: string
  verification_method: string
}

export interface ApprovalEventRecord {
  id: string
  created_at: string
  event_type: string
  actor_label: string
  detail: string
  status_after: string
}

export interface ApprovalRequest {
  id: string
  organization_id: string
  branch_id?: string | null
  action_type: string
  resource_type: string
  resource_id?: string | null
  title: string
  description: string
  maker_org_member_id?: string | null
  maker_label: string
  amount_cents?: number | null
  currency?: string | null
  status: string
  payload: Record<string, unknown>
  version: number
  current_stage_index: number
  expires_at?: string | null
  decided_at?: string | null
  created_at: string
  updated_at: string
  stages?: ApprovalStage[]
  decisions?: ApprovalDecisionRecord[]
  events?: ApprovalEventRecord[]
}

export interface ApprovalRequestList {
  approvals: ApprovalRequest[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApprovalListParams {
  status?: string
  action_type?: string
  search?: string
  page?: number
  page_size?: number
}

function approvalsBase(isBranch: boolean) {
  return isBranch ? '/org/v1/branch/approvals' : '/org/v1/approvals'
}

export async function fetchApprovals(isBranch: boolean, params: ApprovalListParams = {}): Promise<ApprovalRequestList> {
  const res = await http.get<{ status: string; data: ApprovalRequestList }>(approvalsBase(isBranch), { params })
  return res.data.data
}
export async function fetchApproval(isBranch: boolean, id: string): Promise<ApprovalRequest> {
  const res = await http.get<{ status: string; data: ApprovalRequest }>(`${approvalsBase(isBranch)}/${id}`)
  return res.data.data
}
export async function decideApproval(
  isBranch: boolean,
  id: string,
  decision: 'APPROVE' | 'REJECT',
  note?: string,
  verificationMethod?: string,
): Promise<ApprovalRequest> {
  const res = await http.post<{ status: string; data: ApprovalRequest }>(
    `${approvalsBase(isBranch)}/${id}/decisions`,
    { decision, note, verification_method: verificationMethod },
  )
  return res.data.data
}

export const fetchOrgApprovals = (params: ApprovalListParams = {}) => fetchApprovals(false, params)
export const fetchOrgApproval = (id: string) => fetchApproval(false, id)
export const decideOrgApproval = (id: string, decision: 'APPROVE' | 'REJECT', note?: string, verificationMethod?: string) =>
  decideApproval(false, id, decision, note, verificationMethod)

export type SupplierPaymentStatus = 'PENDING_OTP' | 'PENDING_APPROVAL' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED'

export interface SupplierPaymentAllocation {
  id: string
  invoice_id: string
  amount_cents: number
}

export interface SupplierPayment {
  id: string
  organization_id: string
  branch_id?: string | null
  supplier_id: string
  amount_cents: number
  fee_cents: number
  currency: string
  reference: string
  description: string
  status: SupplierPaymentStatus
  payout_id?: string | null
  provider: string
  failure_reason?: string | null
  completed_at?: string | null
  supplier?: Supplier
  allocations?: SupplierPaymentAllocation[]
  created_at: string
}

export interface SupplierPaymentInput {
  supplier_id: string
  amount_cents: number
  reference?: string
  description?: string
  allocations?: { invoice_id: string; amount_cents: number }[]
  pin?: string
  password?: string
}

export async function fetchSupplierPayments(isBranch: boolean, params: { supplier_id?: string; status?: string; page?: number } = {}): Promise<{ payments: SupplierPayment[]; total: number }> {
  const res = await http.get<{ status: string; data: { payments: SupplierPayment[]; total: number } }>(`${apBase(isBranch)}/supplier-payments`, { params })
  return res.data.data
}

export async function fetchSupplierPayment(isBranch: boolean, id: string): Promise<SupplierPayment> {
  const res = await http.get<{ status: string; data: SupplierPayment }>(`${apBase(isBranch)}/supplier-payments/${id}`)
  return res.data.data
}

export interface SupplierPaymentResult {
  status: 'success' | 'approval_required'
  message: string
  data: SupplierPayment
}

export async function createSupplierPayment(isBranch: boolean, input: SupplierPaymentInput): Promise<SupplierPaymentResult> {
  const res = await http.post<SupplierPaymentResult>(`${apBase(isBranch)}/supplier-payments`, input)
  return res.data
}

export async function decideSupplierPayment(id: string, action: 'approve' | 'reject', reason?: string): Promise<SupplierPayment> {
  const res = await http.post<{ status: string; data: SupplierPayment }>(`/org/v1/supplier-payments/${id}/${action}`, { reason })
  return res.data.data
}

export interface SupplierInvite {
  id: string
  supplier_id: string
  email: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  expires_at: string
  accepted_at?: string | null
  created_at: string
}

export async function createSupplierInvite(isBranch: boolean, supplierId: string, email?: string): Promise<{ invite_id: string; link: string; expires_at: string }> {
  const res = await http.post<{ status: string; data: { invite_id: string; link: string; expires_at: string } }>(`${apBase(isBranch)}/suppliers/${supplierId}/invite`, { email })
  return res.data.data
}

export async function fetchSupplierInvites(isBranch: boolean, supplierId: string): Promise<SupplierInvite[]> {
  const res = await http.get<{ status: string; data: SupplierInvite[] }>(`${apBase(isBranch)}/suppliers/${supplierId}/invites`)
  return res.data.data
}

export interface SupplierOnboardInfo {
  legal_name: string
  trading_name: string
  country: string
  preferred_currency: string
  category: string
}

export async function fetchSupplierOnboard(token: string): Promise<SupplierOnboardInfo> {
  const res = await http.get<{ status: string; data: SupplierOnboardInfo }>(`/org/v1/public/suppliers/onboard/${token}`)
  return res.data.data
}

export interface SupplierOnboardSubmission {
  payout_method: {
    method: SupplierPayoutMethodKind
    currency?: string
    country?: string
    phone_number?: string
    bank_code?: string
    bank_account_number?: string
    account_name?: string
  }
  contact?: { name: string; email?: string; phone?: string; role?: string }
  registration_number?: string
  tax_number?: string
}

export async function submitSupplierOnboard(token: string, body: SupplierOnboardSubmission): Promise<void> {
  await http.post(`/org/v1/public/suppliers/onboard/${token}`, body)
}

// ---- Settlement calendar ----

export interface SettlementHold {
  entry_id: number
  wallet_id: string
  wallet_type: string
  amount_cents: number
  original_amount_cents: number
  description?: string
  reference?: string
  transaction_id?: string | null
  txn_type?: string
  rail?: string
  customer_name?: string
  customer_phone?: string
  held_since: string
  expected_release_at?: string | null
  hold_reason: string
}

export interface SettlementCalendarNextSettlement {
  date: string
  amount_cents: number
  hold_count: number
}

export interface PublicHolidayEntry {
  id: string
  name: string
  date: string
  category: string
  is_full_day: boolean
  start_time?: string | null
  end_time?: string | null
  notes?: string | null
}

export interface SettlementCalendar {
  holds: SettlementHold[]
  total_held_cents: number
  next_settlement: SettlementCalendarNextSettlement | null
  upcoming_holidays: PublicHolidayEntry[]
  hold_window_business_days: number
}

export async function fetchOrgSettlementCalendar(): Promise<SettlementCalendar> {
  const res = await http.get<{ status: string; data: SettlementCalendar }>('/org/v1/settlement-calendar')
  return res.data.data
}

export async function fetchBranchSettlementCalendar(): Promise<SettlementCalendar> {
  const res = await http.get<{ status: string; data: SettlementCalendar }>('/org/v1/branch/settlement-calendar')
  return res.data.data
}
