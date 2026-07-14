import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChartPieIcon,
  ClockIcon,
  TargetIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/currencies'
import {
  buildDatedRateMap,
  buildRateMap,
  convertToBase,
  sumToBase,
} from '@/lib/fx'
import { useProfile } from '@/features/profile/hooks'
import { useEntities } from '@/features/entities/hooks'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useCashTransactions } from '@/features/cash/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { useFxRates, useFxRateHistory } from '@/features/fx/hooks'
import { useObjectives } from '@/features/objectives/hooks'
import { isObjectiveMet } from '@/features/objectives/status'
import {
  buildDistribution,
  buildPatrimonioTimeline,
} from '@/features/portfolios/patrimonio'
import { GrowthChart } from '@/components/charts/GrowthChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'

const FALLBACK_PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

export function PortfolioSummary({
  portfolioId,
  title,
  description,
}: {
  portfolioId: string
  title: string
  description?: string | null
}) {
  const { data: profile } = useProfile()
  const base = profile?.base_currency ?? 'EUR'
  const { data: entities = [] } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: assets = [] } = useAllAssets()
  const { data: cashTxs = [] } = useCashTransactions(portfolioId)
  const { data: invTxs = [] } = useInvestmentTransactions(
    portfolioId,
    entityIds,
  )
  const { data: rates = [] } = useFxRates()
  const { data: fxHistory = [] } = useFxRateHistory()
  const { data: objectives = [] } = useObjectives(portfolioId)
  const navigate = useNavigate()

  const [analysisOpen, setAnalysisOpen] = React.useState(false)
  const [analysisView, setAnalysisView] = React.useState<'entity' | 'liquid'>(
    'entity',
  )

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const rateMap = React.useMemo(() => buildRateMap(rates), [rates])
  const datedRates = React.useMemo(
    () => buildDatedRateMap(rates, fxHistory),
    [rates, fxHistory],
  )

  const colorOf = React.useMemo(() => {
    const map = new Map<string, string>()
    let i = 0
    for (const e of entities) {
      map.set(e.id, e.color ?? FALLBACK_PALETTE[i % FALLBACK_PALETTE.length])
      i++
    }
    return (id: string) => map.get(id) ?? FALLBACK_PALETTE[0]
  }, [entities])

  const cash = sumToBase(
    entities.map((e) => ({
      amount: e.cash_balance_cache,
      currency: e.currency,
    })),
    base,
    rateMap,
  )
  const invested = sumToBase(
    holdings.map((h) => ({
      amount: h.invested_amount,
      currency: entityMap.get(h.entity_id)?.currency ?? base,
    })),
    base,
    rateMap,
  )

  const missing = [...new Set([...cash.missing, ...invested.missing])]

  const priceMap = React.useMemo(
    () => new Map(assets.map((a) => [a.id, a.manual_price])),
    [assets],
  )
  // Valor estimado de las inversiones: usa el precio manual donde exista y el
  // coste en las posiciones sin precio, para no infravalorar el total.
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
  const estimatedTotal = cash.total + estimatedInv.total

  // Revaluaciones por posición (una por holding con precio manual), en base y
  // en el instante del ajuste, para dibujar un escalón por cada cambio.
  const revaluations = React.useMemo(() => {
    const assetMap = new Map(assets.map((a) => [a.id, a]))
    const out: { at: number; delta: number }[] = []
    for (const h of holdings) {
      const a = assetMap.get(h.asset_id)
      if (!a || a.manual_price == null) continue
      const cur = entityMap.get(h.entity_id)?.currency ?? base
      const deltaLocal = h.quantity * a.manual_price - h.invested_amount
      const delta = convertToBase(deltaLocal, cur, base, rateMap)
      if (delta === null) continue
      const at = a.manual_price_at
        ? new Date(a.manual_price_at).getTime()
        : Date.now()
      out.push({ at, delta })
    }
    return out
  }, [assets, holdings, entityMap, base, rateMap])

  const timeline = React.useMemo(
    () =>
      buildPatrimonioTimeline({
        entities,
        cashTxs,
        invTxs,
        base,
        rateMap,
        dated: datedRates,
        revaluations,
      }),
    [entities, cashTxs, invTxs, base, rateMap, datedRates, revaluations],
  )

  const markers = React.useMemo(
    () => revaluations.map((r) => r.at),
    [revaluations],
  )

  const distribution = React.useMemo(
    () => buildDistribution({ entities, holdings, base, rateMap, priceMap }),
    [entities, holdings, base, rateMap, priceMap],
  )

  const metObjectivePositions = React.useMemo(() => {
    const byKey = new Map<string, string>()
    const byAsset = new Map<string, string>()
    for (const h of holdings) {
      byKey.set(`${h.asset_id}:${h.entity_id}`, h.id)
      if (!byAsset.has(h.asset_id)) byAsset.set(h.asset_id, h.id)
    }
    const seen = new Map<
      string,
      { holdingId: string; symbol: string; entity: string | null }
    >()
    for (const o of objectives) {
      if (!isObjectiveMet(o, priceMap.get(o.asset_id) ?? null)) continue
      const holdingId = o.entity_id
        ? byKey.get(`${o.asset_id}:${o.entity_id}`)
        : byAsset.get(o.asset_id)
      if (!holdingId || seen.has(holdingId)) continue
      const a = assets.find((x) => x.id === o.asset_id)
      if (!a) continue
      const entity = o.entity_id
        ? (entityMap.get(o.entity_id)?.name ?? null)
        : null
      seen.set(holdingId, { holdingId, symbol: a.symbol, entity })
    }
    return [...seen.values()]
  }, [objectives, priceMap, assets, holdings, entityMap])

  const metObjectives = React.useMemo(
    () =>
      objectives.filter((o) =>
        isObjectiveMet(o, priceMap.get(o.asset_id) ?? null),
      ).length,
    [objectives, priceMap],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {metObjectives > 0 && (
        <div className="border-positive/30 bg-positive/5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-positive flex items-center gap-2 text-sm font-medium">
            <TargetIcon className="size-4 shrink-0" />
            <span>
              {metObjectives === 1
                ? 'Has cumplido 1 objetivo de inversión'
                : `Has cumplido ${metObjectives} objetivos de inversión`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {metObjectivePositions.map((p) => (
              <Link
                key={p.holdingId}
                to={`/holdings/${p.holdingId}`}
                title="Ver posición"
                className="border-positive/30 bg-positive/10 text-positive hover:bg-positive/20 inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <TargetIcon className="size-3" />
                {p.symbol}
                {p.entity && <span className="opacity-70">· {p.entity}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="bg-card space-y-6 rounded-xl border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Patrimonio total
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(estimatedTotal, base)}
            </p>
            <p className="text-muted-foreground text-xs">
              Efectivo {formatMoney(cash.total, base)} · Invertido{' '}
              {formatMoney(estimatedInv.total, base)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigate('/history')}
            >
              <ClockIcon className="size-4" />
              Historial
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setAnalysisOpen(true)}
            >
              <ChartPieIcon className="size-4" />
              Análisis
            </Button>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed p-3 text-xs">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Faltan tipos de cambio para: {missing.join(', ')}. Esos importes
              no se incluyen en el total.{' '}
              <Link to="/fx" className="underline underline-offset-2">
                Añádelos
              </Link>
              .
            </span>
          </div>
        )}

        <GrowthChart points={timeline} base={base} markers={markers} />
      </section>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Análisis del patrimonio</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex gap-1">
              {(
                [
                  { key: 'entity', label: 'Distribución por entidad' },
                  { key: 'liquid', label: 'Líquido vs Inversiones' },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setAnalysisView(v.key)}
                  className={
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                    (analysisView === v.key
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50')
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>

            {analysisView === 'entity' ? (
              <DonutChart
                segments={distribution.segments}
                total={distribution.total}
                base={base}
                colorOf={colorOf}
              />
            ) : (
              <CategoryDonut
                base={base}
                slices={[
                  { label: 'Efectivo', value: cash.total, color: '#0ea5e9' },
                  {
                    label: 'Inversiones',
                    value: estimatedInv.total,
                    color: '#6366f1',
                  },
                ]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
