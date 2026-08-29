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
      session.clear()
      this.meta = null
      this.expiresAt = null

      import('@/lib/http').then(({ http }) => {
        http.post('/org/v1/auth/logout').catch(() => {})
      })
    },
  },
})
