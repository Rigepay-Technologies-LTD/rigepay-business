// Single source of truth for invoice money maths on the client. Mirrors
// rigepay-api/internal/invoicing/tax.go exactly — keep the two in lockstep so
// the previewed total always equals what the backend saves and bills.

export const STANDARD_VAT_RATE_BPS = 1600 // Kenya standard rate, 16%

/** VAT rate (basis points) for a KRA tax category. Only "A" is taxable. */
export function vatCategoryRateBps(category: string | undefined | null): number {
  return category === 'A' || category === 'STANDARD' ? STANDARD_VAT_RATE_BPS : 0
}

/** quantity * unit price, rounded to the nearest cent. */
export function lineSubtotal(quantity: number, unitPriceCents: number): number {
  if (!(quantity > 0) || !(unitPriceCents > 0)) return 0
  return Math.round(quantity * unitPriceCents)
}

/** unit price * (quantityMilli / 1000), rounded to the nearest cent. */
export function lineSubtotalMilli(quantityMilli: number, unitPriceCents: number): number {
  if (!(quantityMilli > 0) || !(unitPriceCents > 0)) return 0
  return Math.round((unitPriceCents * quantityMilli) / 1000)
}

/** VAT to ADD to a VAT-exclusive base. */
export function vatExclusive(baseCents: number, rateBps: number): number {
  if (!(baseCents > 0) || !(rateBps > 0)) return 0
  return Math.round((baseCents * rateBps) / 10000)
}

/** VAT already contained inside a VAT-inclusive gross amount. */
export function vatInclusive(grossCents: number, rateBps: number): number {
  if (!(grossCents > 0) || !(rateBps > 0)) return 0
  return Math.round((grossCents * rateBps) / (10000 + rateBps))
}

export function vatByCategory(baseCents: number, category: string | undefined | null): number {
  return vatExclusive(baseCents, vatCategoryRateBps(category))
}

export function inclusiveVatByCategory(grossCents: number, category: string | undefined | null): number {
  return vatInclusive(grossCents, vatCategoryRateBps(category))
}

/**
 * VAT for a supplier-style line: an explicit rate in basis points on the
 * post-discount subtotal wins; otherwise an explicit tax amount is honoured.
 */
export function lineTaxFromBps(
  subtotalCents: number,
  discountCents: number,
  rateBps: number,
  explicitTaxCents = 0,
): number {
  if (rateBps > 0) return vatExclusive(Math.max(subtotalCents - discountCents, 0), rateBps)
  return explicitTaxCents > 0 ? explicitTaxCents : 0
}
