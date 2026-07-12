import * as React from 'react'
import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'

export function HoldingsSection({ portfolioId }: { portfolioId: string }) {
  const { data: entities = [] } = useEntities(portfolioId)
  const { data: assets = [] } = useAllAssets()
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const {
    data: holdings = [],
    isLoading,
    error,
  } = useHoldings(portfolioId, entityIds)

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const assetMap = React.useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  )

  if (!isLoading && !error && holdings.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Posiciones abiertas
        </h2>
        <p className="text-muted-foreground text-xs">
          Calculadas por FIFO desde tus operaciones.
        </p>
      </div>

      {error && (
        <p className="text-destructive text-sm">
          Error al cargar posiciones: {(error as Error).message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {holdings.map((h) => {
          const asset = assetMap.get(h.asset_id)
          const entity = entityMap.get(h.entity_id)
          const currency = entity?.currency ?? 'EUR'
          return (
            <Link
              key={h.id}
              to={`/holdings/${h.id}`}
              style={brandStyle(asset?.color ?? null)}
              className="bg-card hover:bg-muted/50 block space-y-3 rounded-xl border p-4"
            >
              <div className="flex items-center gap-3">
                <BrandIcon
                  name={asset?.symbol ?? '?'}
                  domain={asset?.icon_domain ?? null}
                  className={
                    asset?.color
                      ? 'bg-brand text-brand-foreground size-9'
                      : 'size-9'
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {asset?.symbol ?? '—'}
                    {asset?.deleted_at ? ' · Eliminado' : ''}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {entity?.name ?? '—'}
                  </p>
                </div>
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cantidad</dt>
                  <dd className="tabular-nums">{h.quantity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Precio medio</dt>
                  <dd className="tabular-nums">
                    {formatMoney(h.average_price, currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Invertido</dt>
                  <dd className="tabular-nums">
                    {formatMoney(h.invested_amount, currency)}
                  </dd>
                </div>
              </dl>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
