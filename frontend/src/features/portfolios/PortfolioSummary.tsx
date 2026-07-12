import * as React from 'react'
import { SettingsIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/currencies'
import { buildRateMap, sumToBase } from '@/lib/fx'
import { useProfile } from '@/features/profile/hooks'
import { useEntities } from '@/features/entities/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useFxRates } from '@/features/fx/hooks'
import { FxRatesDialog } from '@/features/fx/FxRatesDialog'

export function PortfolioSummary({ portfolioId }: { portfolioId: string }) {
  const { data: profile } = useProfile()
  const base = profile?.base_currency ?? 'EUR'
  const { data: entities = [] } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: rates = [] } = useFxRates()

  const [ratesOpen, setRatesOpen] = React.useState(false)

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const rateMap = React.useMemo(() => buildRateMap(rates), [rates])

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

  const total = cash.total + invested.total
  const missing = [...new Set([...cash.missing, ...invested.missing])]

  const neededCurrencies = React.useMemo(
    () => [...new Set(entities.map((e) => e.currency))],
    [entities],
  )

  return (
    <section className="bg-card rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Patrimonio total
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(total, base)}
          </p>
          <p className="text-muted-foreground text-xs">
            Efectivo {formatMoney(cash.total, base)} · Invertido (a coste){' '}
            {formatMoney(invested.total, base)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRatesOpen(true)}
        >
          <SettingsIcon className="size-4" />
          Tipos de cambio
        </Button>
      </div>

      {missing.length > 0 && (
        <div className="text-muted-foreground mt-4 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Faltan tipos de cambio para: {missing.join(', ')}. Esos importes no
            se incluyen en el total.{' '}
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

      <FxRatesDialog
        open={ratesOpen}
        onOpenChange={setRatesOpen}
        base={base}
        neededCurrencies={neededCurrencies}
      />
    </section>
  )
}
