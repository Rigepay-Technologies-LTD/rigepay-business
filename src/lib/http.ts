import axios, { type InternalAxiosRequestConfig } from 'axios'
import { session } from './session'


export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] !== undefined ? decodeURIComponent(match[1]) : null
}

function attachDashboardToken(config: InternalAxiosRequestConfig) {
  const method = (config.method || 'get').toLowerCase()
  if (method !== 'get') {
    const csrfToken = getCookie('rp_biz_csrf')
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken
  }

  const meta = session.getMeta()
  if (meta?.memberType === 'org_member' && config.url?.includes('/org/v1/branch/')) {
    const branchId = window.location.pathname.match(/\/org\/[^/]+\/branch\/([^/]+)/)?.[1]
    if (branchId) {
      config.headers['X-Branch-Id'] = branchId
    }
  }

  return config
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
http.interceptors.request.use(attachDashboardToken)


http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      const { refreshSession } = await import('./sessionRefresh')
      const refreshed = await refreshSession()
      if (refreshed) {
        return http(original)
      }
    }
    return Promise.reject(error)
  },
)


export function onboardingHttp(onboardingToken: string) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${onboardingToken}`,
    },
  })
}


export function setupTokenHttp(setupToken: string) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-Setup-Token': setupToken,
    },
    withCredentials: true,
  })
}
