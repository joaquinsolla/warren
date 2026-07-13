import * as React from 'react'
import { Trash2Icon } from 'lucide-react'
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
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/currencies'
import { buildRateMap, convertBetween } from '@/lib/fx'
import { useEntities } from '@/features/entities/hooks'
import {
  useCreateCashTransaction,
  useUpdateCashTransaction,
} from '@/features/cash/hooks'
import { useProfile } from '@/features/profile/hooks'
import { useFxRates } from '@/features/fx/hooks'
import { FxRatesDialog } from '@/features/fx/FxRatesDialog'
import { DeleteCashTransactionDialog } from '@/features/cash/DeleteCashTransactionDialog'
import { CASH_TYPE_LABELS, CASH_TYPE_ORDER } from '@/features/cash/labels'
import type { CashTransaction, CashTransactionType } from '@/features/cash/api'
import type { Entity } from '@/features/entities/api'

type AdjustDirection = 'ADD' | 'SUBTRACT'
type TransferSide = 'OUT' | 'IN'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type CashTransactionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  transaction?: CashTransaction | null
  defaultEntityId?: string | null
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
  defaultEntityId,
}: CashTransactionFormDialogProps) {
  const isEdit = Boolean(transaction)
  const { data: entities = [] } = useEntities(portfolioId)
  const { data: profile } = useProfile()
  const { data: fxRates = [] } = useFxRates()
  const base = profile?.base_currency ?? 'EUR'
  const createMutation = useCreateCashTransaction(portfolioId)
  const updateMutation = useUpdateCashTransaction(portfolioId)

  const [type, setType] = React.useState<CashTransactionType>('DEPOSIT')
  const [fromId, setFromId] = React.useState<string>('')
  const [toId, setToId] = React.useState<string>('')
  const [adjustId, setAdjustId] = React.useState<string>('')
  const [adjustDir, setAdjustDir] = React.useState<AdjustDirection>('ADD')
  const [amount, setAmount] = React.useState('')
  const [toAmount, setToAmount] = React.useState('')
  const [transferSide, setTransferSide] = React.useState<TransferSide>('OUT')
  const [executedAt, setExecutedAt] = React.useState(todayInputValue())
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [rateDialogOpen, setRateDialogOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setAmount(transaction ? String(transaction.amount) : '')
    setToAmount(
      transaction?.to_amount != null ? String(transaction.to_amount) : '',
    )
    setTransferSide('OUT')
    setNotes(transaction?.notes ?? '')
    setExecutedAt(
      transaction ? transaction.executed_at.slice(0, 10) : todayInputValue(),
    )
    const t = transaction?.transaction_type ?? 'DEPOSIT'
    setType(t)
    const defEnt = transaction ? '' : (defaultEntityId ?? '')
    setFromId(transaction?.from_entity_id ?? defEnt)
    setToId(transaction?.to_entity_id ?? defEnt)
    if (t === 'ADJUSTMENT') {
      if (transaction?.to_entity_id) {
        setAdjustDir('ADD')
        setAdjustId(transaction.to_entity_id)
      } else if (transaction?.from_entity_id) {
        setAdjustDir('SUBTRACT')
        setAdjustId(transaction.from_entity_id)
      } else {
        setAdjustDir('ADD')
        setAdjustId(defEnt)
      }
    } else {
      setAdjustId(defEnt)
      setAdjustDir('ADD')
    }
  }, [open, transaction, defaultEntityId])

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const rateMap = React.useMemo(() => buildRateMap(fxRates), [fxRates])

  const fromCurrency = entityMap.get(fromId)?.currency ?? null
  const toCurrency = entityMap.get(toId)?.currency ?? null
  const isCrossTransfer =
    type === 'TRANSFER' &&
    Boolean(fromCurrency && toCurrency) &&
    fromCurrency !== toCurrency

  const crossRateAvailable = isCrossTransfer
    ? convertBetween(
        1,
        fromCurrency as string,
        toCurrency as string,
        base,
        rateMap,
      ) !== null
    : true

  const enteredNum = transferSide === 'OUT' ? Number(amount) : Number(toAmount)
  const computedOther =
    isCrossTransfer && crossRateAvailable && enteredNum > 0
      ? convertBetween(
          enteredNum,
          (transferSide === 'OUT' ? fromCurrency : toCurrency) as string,
          (transferSide === 'OUT' ? toCurrency : fromCurrency) as string,
          base,
          rateMap,
        )
      : null

  const isPending = createMutation.isPending || updateMutation.isPending
  const hasEntities = entities.length >= 1
  // Al abrir desde una entidad concreta (banco o bróker), fijamos la entidad en
  // ingreso/retirada/ajuste (no en traspaso, que necesita dos entidades).
  const lockEntity = !isEdit && Boolean(defaultEntityId)

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

    if (!executedAt) return setErrorMsg('Indica la fecha del movimiento.')

    let fromEntityId: string | null = null
    let toEntityId: string | null = null
    let outAmount = Number(amount)
    let toAmountValue: number | null = null

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
      fromEntityId = fromId
      toEntityId = toId
      if (isCrossTransfer) {
        if (!crossRateAvailable)
          return setErrorMsg(
            `Configura el tipo de cambio de ${fromCurrency} y ${toCurrency} antes de continuar.`,
          )
        if (transferSide === 'OUT') {
          if (!(outAmount > 0))
            return setErrorMsg(
              `Indica el importe que sale (${fromCurrency}) mayor que 0.`,
            )
          const conv = convertBetween(
            outAmount,
            fromCurrency as string,
            toCurrency as string,
            base,
            rateMap,
          )
          if (conv === null || !(conv > 0))
            return setErrorMsg('No se pudo calcular el importe recibido.')
          toAmountValue = round2(conv)
        } else {
          const inAmount = Number(toAmount)
          if (!(inAmount > 0))
            return setErrorMsg(
              `Indica el importe que llega (${toCurrency}) mayor que 0.`,
            )
          const conv = convertBetween(
            inAmount,
            toCurrency as string,
            fromCurrency as string,
            base,
            rateMap,
          )
          if (conv === null || !(conv > 0))
            return setErrorMsg('No se pudo calcular el importe que sale.')
          outAmount = round2(conv)
          toAmountValue = inAmount
        }
      }
    } else if (type === 'ADJUSTMENT') {
      if (!adjustId) return setErrorMsg('Elige la entidad a ajustar.')
      if (adjustDir === 'ADD') toEntityId = adjustId
      else fromEntityId = adjustId
    }

    if (!Number.isFinite(outAmount) || outAmount <= 0) {
      setErrorMsg('El importe debe ser un número mayor que 0.')
      return
    }

    const currency = resolveCurrency()
    if (!currency) return setErrorMsg('No se pudo determinar la moneda.')

    const values = {
      transaction_type: type,
      from_entity_id: fromEntityId,
      to_entity_id: toEntityId,
      amount: outAmount,
      to_amount: toAmountValue,
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

          {isCrossTransfer && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">
                Cambio de divisa: {fromCurrency} → {toCurrency}
              </p>
              {crossRateAvailable ? (
                <>
                  <div className="space-y-2">
                    <Label>¿Qué importe conoces?</Label>
                    <Select
                      value={transferSide}
                      onValueChange={(v) => setTransferSide(v as TransferSide)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUT">
                          El que sale ({fromCurrency})
                        </SelectItem>
                        <SelectItem value="IN">
                          El que llega ({toCurrency})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cash-cross-amount">
                      {transferSide === 'OUT'
                        ? `Importe que sale (${fromCurrency})`
                        : `Importe que llega (${toCurrency})`}
                    </Label>
                    <Input
                      id="cash-cross-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={transferSide === 'OUT' ? amount : toAmount}
                      onChange={(e) =>
                        transferSide === 'OUT'
                          ? setAmount(e.target.value)
                          : setToAmount(e.target.value)
                      }
                      placeholder="0.00"
                    />
                    {computedOther !== null && (
                      <p className="text-muted-foreground text-xs">
                        {transferSide === 'OUT'
                          ? `Llega: ${formatMoney(computedOther, toCurrency as string)}`
                          : `Sale: ${formatMoney(computedOther, fromCurrency as string)}`}{' '}
                        · calculado con tu tipo de cambio
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground space-y-2 text-xs">
                  <p>
                    Necesitas configurar el tipo de cambio de {fromCurrency} y{' '}
                    {toCurrency} para registrar esta transferencia.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRateDialogOpen(true)}
                  >
                    Configurar tipos de cambio
                  </Button>
                </div>
              )}
            </div>
          )}

          {type === 'DEPOSIT' && (
            <EntitySelect
              label="Ingresar en"
              entities={entities}
              value={toId}
              onChange={setToId}
              disabled={lockEntity}
            />
          )}

          {type === 'WITHDRAWAL' && (
            <EntitySelect
              label="Retirar de"
              entities={entities}
              value={fromId}
              onChange={setFromId}
              disabled={lockEntity}
            />
          )}

          {type === 'ADJUSTMENT' && (
            <div className="space-y-3">
              <EntitySelect
                label="Entidad a ajustar"
                entities={entities}
                value={adjustId}
                onChange={setAdjustId}
                disabled={lockEntity}
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
            {!isCrossTransfer && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="cash-date">Fecha</Label>
              <DateInput
                id="cash-date"
                value={executedAt}
                onChange={setExecutedAt}
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
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
                className="sm:mr-auto"
              >
                <Trash2Icon className="size-4" />
                Eliminar
              </Button>
            )}
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
      <FxRatesDialog
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        base={base}
        neededCurrencies={[fromCurrency, toCurrency].filter((c): c is string =>
          Boolean(c),
        )}
      />
      {isEdit && (
        <DeleteCashTransactionDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          portfolioId={portfolioId}
          transaction={transaction ?? null}
          onDeleted={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function EntitySelect({
  label,
  entities,
  value,
  onChange,
  disabled,
}: {
  label: string
  entities: Entity[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
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
