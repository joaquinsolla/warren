import {
  buildDistribution,
  buildPatrimonioTimeline,
  buildRealizedByYear,
  buildRealizedPnL,
  type RealizedPnL,
  type TimelinePoint,
} from '@/features/portfolios/patrimonio'
import {
  buildDatedRateMap,
  buildRateMap,
  convertToBase,
  sumToBase,
} from '@/lib/fx'
import {
  DEFAULT_TAX_REGIME,
  TAX_REGIMES,
  estimateCapitalGainsTax,
} from '@/config/tax'
import { ASSET_TYPE_LABELS } from '@/features/assets/labels'
import { groupByAssetType } from '@/features/assets/grouping'
import { isObjectiveMet } from '@/features/objectives/status'
import type { Entity } from '@/features/entities/api'
import type { Asset } from '@/features/assets/api'
import type { Holding } from '@/features/holdings/api'
import type { CashTransaction } from '@/features/cash/api'
import type { InvestmentTransaction } from '@/features/investments/api'
import type { FxRate } from '@/features/fx/api'
import type { InvestmentObjective } from '@/features/objectives/api'

/** Datos crudos ya cargados en la app que alimentan cualquier informe. */
export type ReportSource = {
  entities: Entity[]
  holdings: Holding[]
  assets: Asset[]
  cashTxs: CashTransaction[]
  invTxs: InvestmentTransaction[]
  rates: FxRate[]
  fxHistory: {
    currency: string
    rate_to_base: number
    effective_date: string
  }[]
  objectives: InvestmentObjective[]
  base: string
  taxRegime: string
}

export type PositionRow = {
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  cost: number
  value: number
  pnl: number | null
  pct: number | null
  hasPrice: boolean
}

export type PositionGroup = {
  label: string
  rows: PositionRow[]
}

export type TaxYearRow = {
  label: string
  netGain: number
  tax: number
  effRate: number | null
}

export type TaxTotals = {
  netGain: number
  tax: number
  effRate: number | null
}

export type ObjectiveRow = {
  symbol: string
  entity: string | null
  currency: string
  targetPrice: number | null
  targetDate: string | null
  met: boolean
}

export type EntityReportData = {
  kind: 'entity'
  generatedAt: number
  regimeLabel: string
  entity: {
    name: string
    typeLabel: string
    currency: string
    color: string | null
    iconDomain: string | null
    deleted: boolean
  }
  balance: {
    cash: number
    investedCost: number
    estimatedInv: number
    latentPnl: number
    latentPct: number | null
    total: number
    hasPrices: boolean
  }
  positionGroups: PositionGroup[]
  realized: RealizedPnL | null
  taxYears: TaxYearRow[]
  taxTotals: TaxTotals | null
  latent: {
    positions: { symbol: string; latent: number }[]
    total: number
    tax: number
    effRate: number | null
    net: number
  } | null
  objectives: ObjectiveRow[]
  timeline: TimelinePoint[]
}

export type EntitySummaryRow = {
  name: string
  typeLabel: string
  cash: number
  invested: number
  pnl: number | null
  total: number
}

export type GlobalReportData = {
  kind: 'global'
  generatedAt: number
  title: string
  description: string | null
  base: string
  regimeLabel: string
  totals: {
    cash: number
    invested: number
    total: number
    investedCost: number
    latentPnl: number
    latentPct: number | null
  }
  missing: string[]
  distribution: { label: string; value: number; pct: number }[]
  byType: { label: string; value: number; pct: number }[]
  entityRows: EntitySummaryRow[]
  realized: { pnl: number; costBasis: number; proceeds: number } | null
  taxYears: TaxYearRow[]
  taxTotals: TaxTotals | null
  latentTaxTotal: number
  objectives: ObjectiveRow[]
  timeline: TimelinePoint[]
}

const EPS = 1e-9

function regimeLabelOf(regime: string): string {
  return (TAX_REGIMES[regime] ?? TAX_REGIMES[DEFAULT_TAX_REGIME]).label
}

function entityTypeLabel(type: Entity['type']): string {
  return type === 'BANK' ? 'Banco' : 'Bróker'
}

