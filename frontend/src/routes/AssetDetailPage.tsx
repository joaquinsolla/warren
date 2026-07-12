import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { assetKey, useAsset } from '@/features/assets/hooks'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import { DeleteAssetDialog } from '@/features/assets/DeleteAssetDialog'
import { ASSET_TYPE_LABELS } from '@/features/assets/labels'
import { useEntities } from '@/features/entities/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { ObjectivesList } from '@/features/objectives/ObjectivesList'
import {
  BackButton,
  Field,
  LoadMoreButton,
  NotFound,
  useLoadMore,
} from '@/routes/detail/detailShared'

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
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
  const [deleteOpen, setDeleteOpen] = React.useState(false)

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
            <h1 className="text-2xl font-semibold tracking-tight">
              {asset.symbol}
              {asset.deleted_at && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · Eliminado
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">{asset.name}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={Boolean(asset.deleted_at)}
            >
              <PencilIcon className="size-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={Boolean(asset.deleted_at)}
            >
              <Trash2Icon className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>

        <dl className="bg-card rounded-xl border p-4">
          <Field label="Símbolo">{asset.symbol}</Field>
          <Field label="Nombre">{asset.name}</Field>
          <Field label="Tipo">{ASSET_TYPE_LABELS[asset.asset_type]}</Field>
          <Field label="Moneda">{asset.currency}</Field>
          {asset.isin && <Field label="ISIN">{asset.isin}</Field>}
          {asset.exchange && <Field label="Mercado">{asset.exchange}</Field>}
        </dl>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Posiciones con este activo
          </h2>
          {assetHoldings.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              No tienes posiciones abiertas de este activo.
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {assetHoldings.map((h) => {
                const entity = entityMap.get(h.entity_id)
                const currency = entity?.currency ?? asset.currency
                return (
                  <Link
                    key={h.id}
                    to={`/holdings/${h.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entity?.name ?? '—'}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {h.quantity} · medio{' '}
                        {formatMoney(h.average_price, currency)}
                      </p>
                    </div>
                    <div className="shrink-0 text-sm tabular-nums">
                      {formatMoney(h.invested_amount, currency)}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {portfolioId && (
          <ObjectivesList
            portfolioId={portfolioId}
            assetId={asset.id}
            entityId={null}
            scope="asset"
            currency={asset.currency}
          />
        )}

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
      <DeleteAssetDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          refresh(o)
        }}
        asset={asset}
      />
    </>
  )
}
