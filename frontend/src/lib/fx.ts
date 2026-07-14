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

// ---------------------------------------------------------------------------
// Tipos de cambio históricos (datados)
// ---------------------------------------------------------------------------

/** Un punto histórico: `rate` vigente a partir de `effective` (ms epoch). */
export type RatePoint = { effective: number; rate: number }

/** Por divisa, sus puntos de tipo de cambio ordenados por fecha ascendente. */
export type DatedRateMap = Map<string, RatePoint[]>

/**
 * Construye el mapa datado combinando los puntos históricos con el tipo actual.
 * El tipo actual se añade como un punto vigente desde su `updated_at` (cuando se
 * fijó), de modo que aplica desde su fecha en adelante y sirve de respaldo si no
 * hay histórico. Si falta `updated_at`, se usa `now`.
 */
export function buildDatedRateMap(
  currentRates: {
    currency: string
    rate_to_base: number
    updated_at?: string
  }[],
  history: { currency: string; rate_to_base: number; effective_date: string }[],
  now: number = Date.now(),
): DatedRateMap {
  const map: DatedRateMap = new Map()
  for (const h of history) {
    const arr = map.get(h.currency) ?? []
    arr.push({
      effective: new Date(`${h.effective_date}T00:00:00`).getTime(),
      rate: h.rate_to_base,
    })
    map.set(h.currency, arr)
  }
  for (const c of currentRates) {
    const arr = map.get(c.currency) ?? []
    const effective = c.updated_at ? new Date(c.updated_at).getTime() : now
    arr.push({ effective, rate: c.rate_to_base })
    map.set(c.currency, arr)
  }
  for (const arr of map.values()) arr.sort((a, b) => a.effective - b.effective)
  return map
}

/**
 * Tipo hacia la base de una divisa vigente en el instante `at` (ms epoch).
 * Elige el punto con mayor `effective` <= `at`; si `at` es anterior a todos,
 * usa el más antiguo. Devuelve undefined si no hay ningún punto.
 */
export function rateAt(
  dated: DatedRateMap,
  currency: string,
  at: number,
): number | null {
  const arr = dated.get(currency)
  if (!arr || arr.length === 0) return null
  let chosen = arr[0]
  for (const p of arr) {
    if (p.effective <= at) chosen = p
    else break
  }
  return chosen.rate
}

/**
 * Convierte un importe a la moneda base usando el tipo vigente en `at`.
 * Devuelve null si falta el tipo para esa divisa.
 */
export function convertToBaseAt(
  amount: number,
  currency: string,
  base: string,
  at: number,
  dated: DatedRateMap,
): number | null {
  if (currency === base) return amount
  const rate = rateAt(dated, currency, at)
  if (rate === null) return null
  return amount * rate
}
