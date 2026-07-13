import * as React from 'react'
import {
  ChartPieIcon,
  RefreshCwIcon,
  SettingsIcon,
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
import { buildRateMap, convertToBase, sumToBase } from '@/lib/fx'
import { useProfile } from '@/features/profile/hooks'
import { useEntities } from '@/features/entities/hooks'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useCashTransactions } from '@/features/cash/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { useFxRates } from '@/features/fx/hooks'
import { FxRatesDialog } from '@/features/fx/FxRatesDialog'
import { PriceUpdateDialog } from '@/features/assets/PriceUpdateDialog'
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

  const [ratesOpen, setRatesOpen] = React.useState(false)
  const [analysisOpen, setAnalysisOpen] = React.useState(false)
  const [pricesOpen, setPricesOpen] = React.useState(false)

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const rateMap = React.useMemo(() => buildRateMap(rates), [rates])

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

  const neededCurrencies = React.useMemo(
    () => [...new Set(entities.map((e) => e.currency))],
    [entities],
  )

  const timeline = React.useMemo(
    () =>
      buildPatrimonioTimeline({
        entities,
        cashTxs,
        invTxs,
        base,
        rateMap,
        revaluations,
      }),
    [entities, cashTxs, invTxs, base, rateMap, revaluations],
  )

  const markers = React.useMemo(
    () => revaluations.map((r) => r.at),
    [revaluations],
  )

  const distribution = React.useMemo(
    () => buildDistribution({ entities, holdings, base, rateMap }),
    [entities, holdings, base, rateMap],
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
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setPricesOpen(true)}
          >
            <RefreshCwIcon className="size-4" />
            Actualizar precios
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setRatesOpen(true)}
          >
            <SettingsIcon className="size-4" />
            Tipos de cambio
          </Button>
        </div>
      </div>

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
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setRatesOpen(true)}
              >
                Añádelos
              </button>
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
            <div>
              <p className="text-muted-foreground mb-4 text-xs">
                Líquido vs inversiones
              </p>
              <CategoryDonut
                base={base}
                slices={[
                  { label: 'Efectivo', value: cash.total, color: '#0ea5e9' },
                  {
                    label: 'Inversiones',
                    value: invested.total,
                    color: '#6366f1',
                  },
                ]}
              />
            </div>
            <div className="border-t pt-6">
              <p className="text-muted-foreground mb-4 text-xs">
                Distribución por entidad
              </p>
              <DonutChart
                segments={distribution.segments}
                total={distribution.total}
                base={base}
                colorOf={colorOf}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FxRatesDialog
        open={ratesOpen}
        onOpenChange={setRatesOpen}
        base={base}
        neededCurrencies={neededCurrencies}
      />

      <PriceUpdateDialog
        open={pricesOpen}
        onOpenChange={setPricesOpen}
        portfolioId={portfolioId}
        base={base}
      />
    </div>
  )
}
