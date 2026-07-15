import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney, getCurrency } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import {
  assetKey,
  useAsset,
  useUpdateAssetPrice,
} from '@/features/assets/hooks'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_LABELS_SINGULAR,
} from '@/features/assets/labels'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEntities } from '@/features/entities/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { HoldingCard } from '@/features/holdings/HoldingCard'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { Link } from 'react-router-dom'
import {
  BackButton,
  EditButton,
  Field,
  LoadMoreButton,
  NotFound,
  useLoadMore,
} from '@/routes/detail/detailShared'

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null
  const { data: asset, isLoading } = useAsset(id)

  const { data: entities = [] } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: transactions = [] } = useInvestmentTransactions(
    portfolioId,
    entityIds,
  )

  const [editOpen, setEditOpen] = React.useState(false)

  const updatePrice = useUpdateAssetPrice()
  const [priceDraft, setPriceDraft] = React.useState('')
  const [priceMsg, setPriceMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPriceDraft(asset?.manual_price != null ? String(asset.manual_price) : '')
    setPriceMsg(null)
  }, [asset?.id, asset?.manual_price])

  async function savePrice() {
    if (!asset) return
    setPriceMsg(null)
    const raw = priceDraft.trim()
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v) || v <= 0) {
      setPriceMsg('Introduce un precio mayor que 0.')
      return
    }
    try {
      await updatePrice.mutateAsync({ id: asset.id, price: v })
    } catch (err) {
      setPriceMsg((err as Error).message)
    }
  }

  function refresh(open: boolean) {
    if (!open && id) {
      queryClient.invalidateQueries({ queryKey: assetKey(id) })
    }
  }

  const assetHoldings = holdings.filter((h) => h.asset_id === id)
  const assetTxs = transactions.filter((t) => t.asset_id === id)
  const txPaged = useLoadMore(assetTxs)

  if (isLoading) {
    return (
      <>
        <BackButton />
        <p className="text-muted-foreground text-sm">Cargando activo…</p>
      </>
    )
  }

  if (!asset) {
    return (
      <>
        <BackButton />
        <NotFound message="Este activo ya no existe." />
      </>
    )
  }

  return (
    <>
      <BackButton />

      <div className="space-y-8">
        <section className="bg-card space-y-6 rounded-xl border p-6">
          <div className="flex items-start gap-4">
            <span style={brandStyle(asset.color)}>
              <BrandIcon
                name={asset.name || asset.symbol}
                domain={asset.icon_domain}
                className={
                  asset.color
                    ? 'bg-brand text-brand-foreground size-12'
                    : 'size-12'
                }
              />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                {asset.symbol}
                {asset.deleted_at && (
                  <span className="text-muted-foreground text-sm font-normal">
                    · Eliminado
                  </span>
                )}
                <EditButton
                  onClick={() => setEditOpen(true)}
                  disabled={Boolean(asset.deleted_at)}
                />
              </h1>
              <p className="text-muted-foreground text-sm">
                {ASSET_TYPE_LABELS_SINGULAR[asset.asset_type]} · {asset.name}
              </p>
            </div>
          </div>

          <dl className="border-t pt-2">
            <Field label="Símbolo">{asset.symbol}</Field>
            <Field label="Nombre">{asset.name}</Field>
            <Field label="Tipo">{ASSET_TYPE_LABELS[asset.asset_type]}</Field>
            <Field label="Moneda">{asset.currency}</Field>
            {asset.isin && <Field label="ISIN">{asset.isin}</Field>}
            {asset.exchange && <Field label="Mercado">{asset.exchange}</Field>}
          </dl>
        </section>

        <div className="bg-card space-y-2 rounded-xl border p-4">
          <Label htmlFor="asset-price">Precio actual</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {getCurrency(asset.currency)?.symbol ?? asset.currency}
              </span>
              <Input
                id="asset-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                className="pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                placeholder="150.25"
                disabled={Boolean(asset.deleted_at)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={savePrice}
              disabled={updatePrice.isPending || Boolean(asset.deleted_at)}
            >
              Guardar
            </Button>
          </div>
          {priceMsg ? (
            <p className="text-destructive text-xs">{priceMsg}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Se usa solo para estimar tu valor de mercado y rendimiento; no
              crea operaciones.
            </p>
          )}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Posiciones con este activo
          </h2>
          {assetHoldings.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              No tienes posiciones abiertas de este activo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assetHoldings.map((h) => {
                const entity = entityMap.get(h.entity_id)
                const currency = entity?.currency ?? asset.currency
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
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Histórico de operaciones
          </h2>
          {assetTxs.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Sin operaciones de este activo.
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {txPaged.visible.map((t) => {
                const isBuy = t.transaction_type === 'BUY'
                const net = isBuy
                  ? t.gross_amount + t.fees + t.taxes
                  : t.gross_amount - t.fees - t.taxes
                return (
                  <Link
                    key={t.id}
                    to={`/investments/${t.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {isBuy ? 'Compra' : 'Venta'} ·{' '}
                        {entityMap.get(t.entity_id)?.name ?? '—'}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {t.quantity} ×{' '}
                        {formatMoney(t.price_per_unit, t.currency)} ·{' '}
                        {dateFmt.format(new Date(t.executed_at))}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        isBuy ? 'text-negative' : 'text-positive'
                      }`}
                    >
                      {isBuy ? '-' : '+'}
                      {formatMoney(net, t.currency)}
                    </div>
                  </Link>
                )
              })}
              {txPaged.hasMore && (
                <LoadMoreButton
                  remaining={txPaged.remaining}
                  onClick={txPaged.showMore}
                />
              )}
            </div>
          )}
        </section>
      </div>

      <AssetFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          refresh(o)
        }}
        asset={asset}
      />
    </>
  )
}
