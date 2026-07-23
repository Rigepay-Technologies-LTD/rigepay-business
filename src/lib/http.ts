import axios, { type InternalAxiosRequestConfig } from 'axios'
import { session } from './session'


export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

function attachDashboardToken(config: InternalAxiosRequestConfig) {
  const token = session.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})
http.interceptors.request.use(attachDashboardToken)


http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried && session.getRefreshToken()) {
      original._retried = true
      const { refreshSession } = await import('./sessionRefresh')
      const refreshed = await refreshSession()
      if (refreshed) {
        original.headers.Authorization = `Bearer ${session.getToken()}`
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
  })
}