/** Filas de impuestos por año natural (FIFO) + totales, según el régimen. */
function buildTaxYears(
  invTxs: InvestmentTransaction[],
  regime: string,
): { rows: TaxYearRow[]; totals: TaxTotals } {
  const years = buildRealizedByYear(invTxs, 1)
  const rows: TaxYearRow[] = years.map((y) => {
    const tax = estimateCapitalGainsTax(y.netGain, { regime })
    return {
      label: y.label,
      netGain: y.netGain,
      tax,
      effRate: y.netGain > 0 ? tax / y.netGain : null,
    }
  })
  const netGain = rows.reduce((s, r) => s + r.netGain, 0)
  const tax = rows.reduce((s, r) => s + r.tax, 0)
  const taxedGain = rows.reduce(
    (s, r) => s + (r.netGain > 0 ? r.netGain : 0),
    0,
  )
  return {
    rows,
    totals: { netGain, tax, effRate: taxedGain > 0 ? tax / taxedGain : null },
  }
}

function objectiveRows(
  objectives: InvestmentObjective[],
  assetMap: Map<string, Asset>,
  entityMap: Map<string, Entity>,
  priceOf: (assetId: string) => number | null,
): ObjectiveRow[] {
  return objectives.flatMap((o) => {
    const a = assetMap.get(o.asset_id)
    if (!a) return []
    return [
      {
        symbol: a.symbol,
        entity: o.entity_id ? (entityMap.get(o.entity_id)?.name ?? null) : null,
        currency: a.currency,
        targetPrice: o.target_price,
        targetDate: o.target_date,
        met: isObjectiveMet(o, priceOf(o.asset_id)),
      },
    ]
  })
}

/** Informe de una entidad concreta (en su moneda nativa). */
export function buildEntityReportData(
  source: ReportSource,
  entityId: string,
): EntityReportData | null {
  const entity = source.entities.find((e) => e.id === entityId)
  if (!entity) return null

  const assetMap = new Map(source.assets.map((a) => [a.id, a]))
  const entityMap = new Map(source.entities.map((e) => [e.id, e]))
  const isBroker = entity.type === 'BROKER'

  const holdings = isBroker
    ? source.holdings.filter((h) => h.entity_id === entityId)
    : []
  const invTxs = isBroker
    ? source.invTxs.filter((t) => t.entity_id === entityId)
    : []
  const entityCash = source.cashTxs.filter(
    (t) => t.from_entity_id === entityId || t.to_entity_id === entityId,
  )

  const priceOf = (assetId: string) =>
    assetMap.get(assetId)?.manual_price ?? null

  const investedCost = holdings.reduce((s, h) => s + h.invested_amount, 0)
  const estimatedInv = holdings.reduce((s, h) => {
    const p = priceOf(h.asset_id)
    return s + (p != null ? h.quantity * p : h.invested_amount)
  }, 0)
  const hasPrices = holdings.some((h) => priceOf(h.asset_id) != null)
  const latentPnl = estimatedInv - investedCost
  const latentPct = investedCost > EPS ? (latentPnl / investedCost) * 100 : null

  const groups = groupByAssetType(
    holdings,
    (h) => assetMap.get(h.asset_id)?.asset_type,
  )
  const positionGroups: PositionGroup[] = groups.map((g) => ({
    label: g.label,
    rows: g.items.map((h) => {
      const a = assetMap.get(h.asset_id)
      const price = a?.manual_price ?? null
      const value = price != null ? h.quantity * price : h.invested_amount
      const pnl = price != null ? value - h.invested_amount : null
      return {
        symbol: a?.symbol ?? '—',
        name: a?.name ?? '',
        quantity: h.quantity,
        averagePrice: h.average_price,
        cost: h.invested_amount,
        value,
        pnl,
        pct:
          pnl != null && h.invested_amount > EPS
            ? (pnl / h.invested_amount) * 100
            : null,
        hasPrice: price != null,
      }
    }),
  }))

  const latentPositions = holdings.flatMap((h) => {
    const a = assetMap.get(h.asset_id)
    if (!a || a.manual_price == null) return []
    return [
      {
        symbol: a.symbol,
        latent: h.quantity * a.manual_price - h.invested_amount,
      },
    ]
  })
  const latentTotal = latentPositions.reduce((s, r) => s + r.latent, 0)
  const latentTax =
    latentTotal > 0
      ? estimateCapitalGainsTax(latentTotal, { regime: source.taxRegime })
      : 0

  const tax = buildTaxYears(invTxs, source.taxRegime)

  const emptyRates = new Map<string, number>()
  const revaluations = holdings.flatMap((h) => {
    const a = assetMap.get(h.asset_id)
    if (!a || a.manual_price == null) return []
    const at = a.manual_price_at
      ? new Date(a.manual_price_at).getTime()
      : Date.now()
    return [{ at, delta: h.quantity * a.manual_price - h.invested_amount }]
  })
  const timeline = buildPatrimonioTimeline({
    entities: [entity],
    cashTxs: entityCash,
    invTxs,
    base: entity.currency,
    rateMap: emptyRates,
    revaluations,
  })

  const objectives = objectiveRows(
    source.objectives.filter((o) => o.entity_id === entityId),
    assetMap,
    entityMap,
    priceOf,
  )

  return {
    kind: 'entity',
    generatedAt: Date.now(),
    regimeLabel: regimeLabelOf(source.taxRegime),
    entity: {
      name: entity.name,
      typeLabel: entityTypeLabel(entity.type),
      currency: entity.currency,
      color: entity.color,
      iconDomain: entity.icon_domain,
      deleted: entity.deleted_at != null,
    },
    balance: {
      cash: entity.cash_balance_cache,
      investedCost,
      estimatedInv,
      latentPnl,
      latentPct,
      total: entity.cash_balance_cache + estimatedInv,
      hasPrices,
    },
    positionGroups,
    realized: isBroker ? buildRealizedPnL(invTxs) : null,
    taxYears: isBroker ? tax.rows : [],
    taxTotals: isBroker ? tax.totals : null,
    latent: isBroker
      ? {
          positions: [...latentPositions].sort((a, b) => b.latent - a.latent),
          total: latentTotal,
          tax: latentTax,
          effRate: latentTotal > 0 ? latentTax / latentTotal : null,
          net: latentTotal - latentTax,
        }
      : null,
    objectives,
    timeline,
  }
}

