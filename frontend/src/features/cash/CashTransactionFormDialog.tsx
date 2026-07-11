import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import {
  useCreateCashTransaction,
  useUpdateCashTransaction,
} from '@/features/cash/hooks'
import { CASH_TYPE_LABELS, CASH_TYPE_ORDER } from '@/features/cash/labels'
import type {
  CashTransaction,
  CashTransactionType,
} from '@/features/cash/api'
import type { Entity } from '@/features/entities/api'

type AdjustDirection = 'ADD' | 'SUBTRACT'

type CashTransactionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  transaction?: CashTransaction | null
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function toIsoFromDateInput(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString()
}

export function CashTransactionFormDialog({
  open,
  onOpenChange,
  portfolioId,
  transaction,
}: CashTransactionFormDialogProps) {
  const isEdit = Boolean(transaction)
  const { data: entities = [] } = useEntities(portfolioId)
  const createMutation = useCreateCashTransaction(portfolioId)
  const updateMutation = useUpdateCashTransaction(portfolioId)

  const [type, setType] = React.useState<CashTransactionType>('DEPOSIT')
  const [fromId, setFromId] = React.useState<string>('')
  const [toId, setToId] = React.useState<string>('')
  const [adjustId, setAdjustId] = React.useState<string>('')
  const [adjustDir, setAdjustDir] = React.useState<AdjustDirection>('ADD')
  const [amount, setAmount] = React.useState('')
  const [executedAt, setExecutedAt] = React.useState(todayInputValue())
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setAmount(transaction ? String(transaction.amount) : '')
    setNotes(transaction?.notes ?? '')
    setExecutedAt(
      transaction ? transaction.executed_at.slice(0, 10) : todayInputValue(),
    )
    const t = transaction?.transaction_type ?? 'DEPOSIT'
    setType(t)
    setFromId(transaction?.from_entity_id ?? '')
    setToId(transaction?.to_entity_id ?? '')
    if (t === 'ADJUSTMENT') {
      if (transaction?.to_entity_id) {
        setAdjustDir('ADD')
        setAdjustId(transaction.to_entity_id)
      } else if (transaction?.from_entity_id) {
        setAdjustDir('SUBTRACT')
        setAdjustId(transaction.from_entity_id)
      } else {
        setAdjustDir('ADD')
        setAdjustId('')
      }
    } else {
      setAdjustId('')
      setAdjustDir('ADD')
    }
  }, [open, transaction])

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )

  const isPending = createMutation.isPending || updateMutation.isPending
  const amountNum = Number(amount)
  const hasEntities = entities.length >= 1

  function resolveCurrency(): string | null {
    if (type === 'DEPOSIT') return entityMap.get(toId)?.currency ?? null
    if (type === 'WITHDRAWAL') return entityMap.get(fromId)?.currency ?? null
    if (type === 'TRANSFER') return entityMap.get(fromId)?.currency ?? null
    if (type === 'ADJUSTMENT') return entityMap.get(adjustId)?.currency ?? null
    return null
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setErrorMsg('El importe debe ser un número mayor que 0.')
      return
    }

    let fromEntityId: string | null = null
    let toEntityId: string | null = null

    if (type === 'DEPOSIT') {
      if (!toId) return setErrorMsg('Elige la entidad de destino.')
      toEntityId = toId
    } else if (type === 'WITHDRAWAL') {
      if (!fromId) return setErrorMsg('Elige la entidad de origen.')
      fromEntityId = fromId
    } else if (type === 'TRANSFER') {
      if (!fromId || !toId)
        return setErrorMsg('Elige las entidades de origen y destino.')
      if (fromId === toId)
        return setErrorMsg('Origen y destino deben ser distintos.')
      if (entityMap.get(fromId)?.currency !== entityMap.get(toId)?.currency)
        return setErrorMsg(
          'Las transferencias entre monedas distintas aún no están soportadas. ' +
            'Usa una retirada y un ingreso.',
        )
      fromEntityId = fromId
      toEntityId = toId
    } else if (type === 'ADJUSTMENT') {
      if (!adjustId) return setErrorMsg('Elige la entidad a ajustar.')
      if (adjustDir === 'ADD') toEntityId = adjustId
      else fromEntityId = adjustId
    }

    const currency = resolveCurrency()
    if (!currency) return setErrorMsg('No se pudo determinar la moneda.')

    const values = {
      transaction_type: type,
      from_entity_id: fromEntityId,
      to_entity_id: toEntityId,
      amount: amountNum,
      currency,
      exchange_rate_to_base: 1,
      executed_at: toIsoFromDateInput(executedAt),
      notes: notes.trim() || null,
    }

    try {
      if (isEdit && transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  const currency = resolveCurrency()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}
            </DialogTitle>
            <DialogDescription>
              Cualquier entrada, salida o traspaso de efectivo entre tus
              entidades.
            </DialogDescription>
          </DialogHeader>

          {!hasEntities && (
            <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
              Primero añade al menos una entidad (banco o bróker).
            </p>
          )}

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CashTransactionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CASH_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'TRANSFER' && (
            <div className="grid grid-cols-2 gap-3">
              <EntitySelect
                label="Desde"
                entities={entities}
                value={fromId}
                onChange={setFromId}
              />
              <EntitySelect
                label="Hacia"
                entities={entities.filter((e) => e.id !== fromId)}
                value={toId}
                onChange={setToId}
              />
            </div>
          )}

          {type === 'DEPOSIT' && (
            <EntitySelect
              label="Ingresar en"
              entities={entities}
              value={toId}
              onChange={setToId}
            />
          )}

          {type === 'WITHDRAWAL' && (
            <EntitySelect
              label="Retirar de"
              entities={entities}
              value={fromId}
              onChange={setFromId}
            />
          )}

          {type === 'ADJUSTMENT' && (
            <div className="space-y-3">
              <EntitySelect
                label="Entidad a ajustar"
                entities={entities}
                value={adjustId}
                onChange={setAdjustId}
              />
              {adjustId && (
                <p className="text-muted-foreground text-xs">
                  Saldo actual:{' '}
                  {formatMoney(
                    entityMap.get(adjustId)?.cash_balance_cache ?? 0,
                    entityMap.get(adjustId)?.currency ?? 'EUR',
                  )}
                </p>
              )}
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Select
                  value={adjustDir}
                  onValueChange={(v) => setAdjustDir(v as AdjustDirection)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">Sumar al saldo (+)</SelectItem>
                    <SelectItem value="SUBTRACT">
                      Restar del saldo (−)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">
                Importe {currency ? `(${currency})` : ''}
              </Label>
              <Input
                id="cash-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-date">Fecha</Label>
              <Input
                id="cash-date"
                type="date"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-notes">
              Notas{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="cash-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nómina, traspaso a bróker…"
              maxLength={280}
            />
          </div>

          {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !hasEntities}>
              {isEdit ? 'Guardar cambios' : 'Registrar movimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EntitySelect({
  label,
  entities,
  value,
  onChange,
}: {
  label: string
  entities: Entity[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona…" />
        </SelectTrigger>
        <SelectContent>
          {entities.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} · {e.currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
