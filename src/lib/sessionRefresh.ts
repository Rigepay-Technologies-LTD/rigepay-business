import axios from 'axios'
import { session } from './session'
import { API_BASE_URL } from './http'
import { applyDashboardToken, type DashboardTokenData } from './dashboardToken'


let inFlight: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const res = await axios.post<{ status: string; data: DashboardTokenData }>(
        `${API_BASE_URL}/org/v1/auth/refresh`,
        {},
        { withCredentials: true },
      )

      const meta = session.getMeta()
      if (!meta) return false
      applyDashboardToken({
        ...res.data.data,
        organization_id: meta.organizationId,
        branch_id: meta.branchId,
        role: meta.role,
        member_type: meta.memberType,
      })
      return true
    } catch {
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
