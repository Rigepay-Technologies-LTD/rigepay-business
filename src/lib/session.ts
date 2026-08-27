const EXPIRES_AT_KEY = 'rigepay_business_expires_at'
const SESSION_META_KEY = 'rigepay_business_session_meta'

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
  clear() {
    sessionStorage.removeItem(EXPIRES_AT_KEY)
    sessionStorage.removeItem(SESSION_META_KEY)
  },
}
