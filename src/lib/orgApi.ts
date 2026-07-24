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
}

export async function fetchOrgTransaction(id: string): Promise<TransactionDetail> {
  const res = await http.get<{ status: string; data: TransactionDetail }>(`/org/v1/transactions/${id}`)
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

export interface StkPushInput {
  amount_cents: number
  customer_phone: string
  remarks?: string
  branch_id?: string
}

export interface StkPushResult {
  checkout_request_id: string
  merchant_request_id: string
  customer_message: string
  provider: string
  reference: string
  wallet_id: string
}


export async function requestStkPush(isBranchSession: boolean, input: StkPushInput): Promise<StkPushResult> {
  const path = isBranchSession ? '/org/v1/branch/collect/stk-push' : '/org/v1/collect/stk-push'
  const res = await http.post<{ status: string; data: StkPushResult }>(path, input)
  return res.data.data
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

export async function uploadOrgDocument(file: File, docType: string): Promise<OrgDocument> {
  const form = new FormData()
  form.append('document', file)
  form.append('doc_type', docType)
  const res = await http.post<{ status: string; data: OrgDocument }>('/org/v1/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
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
  branch_ids: string[]
  scopes: string[]
  status: string
  created_at: string
}

export interface CreateCredentialInput {
  branch_ids?: string[]
  scopes: string[]
}

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

export interface OrgApiKey {
  id: string
  name: string
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
}

export interface CreateApiKeyResult {
  id: string
  name: string
  full_key: string
  key_prefix: string
  branch_id: string | null
  scopes: string[]
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


export interface RequestPayoutInput {
  amount: number
  phone_number?: string
  recipient_name: string
  remarks: string
  branch_id?: string
  destination_type?: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  bank_code?: string
  bank_account_number?: string
  password?: string
  pin?: string
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
  city?: string
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
  actor: { id: string | null; type: string; role: string; tenant_id: string | null }
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

export async function validateOrgBankAccount(accountNumber: string, bankCode: string): Promise<BankAccountValidationResult> {
  const res = await http.post<{ status: string; data: BankAccountValidationResult }>('/org/v1/utils/validate/bank-account', {
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


export async function validateOrgMobileMoney(phone: string, carrier?: string): Promise<MobileMoneyValidationResult> {
  const res = await http.post<{ status: string; data: MobileMoneyValidationResult }>('/org/v1/utils/validate/mobile-money', {
    phone,
    carrier,
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


export async function validateOrgScreenName(name: string): Promise<ScreenNameResult> {
  const res = await http.post<{ status: string; data: ScreenNameResult }>('/org/v1/utils/validate/screen-name', { name })
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
  schedule_type: 'ONE_TIME' | 'RECURRING'
  recurrence_interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null
  next_run_at: string
  end_date: string | null
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED'
  last_run_at: string | null
  last_run_status: string | null
  created_at: string
}

export interface CreateScheduledPayoutInput {
  amount: number
  sweep_full_balance?: boolean
  destination_type?: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
  recipient_name: string
  remarks: string
  funding_source?: 'MAIN' | 'VAULT'
  vault_id?: string
  schedule_type?: 'ONE_TIME' | 'RECURRING'
  recurrence_interval?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  start_at: string 
  end_date?: string 
}

export async function fetchScheduledPayouts(): Promise<ScheduledPayout[]> {
  const res = await http.get<{ status: string; data: ScheduledPayout[] }>('/org/v1/scheduled-payouts')
  return res.data.data
}

export interface ScheduledPayoutCreateResult {
  status: string
  message?: string
  next_run_at?: string
  data?: { id: string; next_run_at: string }
}

export async function createScheduledPayout(input: CreateScheduledPayoutInput): Promise<ScheduledPayoutCreateResult> {
  const res = await http.post<ScheduledPayoutCreateResult>('/org/v1/scheduled-payouts', input)
  return res.data
}

export async function confirmScheduledPayout(otp: string): Promise<ScheduledPayoutCreateResult> {
  const res = await http.post<ScheduledPayoutCreateResult>('/org/v1/scheduled-payouts/confirm', { otp })
  return res.data
}

export async function pauseScheduledPayout(id: string): Promise<void> {
  await http.post(`/org/v1/scheduled-payouts/${id}/pause`)
}

export async function resumeScheduledPayout(id: string): Promise<void> {
  await http.post(`/org/v1/scheduled-payouts/${id}/resume`)
}

export async function cancelScheduledPayout(id: string): Promise<void> {
  await http.post(`/org/v1/scheduled-payouts/${id}/cancel`)
}


export interface Beneficiary {
  id: string
  organization_id: string
  created_by_org_member_id: string
  nickname: string
  recipient_name: string
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  phone_number: string | null
  bank_code: string | null
  bank_account_number: string | null
  is_active: boolean
  created_at: string
}

export interface CreateBeneficiaryInput {
  nickname: string
  recipient_name: string
  destination_type?: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  phone_number?: string
  bank_code?: string
  bank_account_number?: string
}

export async function fetchOrgBeneficiaries(): Promise<Beneficiary[]> {
  const res = await http.get<{ status: string; data: Beneficiary[] }>('/org/v1/beneficiaries')
  return res.data.data
}


export async function createOrgBeneficiary(input: CreateBeneficiaryInput): Promise<Beneficiary> {
  const res = await http.post<{ status: string; data: Beneficiary }>('/org/v1/beneficiaries', input)
  return res.data.data
}


export async function deleteOrgBeneficiary(id: string): Promise<void> {
  await http.delete(`/org/v1/beneficiaries/${id}`)
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


export async function fetchRecentSettlements(): Promise<RecentSettlement[]> {
  const res = await http.get<{ status: string; data: RecentSettlement[] }>('/org/v1/payouts/recent')
  return res.data.data
}


export interface OrgNotification {
  id: string
  created_at: string
  organization_id: string
  org_member_id: string
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
  const res = await http.get<{ status: string; data: OrgFraudBranchBreakdownRow[] }>('/org/v1/fraud/branch-breakdown')
  return res.data.data
}


// ---- Internal transfers (org <-> branch, branch <-> branch) ----

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


// ---- Statements ----

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


// ---- Branch comparative analytics ----

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


// ---- High-value payout approval ceiling (dual control) ----

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


// ---- Bulk / batch payouts ----

export interface BulkPayoutBatchItemInput {
  amount_cents: number
  destination_type: 'PHONE_NUMBER' | 'BANK_ACCOUNT'
  phone_number?: string
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

export async function createBulkPayoutBatch(input: CreateBulkPayoutBatchInput): Promise<BulkPayoutBatchCreateResult> {
  const res = await http.post<BulkPayoutBatchCreateResult>('/org/v1/bulk-payouts', input)
  return res.data
}

export async function confirmBulkPayoutBatch(otp: string): Promise<BulkPayoutBatchCreateResult> {
  const res = await http.post<BulkPayoutBatchCreateResult>('/org/v1/bulk-payouts/confirm', { otp })
  return res.data
}

export async function fetchBulkPayoutBatches(): Promise<BulkPayoutBatch[]> {
  const res = await http.get<{ status: string; data: BulkPayoutBatch[] }>('/org/v1/bulk-payouts')
  return res.data.data
}

export async function fetchBulkPayoutBatch(id: string): Promise<{ batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number }> {
  const res = await http.get<{ status: string; data: { batch: BulkPayoutBatch; items: BulkPayoutItem[]; escrow_balance_cents: number } }>(`/org/v1/bulk-payouts/${id}`)
  return res.data.data
}

// ---- Payment links (org + branch) ----

export interface OrgPaymentLink {
  id: string
  organization_id?: string
  branch_id?: string
  code: string
  amount_cents: number
  currency: string
  description: string
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  expires_at: string
  is_reusable: boolean
  allow_open_amount: boolean
  created_at: string
}

export interface CreatePaymentLinkInput {
  amount_cents: number
  currency?: string
  description?: string
  is_reusable?: boolean
  allow_open_amount?: boolean
  branch_id?: string
}

export interface PaymentLinkCreateResult {
  status: string
  message: string
  data: OrgPaymentLink
  url: string
}

export async function createOrgPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkCreateResult> {
  const res = await http.post<PaymentLinkCreateResult>('/org/v1/payment-links', input)
  return res.data
}

export async function createBranchPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkCreateResult> {
  const res = await http.post<PaymentLinkCreateResult>('/org/v1/branch/payment-links', input)
  return res.data
}

interface PaginatedPaymentLinksResponse {
  total_count: number
  page: number
  page_size: number
  total_pages: number
  payment_links: OrgPaymentLink[]
}

export async function fetchOrgPaymentLinks(): Promise<OrgPaymentLink[]> {
  const res = await http.get<PaginatedPaymentLinksResponse>('/org/v1/payment-links')
  return res.data.payment_links ?? []
}

export async function fetchBranchPaymentLinks(): Promise<OrgPaymentLink[]> {
  const res = await http.get<PaginatedPaymentLinksResponse>('/org/v1/branch/payment-links')
  return res.data.payment_links ?? []
}

export async function closeOrgPaymentLink(id: string): Promise<void> {
  await http.post(`/org/v1/payment-links/${id}/close`)
}

export async function closeBranchPaymentLink(id: string): Promise<void> {
  await http.post(`/org/v1/branch/payment-links/${id}/close`)
}

export async function fetchOrgPaymentLink(id: string): Promise<OrgPaymentLink> {
  const res = await http.get<{ status: string; data: OrgPaymentLink }>(`/org/v1/payment-links/${id}`)
  return res.data.data
}

export async function fetchBranchPaymentLink(id: string): Promise<OrgPaymentLink> {
  const res = await http.get<{ status: string; data: OrgPaymentLink }>(`/org/v1/branch/payment-links/${id}`)
  return res.data.data
}

export async function reclaimBulkPayoutResidual(id: string): Promise<{ reclaimed_cents: number }> {
  const res = await http.post<{ status: string; data: { reclaimed_cents: number } }>(`/org/v1/bulk-payouts/${id}/reclaim`)
  return res.data.data
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

// ---- Invoices (org + branch) ----

export interface OrgInvoiceItem {
  id: string
  item_name: string
  description?: string | null
  quantity: number
  unit_price_cents: number
  total_cents: number
  tax_category: string
}

export interface OrgInvoice {
  id: string
  organization_id?: string
  branch_id?: string
  invoice_number: string
  shareable_code: string
  currency: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  sub_total_cents: number
  tax_amount_cents: number
  total_cents: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED'
  due_date: string
  paid_at?: string | null
  payment_link_id?: string | null
  notes?: string | null
  items: OrgInvoiceItem[]
  created_at: string
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

// ---- Expenses (org + branch) ----

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

// Uploads directly to the R2 presigned URL — a different host than the API,
// so this deliberately bypasses the `http` axios instance (no auth header,
// no JSON content-type, no baseURL prefix).
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

// ---- Tags + spend breakdown (org + branch) ----

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

export async function assignTag(tagId: string, subjectType: 'payout' | 'expense', subjectId: string, isBranch = false): Promise<void> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  await http.post(`${base}/assign`, { tag_id: tagId, subject_type: subjectType, subject_id: subjectId })
}

export async function unassignTag(tagId: string, subjectType: 'payout' | 'expense', subjectId: string, isBranch = false): Promise<void> {
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

export async function fetchTagsForSubject(subjectType: 'payout' | 'expense', subjectId: string, isBranch = false): Promise<OrgTag[]> {
  const base = isBranch ? '/org/v1/branch/tags' : '/org/v1/tags'
  const res = await http.get<{ status: string; data: OrgTag[] }>(`${base}/for/${subjectType}/${subjectId}`)
  return res.data.data ?? []
}

// ---- Petty cash (org + branch) ----
// Money movement (create/fund/draw) is org-member-only, matching the
// Vault/Transfer convention — the owner or a member with
// CanInitiatePayments confirms every movement, even for a branch's own
// float (via branch_id). Branch sessions get read-only list + history.

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
  drawn_by_org_member_id: string
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
): Promise<PettyCashDraw> {
  const res = await http.post<{ status: string; data: PettyCashDraw }>(`/org/v1/petty-cash/${floatId}/draw`, input)
  return res.data.data
}

export async function fetchPettyCashHistory(floatId: string, isBranch = false): Promise<PettyCashDraw[]> {
  const base = isBranch ? '/org/v1/branch/petty-cash' : '/org/v1/petty-cash'
  const res = await http.get<{ status: string; data: PettyCashDraw[] }>(`${base}/${floatId}/history`)
  return res.data.data ?? []
}
