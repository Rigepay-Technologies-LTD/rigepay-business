import { isAxiosError } from 'axios'

interface ApiErrorBody {
  status?: string
  message?: string
  code?: string
  details?: unknown
}


export function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return 'Could not reach the server. Check your connection and try again.'
    }
    const body = err.response.data as ApiErrorBody | undefined
    if (body?.message) return body.message
    if (err.response.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    return `Something went wrong (${err.response.status}). Please try again.`
  }
  return 'An unexpected error occurred. Please try again.'
}

export function extractErrorCode(err: unknown): string | undefined {
  if (isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined
    return body?.code
  }
  return undefined
}