/** Informe global: patrimonio del portfolio + agregación por entidad. */
export function buildGlobalReportData(
  source: ReportSource,
  title: string,
  description: string | null,
): GlobalReportData {
  const { entities, holdings, assets, cashTxs, invTxs, base } = source
  const rateMap = buildRateMap(source.rates)
  const datedRates = buildDatedRateMap(source.rates, source.fxHistory)
  const entityMap = new Map(entities.map((e) => [e.id, e]))
  const assetMap = new Map(assets.map((a) => [a.id, a]))
  const priceMap = new Map(assets.map((a) => [a.id, a.manual_price]))
  const priceOf = (assetId: string) =>
    assetMap.get(assetId)?.manual_price ?? null

  const cash = sumToBase(
    entities.map((e) => ({
      amount: e.cash_balance_cache,
      currency: e.currency,
    })),
    base,
    rateMap,
  )
  const investedCost = sumToBase(
    holdings.map((h) => ({
      amount: h.invested_amount,
      currency: entityMap.get(h.entity_id)?.currency ?? base,
    })),
    base,
    rateMap,
  )
  const estimatedInv = sumToBase(
    holdings.map((h) => {
      const price = priceMap.get(h.asset_id)
      return {
        amount: price != null ? h.quantity * price : h.invested_amount,
        currency: entityMap.get(h.entity_id)?.currency ?? base,
      }
    }),
    base,
    rateMap,
  )
  const total = cash.total + estimatedInv.total
  const latentPnl = estimatedInv.total - investedCost.total
  const latentPct =
    investedCost.total > EPS ? (latentPnl / investedCost.total) * 100 : null
  const missing = [...new Set([...cash.missing, ...investedCost.missing])]

  const dist = buildDistribution({
    entities,
    holdings,
    base,
    rateMap,
    priceMap,
  })
  const byEntity = new Map<string, number>()
  for (const s of dist.segments) {
    byEntity.set(s.entityName, (byEntity.get(s.entityName) ?? 0) + s.value)
  }
  const distribution = [...byEntity.entries()]
    .map(([label, value]) => ({
      label,
      value,
      pct: dist.total > 0 ? (value / dist.total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const byTypeMap = new Map<string, number>()
  for (const h of holdings) {
    const a = assetMap.get(h.asset_id)
    const cur = entityMap.get(h.entity_id)?.currency ?? base
    const price = a?.manual_price ?? null
    const localValue = price != null ? h.quantity * price : h.invested_amount
    const v = convertToBase(localValue, cur, base, rateMap)
    if (v == null) continue
    const label = a ? ASSET_TYPE_LABELS[a.asset_type] : ASSET_TYPE_LABELS.OTHER
    byTypeMap.set(label, (byTypeMap.get(label) ?? 0) + v)
  }
  const byTypeTotal = [...byTypeMap.values()].reduce((s, v) => s + v, 0)
  const byType = [...byTypeMap.entries()]
    .map(([label, value]) => ({
      label,
      value,
      pct: byTypeTotal > 0 ? (value / byTypeTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const entityRows: EntitySummaryRow[] = entities.map((e) => {
    const eHoldings = holdings.filter((h) => h.entity_id === e.id)
    const cashBase =
      convertToBase(e.cash_balance_cache, e.currency, base, rateMap) ?? 0
    let invBase = 0
    let costBase = 0
    let anyPrice = false
    for (const h of eHoldings) {
      const price = priceOf(h.asset_id)
      if (price != null) anyPrice = true
      const localVal = price != null ? h.quantity * price : h.invested_amount
      invBase += convertToBase(localVal, e.currency, base, rateMap) ?? 0
      costBase +=
        convertToBase(h.invested_amount, e.currency, base, rateMap) ?? 0
    }
    return {
      name: e.name,
      typeLabel: entityTypeLabel(e.type),
      cash: cashBase,
      invested: invBase,
      // Sin posiciones (p. ej. un banco) → rendimiento 0. Solo es desconocido
      // ("—") cuando hay posiciones pero ninguna tiene precio actual.
      pnl: eHoldings.length > 0 && !anyPrice ? null : invBase - costBase,
      total: cashBase + invBase,
    }
  })

  const realizedPnl = buildRealizedPnL(invTxs)
  const tax = buildTaxYears(invTxs, source.taxRegime)

  let latentTaxTotal = 0
  for (const e of entities) {
    const eHoldings = holdings.filter((h) => h.entity_id === e.id)
    let entLatent = 0
    for (const h of eHoldings) {
      const a = assetMap.get(h.asset_id)
      if (!a || a.manual_price == null) continue
      entLatent += h.quantity * a.manual_price - h.invested_amount
    }
    if (entLatent > 0) {
      const t = estimateCapitalGainsTax(entLatent, { regime: source.taxRegime })
      latentTaxTotal += convertToBase(t, e.currency, base, rateMap) ?? 0
    }
  }

  const revaluations: { at: number; delta: number }[] = []
  for (const h of holdings) {
    const a = assetMap.get(h.asset_id)
    if (!a || a.manual_price == null) continue
    const cur = entityMap.get(h.entity_id)?.currency ?? base
    const delta = convertToBase(
      h.quantity * a.manual_price - h.invested_amount,
      cur,
      base,
      rateMap,
    )
    if (delta == null) continue
    const at = a.manual_price_at
      ? new Date(a.manual_price_at).getTime()
      : Date.now()
    revaluations.push({ at, delta })
  }
  const timeline = buildPatrimonioTimeline({
    entities,
    cashTxs,
    invTxs,
    base,
    rateMap,
    dated: datedRates,
    revaluations,
  })

  const objectives = objectiveRows(
    source.objectives,
    assetMap,
    entityMap,
    priceOf,
  )

  return {
    kind: 'global',
    generatedAt: Date.now(),
    title,
    description,
    base,
    regimeLabel: regimeLabelOf(source.taxRegime),
    totals: {
      cash: cash.total,
      invested: estimatedInv.total,
      total,
      investedCost: investedCost.total,
      latentPnl,
      latentPct,
    },
    missing,
    distribution,
    byType,
    entityRows: entityRows.sort((a, b) => b.total - a.total),
    realized: realizedPnl.hasSells
      ? {
          pnl: realizedPnl.pnl,
          costBasis: realizedPnl.costBasis,
          proceeds: realizedPnl.proceeds,
        }
      : null,
    taxYears: tax.rows,
    taxTotals: tax.totals,
    latentTaxTotal,
    objectives,
    timeline,
  }
}
