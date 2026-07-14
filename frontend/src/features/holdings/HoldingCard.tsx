import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import type { Holding } from '@/features/holdings/api'
import type { Asset } from '@/features/assets/api'

export function HoldingCard({
  holding,
  asset,
  subtitle,
  currency,
}: {
  holding: Holding
  asset: Asset | undefined
  subtitle: string
  currency: string
}) {
  const h = holding
  const price = asset?.manual_price ?? null
  const estValue = price != null ? h.quantity * price : null
  const pnl = estValue != null ? estValue - h.invested_amount : null
  const pct =
    pnl != null && h.invested_amount > 0
      ? (pnl / h.invested_amount) * 100
      : null
  const positive = (pnl ?? 0) >= 0

  return (
    <Link
      to={`/holdings/${h.id}`}
      style={brandStyle(asset?.color ?? null)}
      className="bg-card hover:bg-muted/50 block space-y-3 rounded-xl border p-4"
    >
      <div className="flex items-center gap-3">
        <BrandIcon
          name={asset?.symbol ?? '?'}
          domain={asset?.icon_domain ?? null}
          className={
            asset?.color ? 'bg-brand text-brand-foreground size-9' : 'size-9'
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {asset?.symbol ?? '—'}
            {asset?.deleted_at ? ' · Eliminado' : ''}
          </p>
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        </div>
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Precio actual</dt>
          <dd className="tabular-nums">
            {price != null ? formatMoney(price, currency) : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Rendimiento</dt>
          <dd
            className={`tabular-nums ${pnl == null ? '' : positive ? 'text-positive' : 'text-negative'}`}
          >
            {pnl == null ? (
              '—'
            ) : (
              <>
                {positive ? '+' : ''}
                {formatMoney(pnl, currency)}
                {pct != null && ` (${positive ? '+' : ''}${pct.toFixed(1)}%)`}
              </>
            )}
          </dd>
        </div>
      </dl>
    </Link>
  )
}
