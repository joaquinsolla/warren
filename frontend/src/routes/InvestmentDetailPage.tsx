import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { useAsset } from '@/features/assets/hooks'
import { useEntity } from '@/features/entities/hooks'
import {
  investmentTransactionKey,
  useInvestmentTransaction,
} from '@/features/investments/hooks'
import { InvestmentFormDialog } from '@/features/investments/InvestmentFormDialog'
import { DeleteInvestmentDialog } from '@/features/investments/DeleteInvestmentDialog'
import { BackButton, Field, NotFound } from '@/routes/detail/detailShared'

const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null
  const { data: tx, isLoading } = useInvestmentTransaction(id)
  const { data: asset } = useAsset(tx?.asset_id)
  const { data: entity } = useEntity(tx?.entity_id)

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  function refresh(open: boolean) {
    if (!open && id) {
      queryClient.invalidateQueries({ queryKey: investmentTransactionKey(id) })
    }
  }

  if (isLoading) {
    return (
      <>
        <BackButton />
        <p className="text-muted-foreground text-sm">Cargando operación…</p>
      </>
    )
  }

  if (!tx) {
    return (
      <>
        <BackButton />
        <NotFound message="Esta operación ya no existe." />
      </>
    )
  }

  const isBuy = tx.transaction_type === 'BUY'
  const net = isBuy
    ? tx.gross_amount + tx.fees + tx.taxes
    : tx.gross_amount - tx.fees - tx.taxes

  return (
    <>
      <BackButton />

      <div className="space-y-6">
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
              {isBuy ? 'Compra' : 'Venta'} · {asset?.symbol ?? '—'}
              {asset?.deleted_at && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · Eliminado
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {asset ? (
                <Link to={`/assets/${asset.id}`} className="hover:underline">
                  {asset.name}
                </Link>
              ) : (
                '—'
              )}
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

        <dl className="bg-card rounded-xl border p-4">
          <Field label="Operación">{isBuy ? 'Compra' : 'Venta'}</Field>
          <Field label="Entidad">
            {entity ? (
              <Link to={`/entities/${entity.id}`} className="hover:underline">
                {entity.name}
                {entity.deleted_at ? ' · Eliminado' : ''}
              </Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Cantidad">{tx.quantity}</Field>
          <Field label="Precio unitario">
            {formatMoney(tx.price_per_unit, tx.currency)}
          </Field>
          <Field label="Importe bruto">
            {formatMoney(tx.gross_amount, tx.currency)}
          </Field>
          <Field label="Comisiones">{formatMoney(tx.fees, tx.currency)}</Field>
          <Field label="Impuestos">{formatMoney(tx.taxes, tx.currency)}</Field>
          <Field label={isBuy ? 'Coste total' : 'Importe neto'}>
            {formatMoney(net, tx.currency)}
          </Field>
          {tx.remaining_quantity != null && isBuy && (
            <Field label="Cantidad pendiente (FIFO)">
              {tx.remaining_quantity}
            </Field>
          )}
          {tx.exchange_rate_to_base != null && (
            <Field label="Tipo a moneda base">{tx.exchange_rate_to_base}</Field>
          )}
          <Field label="Fecha">
            {dateTimeFmt.format(new Date(tx.executed_at))}
          </Field>
          {tx.notes && <Field label="Notas">{tx.notes}</Field>}
        </dl>
      </div>

      {portfolioId && (
        <>
          <InvestmentFormDialog
            open={editOpen}
            onOpenChange={(o) => {
              setEditOpen(o)
              refresh(o)
            }}
            portfolioId={portfolioId}
            transaction={tx}
          />
          <DeleteInvestmentDialog
            open={deleteOpen}
            onOpenChange={(o) => {
              setDeleteOpen(o)
              refresh(o)
            }}
            portfolioId={portfolioId}
            transaction={tx}
          />
        </>
      )}
    </>
  )
}
