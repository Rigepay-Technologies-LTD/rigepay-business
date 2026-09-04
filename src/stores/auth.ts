import { defineStore } from 'pinia'
import { session, type SessionMeta } from '@/lib/session'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    meta: session.getMeta() as SessionMeta | null,
    expiresAt: session.getExpiresAt(),
    permissions: session.getPermissions() as string[],
    permissionsLoaded: false,
    onboardingComplete: session.getOnboardingComplete() as boolean | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.meta,
    isOwner: (state) => state.meta?.role === 'owner',
    // can(key) — nav / route gate. Owner passes everything; a `.view`
    // requirement is also satisfied by the matching `.manage` grant, mirroring
    // the backend authz.Satisfies contract.
    can: (state) => (key?: string): boolean => {
      if (!key) return true
      if (state.meta?.role === 'owner') return true
      if (state.permissions.includes(key)) return true
      if (key.endsWith('.view')) {
        return state.permissions.includes(key.slice(0, -5) + '.manage')
      }
      return false
    },
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
      this.onboardingComplete = null
      void this.loadPermissions()
      void this.ensureOnboarding()
    },

    async loadPermissions(): Promise<void> {
      if (!this.meta) return
      // Branch-member sessions have no org RBAC profile.
      if (this.meta.memberType !== 'org_member') {
        this.permissions = []
        this.permissionsLoaded = true
        session.setPermissions([])
        return
      }
      try {
        const { fetchMyRBAC } = await import('@/lib/orgApi')
        const me = await fetchMyRBAC()
        this.permissions = Array.isArray(me.permissions) ? me.permissions : []
        session.setPermissions(this.permissions)
        this.permissionsLoaded = true
      } catch {
        // keep whatever is cached; an owner still passes every can() check
        this.permissionsLoaded = true
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
        this.applyOrgStatus(res.data?.data?.organization_status)
        void this.loadPermissions()
      } catch {
        this.logout()
      }
    },

    applyOrgStatus(status?: string | null) {
      // Branch members belong to an already-approved org — never gated.
      if (!this.meta || this.meta.memberType !== 'org_member') {
        this.setOnboardingComplete(true)
        return
      }
      if (status && status !== 'pending_kyb') {
        this.setOnboardingComplete(true)
      }
      // pending_kyb (or unknown) stays inconclusive until ensureOnboarding()
      // checks whether the core documents have actually been uploaded.
    },

    setOnboardingComplete(v: boolean) {
      this.onboardingComplete = v
      session.setOnboardingComplete(v)
    },

    // Resolves whether the org has cleared the "upload your compliance documents"
    // gate. Approved/rejected/suspended orgs pass; a pending_kyb org passes once
    // its core KYB documents are on file.
    async ensureOnboarding(): Promise<boolean> {
      if (!this.meta || this.meta.memberType !== 'org_member') {
        this.setOnboardingComplete(true)
        return true
      }
      if (this.onboardingComplete === true) return true
      try {
        const { fetchOrgDocuments } = await import('@/lib/orgApi')
        const docs = await fetchOrgDocuments()
        const have = new Set((docs ?? []).map((d) => d.doc_type))
        const CORE = ['brs_certificate', 'kra_cert', 'business_permit']
        const complete = CORE.every((t) => have.has(t))
        this.setOnboardingComplete(complete)
        return complete
      } catch {
        // Fail open — a transient docs API error must not strand the user.
        return this.onboardingComplete !== false
      }
    },
    logout() {
      session.clear()
      this.meta = null
      this.expiresAt = null
      this.permissions = []
      this.permissionsLoaded = false
      this.onboardingComplete = null

      import('@/lib/http').then(({ http }) => {
        http.post('/org/v1/auth/logout').catch(() => {})
      })
    },
  },
})
