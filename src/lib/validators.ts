export type Rule<T = unknown> = (value: T, form?: Record<string, unknown>) => string | null

const trimStr = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

export const required =
  (label = 'This field'): Rule =>
  (v) =>
    trimStr(v).length > 0 ? null : `${label} is required.`

export const minLen =
  (n: number, label = 'This field'): Rule =>
  (v) =>
    trimStr(v).length >= n ? null : `${label} must be at least ${n} characters.`

export const maxLen =
  (n: number, label = 'This field'): Rule =>
  (v) =>
    trimStr(v).length <= n ? null : `${label} must be ${n} characters or fewer.`

export const email: Rule = (v) => {
  const s = trimStr(v)
  if (!s) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? null : 'Enter a valid email address.'
}

export const kenyanPhone: Rule = (v) => {
  const s = trimStr(v).replace(/[\s-]/g, '')
  if (!s) return null
  return /^(?:\+?254|0)(?:7|1)\d{8}$/.test(s) ? null : 'Enter a valid Kenyan phone number.'
}

export function normalizeKenyanPhone(v: string): string {
  const s = trimStr(v).replace(/[\s-]/g, '')
  if (/^\+254(7|1)\d{8}$/.test(s)) return s
  if (/^254(7|1)\d{8}$/.test(s)) return `+${s}`
  if (/^0(7|1)\d{8}$/.test(s)) return `+254${s.slice(1)}`
  return s
}

export const kraPin: Rule = (v) => {
  const s = trimStr(v).toUpperCase()
  if (!s) return null
  return /^[AP]\d{9}[A-Z]$/.test(s) ? null : 'Enter a valid KRA PIN (e.g. A012345678Z).'
}

export const url: Rule = (v) => {
  const s = trimStr(v)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? null : 'Enter a valid http(s) URL.'
  } catch {
    return 'Enter a valid URL.'
  }
}

interface AmountOpts {
  min?: number 
  max?: number 
  label?: string
}
export const amountKes =
  (opts: AmountOpts = {}): Rule =>
  (v) => {
    const { min = 0, max, label = 'Amount' } = opts
    const s = trimStr(v)
    if (!s) return null
    const n = Number(s)
    if (!Number.isFinite(n)) return `${label} must be a number.`
    if (n <= 0) return `${label} must be greater than zero.`
    if (Math.round(n * 100) !== n * 100 && !/^\d+(\.\d{1,2})?$/.test(s)) {
      return `${label} can have at most two decimal places.`
    }
    if (min && n < min) return `${label} must be at least KES ${min.toLocaleString()}.`
    if (max && n > max) return `${label} cannot exceed KES ${max.toLocaleString()}.`
    return null
  }

export const positiveInt =
  (label = 'This field'): Rule =>
  (v) => {
    const s = trimStr(v)
    if (!s) return null
    return /^\d+$/.test(s) && Number(s) > 0 ? null : `${label} must be a whole number greater than zero.`
  }


const MARKUP_RE = /<\s*script|<\s*iframe|javascript:|on\w+\s*=|data:text\/html/i

export const noMarkup: Rule = (v) => {
  const s = trimStr(v)
  if (!s) return null
  return MARKUP_RE.test(s) ? 'This text contains characters that are not allowed.' : null
}

export const maxUrls =
  (n = 1): Rule =>
  (v) => {
    const s = trimStr(v)
    if (!s) return null
    const count = (s.match(/https?:\/\//gi) || []).length
    return count <= n ? null : `Please keep links to ${n === 0 ? 'none' : n} or fewer.`
  }

export const notRepeatedChars: Rule = (v) => {
  const s = trimStr(v)
  if (!s) return null
  return /(.)\1{9,}/.test(s) ? 'This text looks like spam. Please rephrase it.' : null
}

export const freeText = (label = 'This field', max = 500): Rule[] => [
  maxLen(max, label),
  noMarkup,
  maxUrls(1),
  notRepeatedChars,
]

export function firstError<T>(value: T, rules: Rule<T>[], form?: Record<string, unknown>): string | null {
  for (const rule of rules) {
    const err = rule(value, form)
    if (err) return err
  }
  return null
}
