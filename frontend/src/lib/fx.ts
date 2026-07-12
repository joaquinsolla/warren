import type { FxRate } from '@/features/fx/api'

export type RateMap = Map<string, number>

/** Mapa divisa -> tipo hacia la moneda base. */
export function buildRateMap(rates: FxRate[]): RateMap {
  return new Map(rates.map((r) => [r.currency, r.rate_to_base]))
}

/**
 * Convierte un importe a la moneda base.
 * Devuelve null si falta el tipo de cambio para esa divisa.
 */
export function convertToBase(
  amount: number,
  currency: string,
  base: string,
  rates: RateMap,
): number | null {
  if (currency === base) return amount
  const rate = rates.get(currency)
  if (rate === undefined) return null
  return amount * rate
}

export type SumToBaseResult = {
  total: number
  missing: string[]
}

/** Suma una lista de importes a la moneda base, reportando divisas sin tipo. */
export function sumToBase(
  items: { amount: number; currency: string }[],
  base: string,
  rates: RateMap,
): SumToBaseResult {
  let total = 0
  const missing = new Set<string>()
  for (const { amount, currency } of items) {
    const converted = convertToBase(amount, currency, base, rates)
    if (converted === null) missing.add(currency)
    else total += converted
  }
  return { total, missing: [...missing] }
}

/**
 * Convierte un importe de una divisa a otra pasando por la base.
 * Devuelve null si falta algún tipo necesario.
 */
export function convertBetween(
  amount: number,
  from: string,
  to: string,
  base: string,
  rates: RateMap,
): number | null {
  if (from === to) return amount
  const inBase = convertToBase(amount, from, base, rates)
  if (inBase === null) return null
  if (to === base) return inBase
  const rateTo = rates.get(to)
  if (rateTo === undefined) return null
  return inBase / rateTo
}
