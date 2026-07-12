import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/currencies'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { useAllEntities } from '@/features/entities/hooks'
import { cashTransactionKey, useCashTransaction } from '@/features/cash/hooks'
import { CashTransactionFormDialog } from '@/features/cash/CashTransactionFormDialog'
import { DeleteCashTransactionDialog } from '@/features/cash/DeleteCashTransactionDialog'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import type { CashTransactionType } from '@/features/cash/api'
import { BackButton, Field, NotFound } from '@/routes/detail/detailShared'

const TYPE_ICON: Record<
  CashTransactionType,
  React.ComponentType<{ className?: string }>
> = {
  TRANSFER: ArrowRightLeftIcon,
  DEPOSIT: ArrowDownLeftIcon,
  WITHDRAWAL: ArrowUpRightIcon,
  ADJUSTMENT: SlidersHorizontalIcon,
}

const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function CashTransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { currentPortfolio } = useCurrentPortfolio()
  const portfolioId = currentPortfolio?.id ?? null
  const { data: tx, isLoading } = useCashTransaction(id)
  const { data: entities = [] } = useAllEntities(portfolioId)

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  function refresh(open: boolean) {
    if (!open && id) {
      queryClient.invalidateQueries({ queryKey: cashTransactionKey(id) })
    }
  }

  const entName = (eid: string | null) => {
    if (!eid) return 'Exterior'
    const e = entities.find((x) => x.id === eid)
    if (!e) return '—'
    return e.deleted_at ? `${e.name} · Eliminado` : e.name
  }

  if (isLoading) {
    return (
      <>
        <BackButton />
        <p className="text-muted-foreground text-sm">Cargando movimiento…</p>
      </>
    )
  }

  if (!tx) {
    return (
      <>
        <BackButton />
        <NotFound message="Este movimiento ya no existe." />
      </>
    )
  }

  const Icon = TYPE_ICON[tx.transaction_type]

  return (
    <>
      <BackButton />

      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatMoney(tx.amount, tx.currency)}
            </h1>
            <p className="text-muted-foreground text-sm">
              {CASH_TYPE_LABELS[tx.transaction_type]}
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
          <Field label="Tipo">{CASH_TYPE_LABELS[tx.transaction_type]}</Field>
          <Field label="Origen">{entName(tx.from_entity_id)}</Field>
          <Field label="Destino">{entName(tx.to_entity_id)}</Field>
          <Field label="Importe">{formatMoney(tx.amount, tx.currency)}</Field>
          {tx.to_amount != null && (
            <Field label="Importe recibido">
              {formatMoney(tx.to_amount, tx.currency)}
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
          <CashTransactionFormDialog
            open={editOpen}
            onOpenChange={(o) => {
              setEditOpen(o)
              refresh(o)
            }}
            portfolioId={portfolioId}
            transaction={tx}
          />
          <DeleteCashTransactionDialog
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
