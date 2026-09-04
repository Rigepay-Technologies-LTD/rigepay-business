const EXPIRES_AT_KEY = 'rigepay_business_expires_at'
const SESSION_META_KEY = 'rigepay_business_session_meta'
const PERMISSIONS_KEY = 'rigepay_business_permissions'
const ONBOARDING_KEY = 'rigepay_business_onboarding'

export interface SessionMeta {
  organizationId: string
  branchId: string | null
  role: string
  memberType: 'org_member' | 'branch_member'
}


export const session = {
  getExpiresAt(): number | null {
    const raw = sessionStorage.getItem(EXPIRES_AT_KEY)
    return raw ? Number(raw) : null
  },
  setExpiresAt(epochMs: number) {
    sessionStorage.setItem(EXPIRES_AT_KEY, String(epochMs))
  },
  getMeta(): SessionMeta | null {
    const raw = sessionStorage.getItem(SESSION_META_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SessionMeta
    } catch {
      return null
    }
  },
  setMeta(meta: SessionMeta) {
    sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta))
  },
  getPermissions(): string[] {
    const raw = sessionStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return []
    try {
      const v = JSON.parse(raw)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  },
  setPermissions(perms: string[]) {
    sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms))
  },
  getOnboardingComplete(): boolean | null {
    const raw = sessionStorage.getItem(ONBOARDING_KEY)
    if (raw === null) return null
    return raw === '1'
  },
  setOnboardingComplete(v: boolean) {
    sessionStorage.setItem(ONBOARDING_KEY, v ? '1' : '0')
  },
  clear() {
    sessionStorage.removeItem(EXPIRES_AT_KEY)
    sessionStorage.removeItem(SESSION_META_KEY)
    sessionStorage.removeItem(PERMISSIONS_KEY)
    sessionStorage.removeItem(ONBOARDING_KEY)
  },
}
