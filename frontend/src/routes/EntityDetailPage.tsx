import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  ChartPieIcon,
  PlusIcon,
  ReceiptTextIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { entityKey, useEntity, useAllEntities } from '@/features/entities/hooks'
import { EntityFormDialog } from '@/features/entities/EntityFormDialog'
import { useCashTransactions } from '@/features/cash/hooks'
import { CashTransactionFormDialog } from '@/features/cash/CashTransactionFormDialog'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import type { CashTransactionType } from '@/features/cash/api'
import { useAllAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { HoldingCard } from '@/features/holdings/HoldingCard'
import { groupByAssetType } from '@/features/assets/grouping'
import { useInvestmentTransactions } from '@/features/investments/hooks'
import { InvestmentFormDialog } from '@/features/investments/InvestmentFormDialog'
import {
  BackButton,
  EditButton,
  LoadMoreButton,
  NotFound,
  useLoadMore,
} from '@/routes/detail/detailShared'
import { buildPatrimonioTimeline } from '@/features/portfolios/patrimonio'
import { GrowthChart } from '@/components/charts/GrowthChart'
import { RealizedPnLPanel } from '@/components/charts/RealizedPnLPanel'
import { TaxAnalysisPanel } from '@/components/charts/TaxAnalysisPanel'
import { LatentTaxPanel } from '@/components/charts/LatentTaxPanel'
import { useProfile } from '@/features/profile/hooks'
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
  hour: '2-digit',
  minute: '2-digit',
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
  const { data: profile } = useProfile()

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
  const [cashFormOpen, setCashFormOpen] = React.useState(false)
  const [invFormOpen, setInvFormOpen] = React.useState(false)
  const [analysisOpen, setAnalysisOpen] = React.useState(false)
  const [taxOpen, setTaxOpen] = React.useState(false)
  const [taxView, setTaxView] = React.useState<'today' | 'realized'>('today')

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
  const holdingGroups = React.useMemo(
    () =>
      groupByAssetType(holdings, (h) => assetMap.get(h.asset_id)?.asset_type),
    [holdings, assetMap],
  )

  const entityCash = React.useMemo(
    () =>
      cashTxs.filter((t) => t.from_entity_id === id || t.to_entity_id === id),
    [cashTxs, id],
  )

  const isBrokerMov = entity?.type === 'BROKER'
  const movements = React.useMemo(() => {
    type Mov =
      | { kind: 'inv'; at: number; tx: (typeof investmentTxs)[number] }
      | { kind: 'cash'; at: number; tx: (typeof entityCash)[number] }
    const out: Mov[] = []
    if (isBrokerMov) {
      for (const t of investmentTxs)
        out.push({ kind: 'inv', at: new Date(t.executed_at).getTime(), tx: t })
    }
    for (const t of entityCash)
      out.push({ kind: 'cash', at: new Date(t.executed_at).getTime(), tx: t })
    out.sort((a, b) => b.at - a.at)
    return out
  }, [isBrokerMov, investmentTxs, entityCash])
  const movPaged = useLoadMore(movements)

  const emptyRates = React.useMemo(() => new Map<string, number>(), [])
  const revaluations = React.useMemo(() => {
    const out: { at: number; delta: number }[] = []
    for (const h of holdings) {
      const a = assetMap.get(h.asset_id)
      if (!a || a.manual_price == null) continue
      const delta = h.quantity * a.manual_price - h.invested_amount
      const at = a.manual_price_at
        ? new Date(a.manual_price_at).getTime()
        : Date.now()
      out.push({ at, delta })
    }
    return out
  }, [holdings, assetMap])
  const markers = React.useMemo(
    () => revaluations.map((r) => r.at),
    [revaluations],
  )
  const timeline = React.useMemo(() => {
    if (!entity) return []
    return buildPatrimonioTimeline({
      entities: [entity],
      cashTxs,
      invTxs: investmentTxs,
      base: entity.currency,
      rateMap: emptyRates,
      revaluations,
    })
  }, [entity, cashTxs, investmentTxs, emptyRates, revaluations])
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

  // Valoración estimada de las posiciones con el precio manual (si existe);
  // las que no tienen precio se cuentan a coste. Alimenta el balance del bróker.
  const investedCost = holdings.reduce((s, h) => s + h.invested_amount, 0)
  const estimatedInv = holdings.reduce((s, h) => {
    const p = assetMap.get(h.asset_id)?.manual_price
    return s + (p != null ? h.quantity * p : h.invested_amount)
  }, 0)
  const hasPrices = holdings.some(
    (h) => assetMap.get(h.asset_id)?.manual_price != null,
  )
  const latentPnl = estimatedInv - investedCost
  const latentPct = investedCost > 0 ? (latentPnl / investedCost) * 100 : null
  const balanceTotal = entity.cash_balance_cache + estimatedInv

  // Posiciones con precio manual, para el escenario "si vendieras hoy".
  const latentPositions = holdings.flatMap((h) => {
    const a = assetMap.get(h.asset_id)
    if (!a || a.manual_price == null) return []
    return [
      {
        symbol: a.symbol,
        latent: h.quantity * a.manual_price - h.invested_amount,
      },
    ]
  })

  return (
    <>
      <BackButton />

      <div className="space-y-8">
        <section className="bg-card space-y-6 rounded-xl border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-4">
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
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  {entity.name}
                  {entity.deleted_at && (
                    <span className="text-muted-foreground text-sm font-normal">
                      · Eliminado
                    </span>
                  )}
                  <EditButton onClick={() => setEditOpen(true)} />
                </h1>
                <p className="text-muted-foreground text-sm">
                  {entity.type === 'BANK' ? 'Banco' : 'Bróker'} ·{' '}
                  {entity.currency}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatMoney(balanceTotal, entity.currency)}
                </p>
                {isBroker && holdings.length > 0 && (
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    Efectivo{' '}
                    {formatMoney(entity.cash_balance_cache, entity.currency)} ·
                    Invertido {formatMoney(estimatedInv, entity.currency)}
                  </p>
                )}
                {isBroker && hasPrices && (
                  <p className="mt-0.5 text-xs">
                    <span className="text-muted-foreground">
                      Coste inversión{' '}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatMoney(investedCost, entity.currency)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      · Rendimiento{' '}
                    </span>
                    <span
                      className={`tabular-nums ${latentPnl >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {latentPnl >= 0 ? '+' : ''}
                      {formatMoney(latentPnl, entity.currency)}
                      {latentPct != null &&
                        ` (${latentPnl >= 0 ? '+' : ''}${latentPct.toFixed(1)}%)`}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {isBroker && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setTaxOpen(true)}
                >
                  <ReceiptTextIcon className="size-4" />
                  Impuestos
                </Button>
              )}
              {isBroker && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setAnalysisOpen(true)}
                >
                  <ChartPieIcon className="size-4" />
                  Análisis
                </Button>
              )}
            </div>
          </div>

          <GrowthChart
            points={timeline}
            base={entity.currency}
            markers={markers}
          />
        </section>

        {isBroker && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Posiciones
              </h2>
              <Button
                size="sm"
                onClick={() => setInvFormOpen(true)}
                disabled={Boolean(entity.deleted_at)}
              >
                <PlusIcon className="size-4" />
                Operar
              </Button>
            </div>
            {holdings.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Sin posiciones abiertas en este bróker.
              </div>
            ) : (
              holdingGroups.map((group) => (
                <div key={group.type} className="space-y-3">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((h) => (
                      <HoldingCard
                        key={h.id}
                        holding={h}
                        asset={assetMap.get(h.asset_id)}
                        subtitle={entity.name}
                        currency={entity.currency}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Movimientos
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCashFormOpen(true)}
              disabled={Boolean(entity.deleted_at)}
            >
              <ArrowRightLeftIcon className="size-4" />
              Mover efectivo
            </Button>
          </div>
          {movements.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Sin movimientos registrados.
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {movPaged.visible.map((m) => {
                if (m.kind === 'inv') {
                  const t = m.tx
                  const asset = assetMap.get(t.asset_id)
                  const isBuy = t.transaction_type === 'BUY'
                  const net = isBuy
                    ? t.gross_amount + t.fees + t.taxes
                    : t.gross_amount - t.fees - t.taxes
                  return (
                    <Link
                      key={`inv-${t.id}`}
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
                }
                const t = m.tx
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
                    key={`cash-${t.id}`}
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
              {movPaged.hasMore && (
                <LoadMoreButton
                  remaining={movPaged.remaining}
                  onClick={movPaged.showMore}
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

      {isBroker && (
        <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
          <DialogContent className="flex max-h-[85vh] flex-col">
            <DialogHeader>
              <DialogTitle>Análisis de {entity.name}</DialogTitle>
            </DialogHeader>
            <div className="-mr-2 space-y-6 overflow-y-auto pr-2">
              <div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Rentabilidad realizada
                </p>
                <RealizedPnLPanel
                  invTxs={investmentTxs}
                  base={entity.currency}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isBroker && (
        <Dialog open={taxOpen} onOpenChange={setTaxOpen}>
          <DialogContent className="flex max-h-[85vh] flex-col">
            <DialogHeader>
              <DialogTitle>Impuestos de {entity.name}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-1">
              {(
                [
                  { key: 'today', label: 'Si vendieras hoy' },
                  { key: 'realized', label: 'Realizado' },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setTaxView(v.key)}
                  className={
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                    (taxView === v.key
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50')
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="-mr-2 overflow-y-auto pr-2">
              {taxView === 'today' ? (
                <LatentTaxPanel
                  positions={latentPositions}
                  currency={entity.currency}
                  defaultRegime={profile?.tax_regime ?? 'ES'}
                />
              ) : (
                <TaxAnalysisPanel
                  invTxs={investmentTxs}
                  currency={entity.currency}
                  defaultRegime={profile?.tax_regime ?? 'ES'}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
