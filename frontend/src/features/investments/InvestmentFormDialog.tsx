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
import { useAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import {
  useCreateInvestmentTransaction,
  useUpdateInvestmentTransaction,
} from '@/features/investments/hooks'
import type {
  InvestmentTransaction,
  InvestmentTransactionType,
} from '@/features/investments/api'

type InvestmentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  transaction?: InvestmentTransaction | null
  defaultEntityId?: string | null
  defaultAssetId?: string | null
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function toIsoFromDateInput(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString()
}

export function InvestmentFormDialog({
  open,
  onOpenChange,
  portfolioId,
  transaction,
  defaultEntityId,
  defaultAssetId,
}: InvestmentFormDialogProps) {
  const isEdit = Boolean(transaction)
  const { data: entities = [] } = useEntities(portfolioId)
  const { data: assets = [] } = useAssets()
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const createMutation = useCreateInvestmentTransaction(portfolioId)
  const updateMutation = useUpdateInvestmentTransaction(portfolioId)

  const [type, setType] = React.useState<InvestmentTransactionType>('BUY')
  const [entityId, setEntityId] = React.useState('')
  const [assetId, setAssetId] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [fees, setFees] = React.useState('0')
  const [taxes, setTaxes] = React.useState('0')
  const [executedAt, setExecutedAt] = React.useState(todayInputValue())
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setType(transaction?.transaction_type ?? 'BUY')
    setEntityId(transaction?.entity_id ?? defaultEntityId ?? '')
    setAssetId(transaction?.asset_id ?? defaultAssetId ?? '')
    setQuantity(transaction ? String(transaction.quantity) : '')
    setPrice(transaction ? String(transaction.price_per_unit) : '')
    setFees(transaction ? String(transaction.fees) : '0')
    setTaxes(transaction ? String(transaction.taxes) : '0')
    setNotes(transaction?.notes ?? '')
    setExecutedAt(
      transaction ? transaction.executed_at.slice(0, 10) : todayInputValue(),
    )
  }, [open, transaction, defaultEntityId, defaultAssetId])

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )

  const entity = entityMap.get(entityId)
  const currency = entity?.currency ?? 'EUR'
  const qtyNum = Number(quantity)
  const priceNum = Number(price)
  const feesNum = Number(fees) || 0
  const taxesNum = Number(taxes) || 0
  const gross =
    Number.isFinite(qtyNum) && Number.isFinite(priceNum) && qtyNum > 0
      ? qtyNum * priceNum
      : 0
  const totalCost = gross + feesNum + taxesNum
  const netProceeds = gross - feesNum - taxesNum

  const availableCash = entity?.cash_balance_cache ?? 0
  const heldQty =
    holdings.find((h) => h.entity_id === entityId && h.asset_id === assetId)
      ?.quantity ?? 0

  const isPending = createMutation.isPending || updateMutation.isPending
  const hasEntities = entities.length > 0
  const hasAssets = assets.length > 0

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)

    if (!entityId) return setErrorMsg('Elige la entidad (bróker).')
    if (!assetId) return setErrorMsg('Elige el activo.')
    if (!Number.isFinite(qtyNum) || qtyNum <= 0)
      return setErrorMsg('La cantidad debe ser mayor que 0.')
    if (!Number.isFinite(priceNum) || priceNum < 0)
      return setErrorMsg('El precio no puede ser negativo.')
    if (feesNum < 0 || taxesNum < 0)
      return setErrorMsg('Comisiones e impuestos no pueden ser negativos.')

    if (!isEdit && type === 'BUY' && totalCost > availableCash)
      return setErrorMsg(
        `Fondos insuficientes: coste ${formatMoney(totalCost, currency)}, ` +
          `disponible ${formatMoney(availableCash, currency)}.`,
      )
    if (!isEdit && type === 'SELL' && qtyNum > heldQty)
      return setErrorMsg(
        `No tienes suficientes participaciones: tienes ${heldQty}, ` +
          `intentas vender ${qtyNum}.`,
      )

    const values = {
      entity_id: entityId,
      asset_id: assetId,
      transaction_type: type,
      quantity: qtyNum,
      price_per_unit: priceNum,
      gross_amount: gross,
      fees: feesNum,
      taxes: taxesNum,
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

  const brokers = entities.filter((e) => e.type === 'BROKER')
  const otherEntities = entities.filter((e) => e.type !== 'BROKER')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Editar operación' : 'Nueva operación'}
            </DialogTitle>
            <DialogDescription>
              Una compra o venta. El efectivo de la entidad se ajusta
              automáticamente.
            </DialogDescription>
          </DialogHeader>

          {(!hasEntities || !hasAssets) && (
            <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
              {!hasEntities
                ? 'Primero añade una entidad (bróker).'
                : 'Primero añade algún activo a tu catálogo.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as InvestmentTransactionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Compra</SelectItem>
                  <SelectItem value="SELL">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entidad</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {brokers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.currency}
                    </SelectItem>
                  ))}
                  {otherEntities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activo</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.symbol} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assetId && type === 'SELL' && (
              <p className="text-muted-foreground text-xs">
                Tienes {heldQty} participaciones en esta entidad.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inv-qty">Cantidad</Label>
              <Input
                id="inv-qty"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-price">
                Precio/unidad {currency ? `(${currency})` : ''}
              </Label>
              <Input
                id="inv-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inv-fees">Comisiones</Label>
              <Input
                id="inv-fees"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-taxes">Impuestos</Label>
              <Input
                id="inv-taxes"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={taxes}
                onChange={(e) => setTaxes(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted/40 space-y-1 rounded-md p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Bruto (cant. × precio)
              </span>
              <span className="tabular-nums">
                {formatMoney(gross, currency)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{type === 'BUY' ? 'Coste total' : 'Ingreso neto'}</span>
              <span className="tabular-nums">
                {formatMoney(
                  type === 'BUY' ? totalCost : netProceeds,
                  currency,
                )}
              </span>
            </div>
            {entity && (
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Efectivo disponible</span>
                <span className="tabular-nums">
                  {formatMoney(availableCash, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-date">Fecha</Label>
            <Input
              id="inv-date"
              type="date"
              value={executedAt}
              onChange={(e) => setExecutedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-notes">
              Notas{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo, estrategia…"
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
            <Button
              type="submit"
              disabled={isPending || !hasEntities || !hasAssets}
            >
              {isEdit
                ? 'Guardar cambios'
                : type === 'BUY'
                  ? 'Registrar compra'
                  : 'Registrar venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
