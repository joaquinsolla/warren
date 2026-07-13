import * as React from 'react'
import { formatMoney } from '@/lib/currencies'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildRealizedByYear } from '@/features/portfolios/patrimonio'
import {
  TAX_REGIMES,
  TAX_REGIME_OPTIONS,
  DEFAULT_TAX_REGIME,
  estimateCapitalGainsTax,
} from '@/config/tax'
import type { InvestmentTransaction } from '@/features/investments/api'

type Mode = 'natural' | 'fiscal'

/**
 * Estima el impuesto de plusvalías del bróker sobre las ganancias realizadas
 * (FIFO), año a año, según el régimen elegido. Es solo una estimación: no se
 * aplica al balance ni se persiste.
 */
export function TaxAnalysisPanel({
  invTxs,
  currency,
  defaultRegime,
}: {
  invTxs: InvestmentTransaction[]
  currency: string
  defaultRegime: string
}) {
  const [regimeKey, setRegimeKey] = React.useState(
    TAX_REGIMES[defaultRegime] ? defaultRegime : DEFAULT_TAX_REGIME,
  )
  const [mode, setMode] = React.useState<Mode>('natural')

  const regime = TAX_REGIMES[regimeKey] ?? TAX_REGIMES[DEFAULT_TAX_REGIME]
  const fiscalStart = mode === 'fiscal' ? (regime.fiscalYearStartMonth ?? 1) : 1

  const years = React.useMemo(
    () => buildRealizedByYear(invTxs, fiscalStart),
    [invTxs, fiscalStart],
  )

  const rows = years.map((y) => {
    const tax = estimateCapitalGainsTax(y.netGain, { regime: regimeKey })
    return {
      ...y,
      tax,
      effRate: y.netGain > 0 ? tax / y.netGain : 0,
    }
  })

  const totalNet = rows.reduce((s, r) => s + r.netGain, 0)
  const totalTax = rows.reduce((s, r) => s + r.tax, 0)
  const fiscalDiffers = (regime.fiscalYearStartMonth ?? 1) !== 1
  const currencyMismatch = regime.currency !== currency

  const modes: { key: Mode; label: string }[] = [
    { key: 'natural', label: 'Año natural' },
    { key: 'fiscal', label: 'Año fiscal' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={regimeKey} onValueChange={setRegimeKey}>
          <SelectTrigger className="h-8 w-auto min-w-[10rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAX_REGIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={
                'rounded-md px-2 py-1 text-xs font-medium transition-colors ' +
                (mode === m.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50')
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground flex min-h-[100px] items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm">
          No hay ventas cerradas: el impuesto de plusvalías se genera al
          realizar ganancias.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Periodo</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Ganancia neta
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Impuesto</th>
                  <th className="px-3 py-2 text-right font-medium">Tipo ef.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-3 py-2">{r.label}</td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${r.netGain >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {r.netGain >= 0 ? '+' : ''}
                      {formatMoney(r.netGain, currency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(r.tax, currency)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                      {r.netGain > 0 ? `${(r.effRate * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr className="font-medium">
                  <td className="px-3 py-2">Máx (total)</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${totalNet >= 0 ? 'text-positive' : 'text-negative'}`}
                  >
                    {totalNet >= 0 ? '+' : ''}
                    {formatMoney(totalNet, currency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(totalTax, currency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {totalNet > 0
                      ? `${((totalTax / totalNet) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {regime.taxFreeAllowance ? (
            <p className="text-muted-foreground text-xs">
              Mínimo exento anual:{' '}
              {formatMoney(regime.taxFreeAllowance, regime.currency)}.
            </p>
          ) : null}
        </>
      )}

      <div className="text-muted-foreground space-y-1 border-t pt-3 text-xs">
        <p>
          Estimación sobre ganancias realizadas (FIFO), neta de comisiones e
          impuestos de cada operación. Las pérdidas de un año no compensan las
          ganancias de otro en este cálculo. No es asesoramiento fiscal.
        </p>
        {regime.note && <p>{regime.note}</p>}
        {mode === 'fiscal' && !fiscalDiffers && (
          <p>En {regime.label} el año fiscal coincide con el natural.</p>
        )}
        {currencyMismatch && (
          <p>
            Los tramos están en {regime.currency} y tus operaciones en{' '}
            {currency}; el cálculo es aproximado si difieren mucho.
          </p>
        )}
      </div>
    </div>
  )
}
