import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { useHolding } from '@/features/holdings/hooks'
import { useAsset } from '@/features/assets/hooks'
import { unitLabel } from '@/features/assets/labels'
import { useEntity } from '@/features/entities/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { ObjectivesList } from '@/features/objectives/ObjectivesList'
import { InvestmentFormDialog } from '@/features/investments/InvestmentFormDialog'
import { PlusIcon } from 'lucide-react'
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
  hour: '2-digit',
  minute: '2-digit',
})

export function HoldingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null
  const { data: holding, isLoading } = useHolding(id)
  const { data: asset } = useAsset(holding?.asset_id)
  const { data: entity } = useEntity(holding?.entity_id)

  const entityIds = React.useMemo(
    () => (holding ? [holding.entity_id] : []),
    [holding],
  )
  const { data: transactions = [] } = useInvestmentTransactions(
    portfolioId,
    entityIds,
  )

  const [formOpen, setFormOpen] = React.useState(false)
  const assetTxs = transactions.filter((t) => t.asset_id === holding?.asset_id)
  const txPaged = useLoadMore(assetTxs)

  if (isLoading) {
    return (
      <>
        <BackButton />
        <p className="text-muted-foreground text-sm">Cargando posición…</p>
      </>
    )
  }

  if (!holding) {
    return (
      <>
        <BackButton />
        <NotFound message="Esta posición ya no existe." />
      </>
    )
  }

  const currency = entity?.currency ?? asset?.currency ?? 'EUR'
  const price = asset?.manual_price ?? null
  const estValue = price != null ? holding.quantity * price : null
  const pnl = estValue != null ? estValue - holding.invested_amount : null
  const pnlPct =
    pnl != null && holding.invested_amount > 0
      ? (pnl / holding.invested_amount) * 100
      : null

  return (
    <>
      <BackButton />

      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <span style={brandStyle(asset?.color ?? null)}>
            <BrandIcon
              name={asset?.symbol ?? '?'}
              domain={asset?.icon_domain ?? null}
              className={
                asset?.color
                  ? 'bg-brand text-brand-foreground size-12'
                  : 'size-12'
              }
            />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {asset ? (
                <Link to={`/assets/${asset.id}`} className="hover:underline">
                  {asset.symbol}
                </Link>
              ) : (
                '—'
              )}
              {asset?.deleted_at && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · Eliminado
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {entity ? (
                <Link to={`/entities/${entity.id}`} className="hover:underline">
                  {entity.name}
                </Link>
              ) : (
                '—'
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PlusIcon className="size-4" />
            Operar
          </Button>
        </div>

        <dl className="bg-card rounded-xl border p-4">
          <Field label={unitLabel(asset?.asset_type)}>{holding.quantity}</Field>
          <Field label="Invertido (coste)">
            {formatMoney(holding.invested_amount, currency)}
          </Field>
          <Field label="Precio medio">
            {formatMoney(holding.average_price, currency)}
          </Field>
          {price != null && (
            <>
              <Field label="Precio actual">
                {formatMoney(price, currency)}
              </Field>
              <Field label="Valor estimado">
                {formatMoney(estValue!, currency)}
              </Field>
              <Field label="Rendimiento">
                <span className={pnl! >= 0 ? 'text-positive' : 'text-negative'}>
                  {pnl! >= 0 ? '+' : ''}
                  {formatMoney(pnl!, currency)}
                  {pnlPct != null &&
                    ` (${pnl! >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`}
                </span>
              </Field>
            </>
          )}
        </dl>

        {portfolioId && (
          <ObjectivesList
            portfolioId={portfolioId}
            assetId={holding.asset_id}
            entityId={holding.entity_id}
            scope="entity"
            currency={currency}
          />
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Operaciones</h2>
          {assetTxs.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Sin operaciones registradas.
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
                        {isBuy ? 'Compra' : 'Venta'}
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

      {portfolioId && (
        <InvestmentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          portfolioId={portfolioId}
          transaction={null}
          defaultEntityId={holding.entity_id}
          defaultAssetId={holding.asset_id}
        />
      )}
    </>
  )
}
