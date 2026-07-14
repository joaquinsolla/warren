import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  SlidersHorizontalIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { useAllEntities } from '@/features/entities/hooks'
import { useCashTransactions } from '@/features/cash/hooks'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import { useAllAssets } from '@/features/assets/hooks'
import {
  BackButton,
  LoadMoreButton,
  NotFound,
  useLoadMore,
} from '@/routes/detail/detailShared'
import type { CashTransactionType } from '@/features/cash/api'

const CASH_ICON: Record<
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
  hour: '2-digit',
  minute: '2-digit',
})

type Filter = 'all' | 'cash' | 'inv'

export function HistoryPage() {
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null

  const { data: entities = [] } = useAllEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: cashTxs = [] } = useCashTransactions(portfolioId)
  const { data: invTxs = [] } = useInvestmentTransactions(
    portfolioId,
    entityIds,
  )
  const { data: assets = [] } = useAllAssets()

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const assetMap = React.useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  )

  const [filter, setFilter] = React.useState<Filter>('all')

  const movements = React.useMemo(() => {
    type Mov =
      | { kind: 'inv'; at: number; tx: (typeof invTxs)[number] }
      | { kind: 'cash'; at: number; tx: (typeof cashTxs)[number] }
    const out: Mov[] = []
    if (filter !== 'cash') {
      for (const t of invTxs)
        out.push({ kind: 'inv', at: new Date(t.executed_at).getTime(), tx: t })
    }
    if (filter !== 'inv') {
      for (const t of cashTxs)
        out.push({ kind: 'cash', at: new Date(t.executed_at).getTime(), tx: t })
    }
    out.sort((a, b) => b.at - a.at)
    return out
  }, [filter, invTxs, cashTxs])

  const paged = useLoadMore(movements, 20)

  function entName(id: string | null): string {
    if (!id) return '—'
    return entityMap.get(id)?.name ?? 'Entidad eliminada'
  }

  if (!currentPortfolio) {
    return (
      <>
        <BackButton />
        <NotFound message="No hay ninguna cartera seleccionada." />
      </>
    )
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'cash', label: 'Efectivo' },
    { key: 'inv', label: 'Inversiones' },
  ]

  return (
    <>
      <BackButton />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <ClockIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
            <p className="text-muted-foreground text-sm">
              Todos los movimientos de {currentPortfolio.name}.
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                (filter === f.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50')
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {movements.length === 0 ? (
          <NotFound message="Sin movimientos registrados." />
        ) : (
          <div className="divide-y rounded-xl border">
            {paged.visible.map((m) => {
              if (m.kind === 'inv') {
                const t = m.tx
                const asset = assetMap.get(t.asset_id)
                const isBuy = t.transaction_type === 'BUY'
                const net = isBuy
                  ? t.gross_amount + t.fees + t.taxes
                  : t.gross_amount - t.fees - t.taxes
                const Icon = isBuy ? TrendingDownIcon : TrendingUpIcon
                return (
                  <Link
                    key={`inv-${t.id}`}
                    to={`/investments/${t.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 p-4"
                  >
                    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {isBuy ? 'Compra' : 'Venta'} · {asset?.symbol ?? '—'}
                        {asset?.deleted_at ? ' · Eliminado' : ''}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {t.quantity} ×{' '}
                        {formatMoney(t.price_per_unit, t.currency)} ·{' '}
                        {entName(t.entity_id)} ·{' '}
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
              }

              const t = m.tx
              const Icon = CASH_ICON[t.transaction_type]
              const cur =
                entityMap.get(t.to_entity_id ?? t.from_entity_id ?? '')
                  ?.currency ?? 'EUR'
              let sign: '+' | '-' | '' = ''
              let signClass = 'text-muted-foreground'
              let title: string
              if (t.transaction_type === 'DEPOSIT') {
                sign = '+'
                signClass = 'text-positive'
                title = `Ingreso · ${entName(t.to_entity_id)}`
              } else if (t.transaction_type === 'WITHDRAWAL') {
                sign = '-'
                signClass = 'text-negative'
                title = `Retirada · ${entName(t.from_entity_id)}`
              } else if (t.transaction_type === 'TRANSFER') {
                title = `${entName(t.from_entity_id)} → ${entName(t.to_entity_id)}`
              } else {
                const add = Boolean(t.to_entity_id)
                sign = add ? '+' : '-'
                signClass = add ? 'text-positive' : 'text-negative'
                title = `Ajuste · ${entName(t.to_entity_id ?? t.from_entity_id)}`
              }
              return (
                <Link
                  key={`cash-${t.id}`}
                  to={`/cash/${t.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 p-4"
                >
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="text-muted-foreground text-xs">
                      {CASH_TYPE_LABELS[t.transaction_type]} ·{' '}
                      {dateFmt.format(new Date(t.executed_at))}
                    </p>
                  </div>
                  <div
                    className={`shrink-0 text-sm font-medium tabular-nums ${signClass}`}
                  >
                    {sign}
                    {formatMoney(t.amount, cur)}
                  </div>
                </Link>
              )
            })}
            {paged.hasMore && (
              <LoadMoreButton
                remaining={paged.remaining}
                onClick={paged.showMore}
              />
            )}
          </div>
        )}
      </div>
    </>
  )
}
