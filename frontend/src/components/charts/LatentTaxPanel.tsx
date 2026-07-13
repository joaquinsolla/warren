import * as React from 'react'
import { formatMoney } from '@/lib/currencies'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TAX_REGIMES,
  TAX_REGIME_OPTIONS,
  DEFAULT_TAX_REGIME,
  estimateCapitalGainsTax,
} from '@/config/tax'

export type LatentPosition = { symbol: string; latent: number }

/**
 * Escenario "si vendieras hoy": estima la plusvalía latente (por precios
 * manuales) y el impuesto de plusvalías que se pagaría si se realizara toda la
 * posición ahora. Es solo una estimación: no se aplica al balance ni se persiste.
 */
export function LatentTaxPanel({
  positions,
  currency,
  defaultRegime,
}: {
  positions: LatentPosition[]
  currency: string
  defaultRegime: string
}) {
  const [regimeKey, setRegimeKey] = React.useState(
    TAX_REGIMES[defaultRegime] ? defaultRegime : DEFAULT_TAX_REGIME,
  )

  const regime = TAX_REGIMES[regimeKey] ?? TAX_REGIMES[DEFAULT_TAX_REGIME]
  const currencyMismatch = regime.currency !== currency

  const rows = [...positions].sort((a, b) => b.latent - a.latent)
  const totalLatent = rows.reduce((s, r) => s + r.latent, 0)
  const tax =
    totalLatent > 0
      ? estimateCapitalGainsTax(totalLatent, { regime: regimeKey })
      : 0
  const effRate = totalLatent > 0 ? tax / totalLatent : 0
  const net = totalLatent - tax

  if (positions.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-[100px] items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm">
        Ajusta el precio actual de tus posiciones para estimar la plusvalía
        latente y su impuesto.
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Activo</th>
              <th className="px-3 py-2 text-right font-medium">
                Plusvalía latente
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td className="px-3 py-2">{r.symbol}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${r.latent >= 0 ? 'text-positive' : 'text-negative'}`}
                >
                  {r.latent >= 0 ? '+' : ''}
                  {formatMoney(r.latent, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2">
            <tr className="font-medium">
              <td className="px-3 py-2">Total</td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${totalLatent >= 0 ? 'text-positive' : 'text-negative'}`}
              >
                {totalLatent >= 0 ? '+' : ''}
                {formatMoney(totalLatent, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Impuesto estimado</dt>
          <dd className="tabular-nums">{formatMoney(tax, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tipo efectivo</dt>
          <dd className="text-muted-foreground tabular-nums">
            {totalLatent > 0 ? `${(effRate * 100).toFixed(1)}%` : '—'}
          </dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>Neto tras impuestos</dt>
          <dd
            className={`tabular-nums ${net >= 0 ? 'text-positive' : 'text-negative'}`}
          >
            {net >= 0 ? '+' : ''}
            {formatMoney(net, currency)}
          </dd>
        </div>
      </dl>

      <div className="text-muted-foreground space-y-1 border-t pt-3 text-xs">
        <p>
          Escenario hipotético si vendieras hoy todas las posiciones al precio
          actual introducido. Las pérdidas latentes compensan las ganancias en
          el total. No es asesoramiento fiscal.
        </p>
        {regime.note && <p>{regime.note}</p>}
        {currencyMismatch && (
          <p>
            Los tramos están en {regime.currency} y tus posiciones en {currency}
            ; el cálculo es aproximado si difieren mucho.
          </p>
        )}
      </div>
    </div>
  )
}
