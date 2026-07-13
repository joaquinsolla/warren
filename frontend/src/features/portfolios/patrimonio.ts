import { convertToBase, type RateMap } from '@/lib/fx'
import type { Entity } from '@/features/entities/api'
import type { Holding } from '@/features/holdings/api'
import type { CashTransaction } from '@/features/cash/api'
import type { InvestmentTransaction } from '@/features/investments/api'

export type TimelinePoint = { t: number; value: number }

const EPS = 1e-9

/**
 * Reconstruye la evolución del patrimonio (a coste) en la moneda base a partir
 * del histórico. Replica la semántica de los triggers de la BBDD:
 *   - Efectivo por entidad: DEPOSIT/WITHDRAWAL/TRANSFER/ADJUSTMENT (destino
 *     recibe to_amount ?? amount; origen entrega amount) + compras/ventas.
 *   - Invertido por entidad: FIFO (coste incluye comisiones e impuestos), igual
 *     que recompute_holding.
 * La conversión a base usa los tipos de cambio ACTUALES (no hay histórico de fx):
 * es coherente con el resto de la app. Las divisas sin tipo se omiten (0).
 * El último punto coincide con el patrimonio total del resumen.
 */
export function buildPatrimonioTimeline(params: {
  entities: Entity[]
  cashTxs: CashTransaction[]
  invTxs: InvestmentTransaction[]
  base: string
  rateMap: RateMap
}): TimelinePoint[] {
  const { entities, cashTxs, invTxs, base, rateMap } = params
  const curOf = new Map(entities.map((e) => [e.id, e.currency]))

  const cash = new Map<string, number>()
  const invested = new Map<string, number>()
  const lots = new Map<string, { qty: number; unit: number }[]>()

  const add = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v)

  type Ev = { t: number; seq: number; apply: () => void }
  const events: Ev[] = []

  for (const tx of cashTxs) {
    events.push({
      t: new Date(tx.executed_at).getTime(),
      seq: new Date(tx.created_at).getTime(),
      apply: () => {
        if (tx.to_entity_id && curOf.has(tx.to_entity_id)) {
          add(cash, tx.to_entity_id, tx.to_amount ?? tx.amount)
        }
        if (tx.from_entity_id && curOf.has(tx.from_entity_id)) {
          add(cash, tx.from_entity_id, -tx.amount)
        }
      },
    })
  }

  for (const tx of invTxs) {
    events.push({
      t: new Date(tx.executed_at).getTime(),
      seq: new Date(tx.created_at).getTime(),
      apply: () => {
        if (!curOf.has(tx.entity_id)) return
        const key = `${tx.entity_id}::${tx.asset_id}`
        if (tx.transaction_type === 'BUY') {
          const cost = tx.gross_amount + tx.fees + tx.taxes
          add(cash, tx.entity_id, -cost)
          add(invested, tx.entity_id, cost)
          const arr = lots.get(key) ?? []
          arr.push({ qty: tx.quantity, unit: cost / tx.quantity })
          lots.set(key, arr)
        } else {
          const proceeds = tx.gross_amount - tx.fees - tx.taxes
          add(cash, tx.entity_id, proceeds)
          const arr = lots.get(key) ?? []
          let toConsume = tx.quantity
          let consumedCost = 0
          while (toConsume > EPS && arr.length > 0) {
            const lot = arr[0]
            const take = Math.min(lot.qty, toConsume)
            consumedCost += take * lot.unit
            lot.qty -= take
            toConsume -= take
            if (lot.qty <= EPS) arr.shift()
          }
          add(invested, tx.entity_id, -consumedCost)
        }
      },
    })
  }

  events.sort((a, b) => a.t - b.t || a.seq - b.seq)

  const total = () => {
    let sum = 0
    for (const [eid, cur] of curOf) {
      const c = convertToBase(cash.get(eid) ?? 0, cur, base, rateMap)
      const i = convertToBase(invested.get(eid) ?? 0, cur, base, rateMap)
      if (c !== null) sum += c
      if (i !== null) sum += i
    }
    return sum
  }

  const points: TimelinePoint[] = []
  for (const ev of events) {
    ev.apply()
    const value = total()
    const last = points[points.length - 1]
    // Colapsa eventos del mismo instante en un único punto (el estado final).
    if (last && last.t === ev.t) last.value = value
    else points.push({ t: ev.t, value })
  }
  return points
}

export type DonutSegment = {
  entityId: string
  entityName: string
  kind: 'cash' | 'invested'
  value: number
}

