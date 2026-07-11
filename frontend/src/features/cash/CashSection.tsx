import * as React from 'react'
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatMoney } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useCashTransactions } from '@/features/cash/hooks'
import { CashTransactionFormDialog } from '@/features/cash/CashTransactionFormDialog'
import { DeleteCashTransactionDialog } from '@/features/cash/DeleteCashTransactionDialog'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import type { CashTransaction, CashTransactionType } from '@/features/cash/api'
import type { Entity } from '@/features/entities/api'

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

export function CashSection({ portfolioId }: { portfolioId: string }) {
  const {
    data: transactions = [],
    isLoading,
    error,
  } = useCashTransactions(portfolioId)
  const { data: entities = [] } = useEntities(portfolioId)

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CashTransaction | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<CashTransaction | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(tx: CashTransaction) {
    setEditing(tx)
    setFormOpen(true)
  }

  function openDelete(tx: CashTransaction) {
    setDeleting(tx)
    setDeleteOpen(true)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Efectivo</h2>
          <p className="text-muted-foreground text-xs">
            Ingresos, retiradas, transferencias y ajustes.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Añadir
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando movimientos…</p>
      )}

      {error && (
        <p className="text-destructive text-sm">
          Error al cargar movimientos: {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Aún no hay movimientos de efectivo en esta cartera.
        </div>
      )}

      {transactions.length > 0 && (
        <div className="divide-y rounded-xl border">
          {transactions.map((tx) => (
            <CashRow
              key={tx.id}
              tx={tx}
              entityMap={entityMap}
              onEdit={() => openEdit(tx)}
              onDelete={() => openDelete(tx)}
            />
          ))}
        </div>
      )}

      <CashTransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        portfolioId={portfolioId}
        transaction={editing}
      />
      <DeleteCashTransactionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        portfolioId={portfolioId}
        transaction={deleting}
      />
    </section>
  )
}

function CashRow({
  tx,
  entityMap,
  onEdit,
  onDelete,
}: {
  tx: CashTransaction
  entityMap: Map<string, Entity>
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = TYPE_ICON[tx.transaction_type]
  const from = tx.from_entity_id ? entityMap.get(tx.from_entity_id) : null
  const to = tx.to_entity_id ? entityMap.get(tx.to_entity_id) : null

  let route: string
  let sign: '+' | '-' | '' = ''
  let signClass = ''
  switch (tx.transaction_type) {
    case 'TRANSFER':
      route = `${from?.name ?? '—'} → ${to?.name ?? '—'}`
      break
    case 'DEPOSIT':
      route = `Exterior → ${to?.name ?? '—'}`
      sign = '+'
      signClass = 'text-positive'
      break
    case 'WITHDRAWAL':
      route = `${from?.name ?? '—'} → Exterior`
      sign = '-'
      signClass = 'text-negative'
      break
    case 'ADJUSTMENT':
      route = to ? `Ajuste · ${to.name}` : `Ajuste · ${from?.name ?? '—'}`
      sign = to ? '+' : '-'
      signClass = to ? 'text-positive' : 'text-negative'
      break
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{route}</p>
        <p className="text-muted-foreground text-xs">
          {CASH_TYPE_LABELS[tx.transaction_type]} ·{' '}
          {dateFmt.format(new Date(tx.executed_at))}
          {tx.notes ? ` · ${tx.notes}` : ''}
        </p>
      </div>
      <div className={`shrink-0 text-sm font-medium tabular-nums ${signClass}`}>
        {sign}
        {formatMoney(tx.amount, tx.currency)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones del movimiento"
          >
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
