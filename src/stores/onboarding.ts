import { defineStore } from 'pinia'



const STORAGE_KEY = 'rigepay_business_onboarding'

interface OnboardingState {
  email: string
  onboardingToken: string | null
  userId: string | null
}

function load(): OnboardingState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { email: '', onboardingToken: null, userId: null }
  try {
    return JSON.parse(raw) as OnboardingState
  } catch {
    return { email: '', onboardingToken: null, userId: null }
  }
}

function persist(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useOnboardingStore = defineStore('onboarding', {
  state: (): OnboardingState => load(),
  actions: {
    setEmail(email: string) {
      this.email = email
      persist(this.$state)
    },
    setToken(onboardingToken: string, userId: string) {
      this.onboardingToken = onboardingToken
      this.userId = userId
      persist(this.$state)
    },
    reset() {
      this.email = ''
      this.onboardingToken = null
      this.userId = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})
