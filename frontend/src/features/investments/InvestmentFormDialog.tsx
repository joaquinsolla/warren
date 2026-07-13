import * as React from 'react'
import { ChevronLeftIcon, MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
import { formatMoney, getCurrency } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useAssets } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import {
  useCreateInvestmentTransaction,
  useUpdateInvestmentTransaction,
} from '@/features/investments/hooks'
import { DeleteInvestmentDialog } from '@/features/investments/DeleteInvestmentDialog'
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

const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

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
  // En el flujo de "Operar" (crear), el contexto fija la entidad y/o el activo.
  const lockEntity = !isEdit && Boolean(defaultEntityId)
  const lockAsset = !isEdit && Boolean(defaultAssetId)

  const { data: entities = [] } = useEntities(portfolioId)
  const { data: assets = [] } = useAssets()
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const createMutation = useCreateInvestmentTransaction(portfolioId)
  const updateMutation = useUpdateInvestmentTransaction(portfolioId)

  const [step, setStep] = React.useState<'choose' | 'form'>('form')
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
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setStep(isEdit ? 'form' : 'choose')
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
  }, [open, isEdit, transaction, defaultEntityId, defaultAssetId])

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )
  const assetMap = React.useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  )

  const entity = entityMap.get(entityId)
  const lockedAsset = assetMap.get(assetId)
  const currency = entity?.currency ?? 'EUR'
  const symbol = getCurrency(currency)?.symbol ?? currency
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

  const brokers = React.useMemo(
    () => entities.filter((e) => e.type === 'BROKER'),
    [entities],
  )

  // Activos que puedes vender en la entidad seleccionada (holding > 0).
  const sellableAssets = React.useMemo(() => {
    const heldIds = new Set(
      holdings
        .filter((h) => h.entity_id === entityId && h.quantity > 0)
        .map((h) => h.asset_id),
    )
    return assets.filter((a) => heldIds.has(a.id))
  }, [assets, holdings, entityId])

  // Brókers donde tienes el activo seleccionado (holding > 0).
  const sellableBrokers = React.useMemo(
    () =>
      brokers.filter((b) =>
        holdings.some(
          (h) =>
            h.entity_id === b.id && h.asset_id === assetId && h.quantity > 0,
        ),
      ),
    [brokers, holdings, assetId],
  )

  const entityOptions = isEdit || type === 'BUY' ? brokers : sellableBrokers
  const assetOptions = isEdit || type === 'BUY' ? assets : sellableAssets

  const isPending = createMutation.isPending || updateMutation.isPending
  const hasEntities = entities.length > 0
  const hasAssets = assets.length > 0

  const sellableExists =
    lockEntity && lockAsset
      ? heldQty > 0
      : lockEntity
        ? sellableAssets.length > 0
        : lockAsset
          ? sellableBrokers.length > 0
          : holdings.some((h) => h.quantity > 0)

  const noSellMsg =
    lockEntity && lockAsset
      ? 'No tienes participaciones de este activo para vender.'
      : lockEntity
        ? 'No tienes posiciones en este bróker para vender.'
        : lockAsset
          ? 'No tienes este activo en ningún bróker para vender.'
          : 'No tienes posiciones abiertas para vender.'

  function chooseType(t: InvestmentTransactionType) {
    setType(t)
    setErrorMsg(null)
    // Al cambiar de tipo, limpia selecciones no bloqueadas (filtros distintos).
    if (!lockAsset) setAssetId(defaultAssetId ?? '')
    if (!lockEntity) setEntityId(defaultEntityId ?? '')
    setStep('form')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)

    if (!entityId) return setErrorMsg('Elige la entidad (bróker).')
    if (!assetId) return setErrorMsg('Elige el activo.')
    if (!executedAt) return setErrorMsg('Indica la fecha de la operación.')
    if (!Number.isFinite(qtyNum) || qtyNum <= 0)
      return setErrorMsg('La cantidad debe ser mayor que 0.')
    if (type === 'BUY' && (!Number.isFinite(priceNum) || priceNum <= 0))
      return setErrorMsg('El precio de compra debe ser mayor que 0.')
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

  const lockedTitle = lockAsset && lockedAsset ? ` · ${lockedAsset.symbol}` : ''

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          {step === 'choose' ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Operar{lockedTitle}</DialogTitle>
                <DialogDescription>¿Qué quieres hacer?</DialogDescription>
              </DialogHeader>

              {!hasEntities || !hasAssets ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  {!hasEntities
                    ? 'Primero añade una entidad (bróker).'
                    : 'Primero añade algún activo a tu catálogo.'}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-positive h-24 flex-col gap-2"
                      onClick={() => chooseType('BUY')}
                    >
                      <PlusIcon className="size-6" />
                      <span className="text-base font-medium">Comprar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-negative h-24 flex-col gap-2"
                      disabled={!sellableExists}
                      onClick={() => chooseType('SELL')}
                    >
                      <MinusIcon className="size-6" />
                      <span className="text-base font-medium">Vender</span>
                    </Button>
                  </div>
                  {!sellableExists && (
                    <p className="text-muted-foreground text-center text-xs">
                      {noSellMsg}
                    </p>
                  )}
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-1">
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="-ml-2 size-7 shrink-0"
                      onClick={() => setStep('choose')}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                  )}
                  <DialogTitle>
                    {isEdit
                      ? 'Editar operación'
                      : type === 'BUY'
                        ? 'Comprar'
                        : 'Vender'}
                    {!isEdit && lockedTitle}
                  </DialogTitle>
                </div>
                <DialogDescription>
                  El efectivo de la entidad se ajusta automáticamente.
                </DialogDescription>
              </DialogHeader>

              {isEdit && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={type}
                    onValueChange={(v) =>
                      setType(v as InvestmentTransactionType)
                    }
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
              )}

              {lockEntity ? (
                <div className="space-y-2">
                  <Label>Bróker</Label>
                  <div className="bg-muted/40 text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm">
                    {entity ? `${entity.name} · ${entity.currency}` : '—'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Bróker</Label>
                  {type === 'SELL' && entityOptions.length === 0 ? (
                    <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                      {noSellMsg}
                    </p>
                  ) : (
                    <Select value={entityId} onValueChange={setEntityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOptions.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} · {e.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {lockAsset ? (
                <div className="space-y-2">
                  <Label>Activo</Label>
                  <div className="bg-muted/40 text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm">
                    {lockedAsset
                      ? `${lockedAsset.symbol} · ${lockedAsset.name}`
                      : '—'}
                  </div>
                  {type === 'SELL' && (
                    <p className="text-muted-foreground text-xs">
                      Tienes {heldQty} participaciones en esta entidad.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Activo</Label>
                  {type === 'SELL' && assetOptions.length === 0 ? (
                    <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                      {noSellMsg}
                    </p>
                  ) : (
                    <Select value={assetId} onValueChange={setAssetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.symbol} · {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {assetId && type === 'SELL' && (
                    <p className="text-muted-foreground text-xs">
                      Tienes {heldQty} participaciones en esta entidad.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inv-qty">Acciones</Label>
                  <Input
                    id="inv-qty"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    className={NO_SPINNER}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-price">Precio/unidad</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      {symbol}
                    </span>
                    <Input
                      id="inv-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className={`pl-8 ${NO_SPINNER}`}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inv-fees">Comisiones</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      {symbol}
                    </span>
                    <Input
                      id="inv-fees"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className={`pl-8 ${NO_SPINNER}`}
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-taxes">Impuestos</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      {symbol}
                    </span>
                    <Input
                      id="inv-taxes"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className={`pl-8 ${NO_SPINNER}`}
                      value={taxes}
                      onChange={(e) => setTaxes(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
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
                <DateInput
                  id="inv-date"
                  value={executedAt}
                  onChange={setExecutedAt}
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

              {errorMsg && (
                <p className="text-destructive text-sm">{errorMsg}</p>
              )}

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
          )}
        </DialogContent>
      </Dialog>
      {isEdit && (
        <DeleteInvestmentDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          portfolioId={portfolioId}
          transaction={transaction ?? null}
          onDeleted={() => onOpenChange(false)}
        />
      )}
    </>
  )
}
