import { defineStore } from 'pinia'


export const useTwoFactorStore = defineStore('twoFactor', {
  state: () => ({
    setupToken: null as string | null,
    methods: [] as string[],
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
    clear() {
      this.setupToken = null
      this.methods = []
    },
  },
})
