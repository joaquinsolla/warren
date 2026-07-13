import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrency } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useAssets, useUpdateAssetPrice } from '@/features/assets/hooks'
import { useHoldings } from '@/features/holdings/hooks'

type PriceUpdateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  base: string
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
})

type AssetRow = {
  assetId: string
  symbol: string
  name: string
  currency: string
  totalQty: number
  totalInvested: number
  avgCost: number
  manualPrice: number | null
  manualPriceAt: string | null
}

/**
 * Actualización manual de precios (estimación). Lista los activos con posición
 * abierta y permite fijar el precio actual de cada uno, guardando símbolo a
 * símbolo. Con esos precios se estima el valor de mercado y la plusvalía
 * latente sin necesidad de vender.
 */
export function PriceUpdateDialog({
  open,
  onOpenChange,
  portfolioId,
  base,
}: PriceUpdateDialogProps) {
  const { data: entities = [] } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: activeAssets = [] } = useAssets()
  const update = useUpdateAssetPrice()

  const entityMap = React.useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  )

  const rows = React.useMemo<AssetRow[]>(() => {
    const acc = new Map<
      string,
      { qty: number; invested: number; currency: string }
    >()
    for (const h of holdings) {
      const cur = acc.get(h.asset_id)
      const currency = entityMap.get(h.entity_id)?.currency ?? base
      if (cur) {
        cur.qty += h.quantity
        cur.invested += h.invested_amount
      } else {
        acc.set(h.asset_id, {
          qty: h.quantity,
          invested: h.invested_amount,
          currency,
        })
      }
    }
    return activeAssets
      .map((asset) => {
        const v = acc.get(asset.id)
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          currency: v?.currency ?? asset.currency,
          totalQty: v?.qty ?? 0,
          totalInvested: v?.invested ?? 0,
          avgCost: v && v.qty > 0 ? v.invested / v.qty : 0,
          manualPrice: asset.manual_price ?? null,
          manualPriceAt: asset.manual_price_at ?? null,
        }
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [holdings, activeAssets, entityMap, base])

  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    for (const r of rows) {
      initial[r.assetId] = r.manualPrice != null ? String(r.manualPrice) : ''
    }
    setDrafts(initial)
    setErrorMsg(null)
  }, [open, rows])

  async function handleSave(row: AssetRow) {
    setErrorMsg(null)
    const raw = drafts[row.assetId]?.trim() ?? ''
    const value = Number(raw)
    if (raw === '' || !Number.isFinite(value) || value <= 0) {
      setErrorMsg(`Introduce un precio mayor que 0 para ${row.symbol}.`)
      return
    }
    try {
      await update.mutateAsync({ id: row.assetId, price: value })
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Actualizar precios</DialogTitle>
          <DialogDescription>
            Pon el precio actual de cada activo para estimar tu valor de mercado
            y rendimiento. Es solo una estimación; no crea operaciones.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tienes activos que valorar.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {rows.map((r) => {
              return (
                <div key={r.assetId} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={`price-${r.assetId}`}>
                      {r.name || r.symbol}
                      {r.name && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          · {r.symbol}
                        </span>
                      )}
                    </Label>
                    {r.manualPriceAt && (
                      <span className="text-muted-foreground text-xs">
                        {dateFmt.format(new Date(r.manualPriceAt))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                        {getCurrency(r.currency)?.symbol ?? r.currency}
                      </span>
                      <Input
                        id={`price-${r.assetId}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={drafts[r.assetId] ?? ''}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [r.assetId]: e.target.value,
                          }))
                        }
                        placeholder="Precio actual"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(r)}
                      disabled={update.isPending}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
