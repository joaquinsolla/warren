import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { getCurrency } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useAssets, useUpdateAssetPrice } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { groupByAssetType } from '@/features/assets/grouping'
import type { AssetType } from '@/features/assets/api'

type PriceUpdateManagerProps = {
  portfolioId: string
  base: string
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
})

type AssetRow = {
  assetId: string
  symbol: string
  name: string
  currency: string
  assetType: AssetType
  iconDomain: string | null
  color: string | null
  manualPrice: number | null
  manualPriceAt: string | null
}

/**
 * Actualización manual de precios (estimación). Núcleo reutilizable: lista los
 * activos activos y permite fijar el precio actual de cada uno, guardando
 * símbolo a símbolo. Con esos precios se estima el valor de mercado y el
 * rendimiento latente sin necesidad de vender.
 */
export function PriceUpdateManager({
  portfolioId,
  base,
}: PriceUpdateManagerProps) {
  const { data: entities = [] } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: activeAssets = [] } = useAssets()
  const update = useUpdateAssetPrice()
  const navigate = useNavigate()

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )

  const rows = React.useMemo<AssetRow[]>(() => {
    const acc = new Map<string, string>()
    for (const h of holdings) {
      if (acc.has(h.asset_id)) continue
      acc.set(h.asset_id, entityMap.get(h.entity_id)?.currency ?? base)
    }
    return activeAssets
      .map((asset) => ({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        currency: acc.get(asset.id) ?? asset.currency,
        assetType: asset.asset_type,
        iconDomain: asset.icon_domain ?? null,
        color: asset.color ?? null,
        manualPrice: asset.manual_price ?? null,
        manualPriceAt: asset.manual_price_at ?? null,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [holdings, activeAssets, entityMap, base])

  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [editing, setEditing] = React.useState<Set<string>>(new Set())
  const [query, setQuery] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    const initial: Record<string, string> = {}
    for (const r of rows) {
      initial[r.assetId] = r.manualPrice != null ? String(r.manualPrice) : ''
    }
    setDrafts(initial)
    setErrorMsg(null)
  }, [rows])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? rows.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q),
      )
    : rows

  const groups = groupByAssetType(filtered, (r) => r.assetType)

  function startEdit(assetId: string) {
    setErrorMsg(null)
    setEditing((prev) => new Set(prev).add(assetId))
  }

  async function handleSave(row: AssetRow) {
    setErrorMsg(null)
    const raw = drafts[row.assetId]?.trim() ?? ''
    const value = Number(raw)
    if (raw === '' || !Number.isFinite(value) || value <= 0) {
      setErrorMsg(`Introduce un precio mayor que 0 para ${row.symbol}.`)
      return
    }
    try {
      await update.mutateAsync({ id: row.assetId, price: value })
      setEditing((prev) => {
        const next = new Set(prev)
        next.delete(row.assetId)
        return next
      })
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No tienes activos que valorar.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o símbolo…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ningún activo coincide con «{query}».
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.type} className="space-y-3">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.items.map((r) => {
                  const isEditing = editing.has(r.assetId)
                  return (
                    <div
                      key={r.assetId}
                      style={brandStyle(r.color)}
                      className="flex items-center gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/assets/${r.assetId}`)}
                        aria-label={`Ver ${r.name || r.symbol}`}
                        className="shrink-0 rounded-full"
                      >
                        <BrandIcon
                          name={r.name || r.symbol}
                          domain={r.iconDomain}
                          className={
                            r.color
                              ? 'bg-brand text-brand-foreground size-10'
                              : 'size-10'
                          }
                        />
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/assets/${r.assetId}`)}
                            className="truncate text-left text-sm font-medium hover:underline"
                          >
                            {r.name || r.symbol}
                            {r.name && (
                              <span className="text-muted-foreground font-normal">
                                {' '}
                                · {r.symbol}
                              </span>
                            )}
                          </button>
                          {r.manualPriceAt && (
                            <span className="text-muted-foreground text-xs">
                              {dateFmt.format(new Date(r.manualPriceAt))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                              {getCurrency(r.currency)?.symbol ?? r.currency}
                            </span>
                            <Input
                              id={`price-${r.assetId}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              readOnly={!isEditing}
                              aria-label={`Precio de ${r.name || r.symbol}`}
                              className="pl-8 read-only:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={drafts[r.assetId] ?? ''}
                              onChange={(e) =>
                                setDrafts((d) => ({
                                  ...d,
                                  [r.assetId]: e.target.value,
                                }))
                              }
                              placeholder="Precio actual"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-20"
                            onClick={() =>
                              isEditing ? handleSave(r) : startEdit(r.assetId)
                            }
                            disabled={update.isPending}
                          >
                            {isEditing ? 'Guardar' : 'Editar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}
    </div>
  )
}
