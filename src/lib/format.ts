export function formatMoney(cents: number | undefined | null): string {
  return ((cents ?? 0) / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}


export function riskTier(score: number): { label: string; variant: 'error' | 'warning' | 'success' | 'neutral' } {
  if (score >= 70) return { label: 'High risk', variant: 'error' }
  if (score >= 50) return { label: 'Medium risk', variant: 'warning' }
  if (score > 0) return { label: 'Low risk', variant: 'success' }
  return { label: 'Not yet scored', variant: 'neutral' }
}
