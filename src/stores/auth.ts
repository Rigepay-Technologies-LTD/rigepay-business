import { defineStore } from 'pinia'
import { session, type SessionMeta } from '@/lib/session'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: session.getToken(),
    meta: session.getMeta() as SessionMeta | null,
    expiresAt: session.getExpiresAt(),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setSession(token: string, meta: SessionMeta, refreshToken?: string, expiresInSeconds?: number) {
      session.setToken(token)
      session.setMeta(meta)
      this.token = token
      this.meta = meta
      if (refreshToken) {
        session.setRefreshToken(refreshToken)
      }
      if (expiresInSeconds) {
        const expiresAt = Date.now() + expiresInSeconds * 1000
        session.setExpiresAt(expiresAt)
        this.expiresAt = expiresAt
      }
    },
    logout() {
      session.clear()
      this.token = null
      this.meta = null
      this.expiresAt = null
    },
  },
})
