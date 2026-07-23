import type { SessionMeta } from './session'

export interface ResolvedLanding {
  name: 'org-dashboard' | 'branch-dashboard'
  params: Record<string, string>
}


export function resolveLandingRoute(meta: SessionMeta): ResolvedLanding {
  if (meta.memberType === 'branch_member') {
    if (!meta.branchId) {
      throw new Error('branch_member session is missing branch_id')
    }
    return { name: 'branch-dashboard', params: { orgId: meta.organizationId, branchId: meta.branchId } }
  }
  return { name: 'org-dashboard', params: { orgId: meta.organizationId } }
}
