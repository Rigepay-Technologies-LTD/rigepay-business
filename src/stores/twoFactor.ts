import { defineStore } from 'pinia'


export const useTwoFactorStore = defineStore('twoFactor', {
  state: () => ({
    setupToken: null as string | null,
    methods: [] as string[],
    redirectPath: null as string | null,
  }),
  actions: {
    setChallenge(setupToken: string, methods: string[]) {
      this.setupToken = setupToken
      this.methods = methods
    },
    setEnrollment(setupToken: string) {
      this.setupToken = setupToken
      this.methods = []
    },
    setRedirect(path: string | null) {
      this.redirectPath = path && /^\/(?!\/)/.test(path) ? path : null
    },
    clear() {
      this.setupToken = null
      this.methods = []
      this.redirectPath = null
    },
  },
})
