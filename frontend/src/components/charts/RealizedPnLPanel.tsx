import * as React from 'react'
import { formatMoney } from '@/lib/currencies'
import { buildRealizedPnL } from '@/features/portfolios/patrimonio'
import type { InvestmentTransaction } from '@/features/investments/api'

const DAY = 86_400_000
const RANGES = [
  { key: '1D', ms: DAY },
  { key: '1S', ms: 7 * DAY },
  { key: '1M', ms: 30 * DAY },
  { key: '1A', ms: 365 * DAY },
  { key: '5A', ms: 5 * 365 * DAY },
  { key: 'MAX', ms: Infinity },
] as const

type RangeKey = (typeof RANGES)[number]['key']

/**
 * Compara el coste de lo vendido (dinero invertido) con el importe recibido y
 * muestra el resultado realizado, filtrable por rango temporal (ventas dentro
 * de la ventana). Sin fuente de precios en vivo es la única medida objetiva de
 * ganancia/pérdida.
 */
export function RealizedPnLPanel({
  invTxs,
  base,
}: {
  invTxs: InvestmentTransaction[]
  base: string
}) {
  const [range, setRange] = React.useState<RangeKey>('MAX')
  const now = React.useMemo(() => Date.now(), [])

  const data = React.useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!
    const since = cfg.ms === Infinity ? undefined : now - cfg.ms
    return buildRealizedPnL(invTxs, since)
  }, [invTxs, range, now])

  const max = Math.max(data.costBasis, data.proceeds, 1)
  const positive = data.pnl >= 0
  const signClass = positive ? 'text-positive' : 'text-negative'
  const barColor = positive ? 'var(--positive)' : 'var(--negative)'

  const rows = [
    {
      label: 'Coste de lo vendido',
      value: data.costBasis,
      color: 'var(--muted-foreground)',
    },
    { label: 'Importe recibido', value: data.proceeds, color: barColor },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={
              'rounded-md px-2 py-1 text-xs font-medium transition-colors ' +
              (range === r.key
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50')
            }
          >
            {r.key}
          </button>
        ))}
      </div>

      {!data.hasSells ? (
        <div className="text-muted-foreground flex min-h-[120px] items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm">
          No hay ventas cerradas en este periodo. La rentabilidad se calcula al
          vender; las posiciones abiertas se valoran a coste hasta que exista
          cotización.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(r.value, base)}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.value / max) * 100}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="text-sm font-medium">Resultado realizado</span>
            <span className={`text-right ${signClass}`}>
              <span className="text-lg font-semibold tabular-nums">
                {positive ? '+' : ''}
                {formatMoney(data.pnl, base)}
              </span>
              {data.returnPct !== null && (
                <span className="ml-2 text-sm tabular-nums">
                  ({positive ? '+' : ''}
                  {(data.returnPct * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Comisiones pagadas</span>
              <span className="tabular-nums">
                {formatMoney(data.fees, base)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Impuestos pagados</span>
              <span className="tabular-nums">
                {formatMoney(data.taxes, base)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
