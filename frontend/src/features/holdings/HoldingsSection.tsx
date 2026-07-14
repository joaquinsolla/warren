import * as React from 'react'
import { useEntities } from '@/features/entities/hooks'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { HoldingCard } from '@/features/holdings/HoldingCard'
import { groupByAssetType } from '@/features/assets/grouping'

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

  const groups = React.useMemo(
    () =>
      groupByAssetType(holdings, (h) => assetMap.get(h.asset_id)?.asset_type),
    [holdings, assetMap],
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

      {groups.map((group) => (
        <div key={group.type} className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {group.label}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((h) => {
              const asset = assetMap.get(h.asset_id)
              const entity = entityMap.get(h.entity_id)
              const currency = entity?.currency ?? 'EUR'
              return (
                <HoldingCard
                  key={h.id}
                  holding={h}
                  asset={asset}
                  subtitle={entity?.name ?? '—'}
                  currency={currency}
                />
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
