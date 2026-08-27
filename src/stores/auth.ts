import { defineStore } from 'pinia'
import { session, type SessionMeta } from '@/lib/session'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    meta: session.getMeta() as SessionMeta | null,
    expiresAt: session.getExpiresAt(),
  }),
  getters: {
    isAuthenticated: (state) => !!state.meta,
  },
  actions: {
    setSession(meta: SessionMeta, expiresInSeconds?: number) {
      session.setMeta(meta)
      this.meta = meta
      if (expiresInSeconds) {
        const expiresAt = Date.now() + expiresInSeconds * 1000
        session.setExpiresAt(expiresAt)
        this.expiresAt = expiresAt
      }
    },
    // Boot-time session check: cookies are httpOnly, so JS can't read/decode
    // a token to determine auth state. Calls the org- or branch-scoped
    // whoami endpoint (picked from persisted, non-secret meta) to confirm
    // the session cookie is still valid and refresh the expiry countdown.
    async hydrate(): Promise<void> {
      const meta = session.getMeta()
      if (!meta) return
      try {
        const { http } = await import('@/lib/http')
        const path = meta.memberType === 'branch_member' ? '/org/v1/branch/whoami' : '/org/v1/auth/whoami'
        const res = await http.get(path)
        const expiresIn = res.data?.data?.expires_in
        if (expiresIn) {
          const expiresAt = Date.now() + expiresIn * 1000
          session.setExpiresAt(expiresAt)
          this.expiresAt = expiresAt
        }
      } catch {
        this.logout()
      }
    },
    logout() {
      // Clear local state synchronously first — callers navigate away
      // (e.g. router.push to the login route) immediately after calling
      // this without awaiting, and the router guard reads isAuthenticated
      // synchronously. The backend logout call (revoking the refresh
      // token, clearing cookies) is best-effort and fires in the
      // background; it must never block or gate the client-side logout.
      session.clear()
      this.meta = null
      this.expiresAt = null

      import('@/lib/http').then(({ http }) => {
        http.post('/org/v1/auth/logout').catch(() => {})
      })
    },
  },
})