/**
 * Distribución actual del patrimonio en moneda base, por entidad y separando
 * efectivo (líquido) de inversiones (a coste). Solo segmentos con valor > 0.
 */
export function buildDistribution(params: {
  entities: Entity[]
  holdings: Holding[]
  base: string
  rateMap: RateMap
}): { segments: DonutSegment[]; total: number } {
  const { entities, holdings, base, rateMap } = params
  const curOf = new Map(entities.map((e) => [e.id, e.currency]))

  const investedByEntity = new Map<string, number>()
  for (const h of holdings) {
    const cur = curOf.get(h.entity_id)
    if (!cur) continue
    const v = convertToBase(h.invested_amount, cur, base, rateMap)
    if (v !== null) {
      investedByEntity.set(
        h.entity_id,
        (investedByEntity.get(h.entity_id) ?? 0) + v,
      )
    }
  }

  const segments: DonutSegment[] = []
  let total = 0
  for (const e of entities) {
    const cashBase = convertToBase(
      e.cash_balance_cache,
      e.currency,
      base,
      rateMap,
    )
    if (cashBase !== null && cashBase > EPS) {
      segments.push({
        entityId: e.id,
        entityName: e.name,
        kind: 'cash',
        value: cashBase,
      })
      total += cashBase
    }
    const inv = investedByEntity.get(e.id) ?? 0
    if (inv > EPS) {
      segments.push({
        entityId: e.id,
        entityName: e.name,
        kind: 'invested',
        value: inv,
      })
      total += inv
    }
  }
  return { segments, total }
}

export type RealizedPnL = {
  /** Coste FIFO de las participaciones vendidas (incluye comisiones e impuestos de compra). */
  costBasis: number
  /** Importe neto recibido en las ventas (gross - fees - taxes). */
  proceeds: number
  /** Resultado realizado: proceeds - costBasis. */
  pnl: number
  /** Rentabilidad sobre el coste (pnl / costBasis); null si no hay ventas. */
  returnPct: number | null
  /** Comisiones pagadas en las operaciones del periodo (compras y ventas). */
  fees: number
  /** Impuestos pagados en las operaciones del periodo (compras y ventas). */
  taxes: number
  hasSells: boolean
}

/**
 * Rentabilidad realizada de una entidad (bróker) a partir de su histórico de
 * inversiones. Al no existir fuente de precios en vivo, es la única medida
 * objetiva de ganancia/pérdida: compara lo recibido al vender contra el coste
 * FIFO de esas mismas participaciones. Las posiciones aún abiertas quedan a
 * coste (resultado 0) hasta que exista cotización.
 *
 * Si se pasa `since`, solo se contabilizan las ventas ejecutadas a partir de
 * ese instante, pero los lotes FIFO se construyen con TODO el histórico previo
 * (una venta del periodo puede consumir compras anteriores a la ventana).
 *
 * Asume una única moneda (la de la entidad): las operaciones se registran en la
 * moneda del bróker.
 */
export function buildRealizedPnL(
  invTxs: InvestmentTransaction[],
  since?: number,
): RealizedPnL {
  const sorted = [...invTxs].sort(
    (a, b) =>
      new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime() ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const lots = new Map<string, { qty: number; unit: number }[]>()
  let costBasis = 0
  let proceeds = 0
  let fees = 0
  let taxes = 0
  let hasSells = false

  for (const tx of sorted) {
    const inWindow =
      since === undefined || new Date(tx.executed_at).getTime() >= since
    if (inWindow) {
      fees += tx.fees
      taxes += tx.taxes
    }
    if (tx.transaction_type === 'BUY') {
      const cost = tx.gross_amount + tx.fees + tx.taxes
      const arr = lots.get(tx.asset_id) ?? []
      arr.push({ qty: tx.quantity, unit: cost / tx.quantity })
      lots.set(tx.asset_id, arr)
    } else {
      const arr = lots.get(tx.asset_id) ?? []
      let toConsume = tx.quantity
      let consumedCost = 0
      while (toConsume > EPS && arr.length > 0) {
        const lot = arr[0]
        const take = Math.min(lot.qty, toConsume)
        consumedCost += take * lot.unit
        lot.qty -= take
        toConsume -= take
        if (lot.qty <= EPS) arr.shift()
      }
      if (inWindow) {
        hasSells = true
        proceeds += tx.gross_amount - tx.fees - tx.taxes
        costBasis += consumedCost
      }
    }
  }

  const pnl = proceeds - costBasis
  return {
    costBasis,
    proceeds,
    pnl,
    returnPct: costBasis > EPS ? pnl / costBasis : null,
    fees,
    taxes,
    hasSells,
  }
}
