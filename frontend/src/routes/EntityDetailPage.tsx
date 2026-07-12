import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { entityKey, useEntity, useAllEntities } from '@/features/entities/hooks'
import { EntityFormDialog } from '@/features/entities/EntityFormDialog'
import { DeleteEntityDialog } from '@/features/entities/DeleteEntityDialog'
import { useCashTransactions } from '@/features/cash/hooks'
import { CashTransactionFormDialog } from '@/features/cash/CashTransactionFormDialog'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import type { CashTransactionType } from '@/features/cash/api'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { InvestmentFormDialog } from '@/features/investments/InvestmentFormDialog'
import {
  BackButton,
  LoadMoreButton,
  NotFound,
  useLoadMore,
} from '@/routes/detail/detailShared'
const TYPE_ICON: Record<
  CashTransactionType,
  React.ComponentType<{ className?: string }>
> = {
  TRANSFER: ArrowRightLeftIcon,
  DEPOSIT: ArrowDownLeftIcon,
  WITHDRAWAL: ArrowUpRightIcon,
  ADJUSTMENT: SlidersHorizontalIcon,
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null
  const { data: entity, isLoading } = useEntity(id)
  const { data: allEntities = [] } = useAllEntities(portfolioId)
  const { data: cashTxs = [] } = useCashTransactions(portfolioId)
  const { data: assets = [] } = useAllAssets()

  const isBroker = entity?.type === 'BROKER'
  const brokerIds = React.useMemo(() => (id ? [id] : []), [id])
  const { data: holdings = [] } = useHoldings(
    isBroker ? portfolioId : null,
    brokerIds,
  )
  const { data: investmentTxs = [] } = useInvestmentTransactions(
    isBroker ? portfolioId : null,
    brokerIds,
  )

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [cashFormOpen, setCashFormOpen] = React.useState(false)
  const [invFormOpen, setInvFormOpen] = React.useState(false)

  function refresh(open: boolean) {
    if (!open && id) {
      queryClient.invalidateQueries({ queryKey: entityKey(id) })
    }
  }

  const entityMap = React.useMemo(
    () => new Map(allEntities.map((e) => [e.id, e])),
    [allEntities],
  )
  const assetMap = React.useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  )

  const entityCash = React.useMemo(
    () =>
      cashTxs.filter((t) => t.from_entity_id === id || t.to_entity_id === id),
    [cashTxs, id],
  )

  const invPaged = useLoadMore(investmentTxs)
  const cashPaged = useLoadMore(entityCash)

  if (isLoading) {
    return (
      <>
        <BackButton />
        <p className="text-muted-foreground text-sm">Cargando entidad…</p>
      </>
    )
  }

  if (!entity) {
    return (
      <>
        <BackButton />
        <NotFound message="Esta entidad ya no existe." />
      </>
    )
  }

  const entName = (eid: string | null) => {
    if (!eid) return 'Exterior'
    const e = entityMap.get(eid)
    if (!e) return '—'
    return e.deleted_at ? `${e.name} · Eliminado` : e.name
  }

  return (
    <>
      <BackButton />

      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <span style={brandStyle(entity.color)}>
            <BrandIcon
              name={entity.name}
              domain={entity.icon_domain}
              className={
                entity.color
                  ? 'bg-brand text-brand-foreground size-12'
                  : 'size-12'
              }
            />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {entity.name}
              {entity.deleted_at && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · Eliminado
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {entity.type === 'BANK' ? 'Banco' : 'Bróker'} · {entity.currency}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMoney(entity.cash_balance_cache, entity.currency)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon className="size-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>

        {isBroker && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Posiciones</h2>
            {holdings.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Sin posiciones abiertas en este bróker.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {holdings.map((h) => {
                  const asset = assetMap.get(h.asset_id)
                  return (
                    <Link
                      key={h.id}
                      to={`/holdings/${h.id}`}
                      style={brandStyle(asset?.color ?? null)}
                      className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4"
                    >
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
                        <p className="truncate text-sm font-medium">
                          {asset?.symbol ?? '—'}
                          {asset?.deleted_at ? ' · Eliminado' : ''}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {h.quantity} ·{' '}
                          {formatMoney(h.average_price, entity.currency)}
                        </p>
                      </div>
                      <div className="shrink-0 text-sm tabular-nums">
                        {formatMoney(h.invested_amount, entity.currency)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {isBroker && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Movimientos de inversión
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInvFormOpen(true)}
                disabled={Boolean(entity.deleted_at)}
              >
                <PlusIcon className="size-4" />
                Operar
              </Button>
            </div>
            {investmentTxs.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Sin compras ni ventas registradas.
              </div>
            ) : (
              <div className="divide-y rounded-xl border">
                {invPaged.visible.map((t) => {
                  const asset = assetMap.get(t.asset_id)
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
                          {isBuy ? 'Compra' : 'Venta'} · {asset?.symbol ?? '—'}
                          {asset?.deleted_at ? ' · Eliminado' : ''}
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
                {invPaged.hasMore && (
                  <LoadMoreButton
                    remaining={invPaged.remaining}
                    onClick={invPaged.showMore}
                  />
                )}
              </div>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Movimientos de efectivo
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCashFormOpen(true)}
              disabled={Boolean(entity.deleted_at)}
            >
              <PlusIcon className="size-4" />
              Añadir
            </Button>
          </div>
          {entityCash.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Sin movimientos de efectivo.
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {cashPaged.visible.map((t) => {
                const Icon = TYPE_ICON[t.transaction_type]
                const incoming = t.to_entity_id === id
                const showAmount =
                  incoming && t.to_amount != null ? t.to_amount : t.amount
                let sign: '+' | '-' | '' = ''
                let signClass = ''
                if (t.transaction_type === 'DEPOSIT') {
                  sign = '+'
                  signClass = 'text-positive'
                } else if (t.transaction_type === 'WITHDRAWAL') {
                  sign = '-'
                  signClass = 'text-negative'
                } else if (t.transaction_type === 'TRANSFER') {
                  sign = incoming ? '+' : '-'
                  signClass = incoming ? 'text-positive' : 'text-negative'
                } else if (t.transaction_type === 'ADJUSTMENT') {
                  sign = incoming ? '+' : '-'
                  signClass = incoming ? 'text-positive' : 'text-negative'
                }
                const other =
                  t.transaction_type === 'TRANSFER'
                    ? incoming
                      ? entName(t.from_entity_id)
                      : entName(t.to_entity_id)
                    : CASH_TYPE_LABELS[t.transaction_type]
                return (
                  <Link
                    key={t.id}
                    to={`/cash/${t.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 p-4"
                  >
                    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{other}</p>
                      <p className="text-muted-foreground text-xs">
                        {CASH_TYPE_LABELS[t.transaction_type]} ·{' '}
                        {dateFmt.format(new Date(t.executed_at))}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-medium tabular-nums ${signClass}`}
                    >
                      {sign}
                      {formatMoney(showAmount, entity.currency)}
                    </div>
                  </Link>
                )
              })}
              {cashPaged.hasMore && (
                <LoadMoreButton
                  remaining={cashPaged.remaining}
                  onClick={cashPaged.showMore}
                />
              )}
            </div>
          )}
        </section>
      </div>

      {portfolioId && (
        <>
          <EntityFormDialog
            open={editOpen}
            onOpenChange={(o) => {
              setEditOpen(o)
              refresh(o)
            }}
            portfolioId={portfolioId}
            entity={entity}
          />
          <DeleteEntityDialog
            open={deleteOpen}
            onOpenChange={(o) => {
              setDeleteOpen(o)
              refresh(o)
            }}
            portfolioId={portfolioId}
            entity={entity}
          />
          <CashTransactionFormDialog
            open={cashFormOpen}
            onOpenChange={setCashFormOpen}
            portfolioId={portfolioId}
            transaction={null}
            defaultEntityId={id}
          />
          {isBroker && (
            <InvestmentFormDialog
              open={invFormOpen}
              onOpenChange={setInvFormOpen}
              portfolioId={portfolioId}
              transaction={null}
              defaultEntityId={id}
            />
          )}
        </>
      )}
    </>
  )
}
