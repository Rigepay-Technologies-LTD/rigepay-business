import { useAuthStore } from '@/stores/auth'

export interface DashboardTokenData {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  organization_id: string
  branch_id: string | null
  role: string
  member_type: 'org_member' | 'branch_member'
  backup_codes?: string[]
}


export function applyDashboardToken(data: DashboardTokenData) {
  const auth = useAuthStore()
  auth.setSession(
    data.access_token,
    {
      organizationId: data.organization_id,
      branchId: data.branch_id,
      role: data.role,
      memberType: data.member_type,
    },
    data.refresh_token,
    data.expires_in,
  )
}
