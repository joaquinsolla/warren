import * as React from 'react'
import { ChevronDownIcon, CircleAlertIcon, Trash2Icon } from 'lucide-react'
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
import { BrandIcon, normalizeDomain } from '@/components/BrandIcon'
import { ColorPicker } from '@/components/ColorPicker'
import { CURRENCIES } from '@/lib/currencies'
import { brandStyle } from '@/lib/brand'
import { useProfile } from '@/features/profile/hooks'
import { useCreateAsset, useUpdateAsset } from '@/features/assets/hooks'
import { DeleteAssetDialog } from '@/features/assets/DeleteAssetDialog'
import { ASSET_TYPE_LABELS, ASSET_TYPE_ORDER } from '@/features/assets/labels'
import type { Asset, AssetType } from '@/features/assets/api'

type AssetFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset?: Asset | null
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
}: AssetFormDialogProps) {
  const isEdit = Boolean(asset)
  const { data: profile } = useProfile()
  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()

  const [symbol, setSymbol] = React.useState('')
  const [name, setName] = React.useState('')
  const [assetType, setAssetType] = React.useState<AssetType>('STOCK')
  const [currency, setCurrency] = React.useState('EUR')
  const [price, setPrice] = React.useState('')
  const [isin, setIsin] = React.useState('')
  const [exchange, setExchange] = React.useState('')
  const [iconDomain, setIconDomain] = React.useState('')
  const [color, setColor] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  const cleanDomain = normalizeDomain(iconDomain)
  const domainLooksValid =
    cleanDomain !== null && /\.[a-z]{2,}$/.test(cleanDomain)

  React.useEffect(() => {
    if (!open) return
    setSymbol(asset?.symbol ?? '')
    setName(asset?.name ?? '')
    setAssetType(asset?.asset_type ?? 'STOCK')
    setCurrency(asset?.currency ?? profile?.base_currency ?? 'EUR')
    setPrice(asset?.manual_price != null ? String(asset.manual_price) : '')
    setIsin(asset?.isin ?? '')
    setExchange(asset?.exchange ?? '')
    setIconDomain(asset?.icon_domain ?? '')
    setColor(asset?.color ?? null)
    setErrorMsg(null)
    setAdvancedOpen(Boolean(asset?.isin || asset?.exchange))
  }, [open, asset, profile?.base_currency])

  const isPending = createMutation.isPending || updateMutation.isPending
  const trimmedSymbol = symbol.trim().toUpperCase()
  const trimmedName = name.trim()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)
    if (!trimmedSymbol) {
      setErrorMsg('El símbolo es obligatorio.')
      return
    }
    if (!trimmedName) {
      setErrorMsg('El nombre es obligatorio.')
      return
    }
    const priceNum = Number(price)
    if (price.trim() === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
      setErrorMsg('El precio actual es obligatorio y debe ser mayor que 0.')
      return
    }
    const values = {
      symbol: trimmedSymbol,
      name: trimmedName,
      asset_type: assetType,
      currency,
      isin: isin.trim().toUpperCase() || null,
      exchange: exchange.trim() || null,
      icon_domain: cleanDomain,
      color,
      manual_price: priceNum,
    }
    try {
      if (isEdit && asset) {
        await updateMutation.mutateAsync({ id: asset.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {isEdit ? 'Editar activo' : 'Nuevo activo'}
              </DialogTitle>
              <DialogDescription>
                Un valor de tu catálogo: acción, ETF, cripto… Lo usarás al
                registrar inversiones.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={assetType}
                  onValueChange={(v) => setAssetType(v as AssetType)}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ASSET_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEdit && (
                  <p className="text-muted-foreground text-xs">
                    El tipo no se puede cambiar.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-symbol">Símbolo</Label>
                <Input
                  id="asset-symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="AAPL, BTC, VWCE…"
                  autoFocus
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={24}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-name">Nombre</Label>
              <Input
                id="asset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apple Inc., Bitcoin…"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-price">Precio actual</Label>
                <Input
                  id="asset-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="150.25"
                  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-icon">
                Icono de la web{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <span style={brandStyle(color)}>
                  <BrandIcon
                    name={trimmedName || trimmedSymbol || '?'}
                    domain={cleanDomain}
                    className={
                      color ? 'bg-brand text-brand-foreground' : undefined
                    }
                  />
                </span>
                <Input
                  id="asset-icon"
                  className="flex-1"
                  value={iconDomain}
                  onChange={(e) => setIconDomain(e.target.value)}
                  placeholder="apple.com, nvidia.com, bitcoin.org…"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
              {iconDomain.trim() && !domainLooksValid && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CircleAlertIcon className="size-3.5" />
                  Escribe un dominio válido, p. ej. <code>apple.com</code>.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Color{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="text-muted-foreground -ml-2"
              >
                <ChevronDownIcon
                  className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
                Avanzado
              </Button>

              {advancedOpen && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="asset-exchange">
                      Mercado{' '}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id="asset-exchange"
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                      placeholder="NASDAQ, XETRA…"
                      maxLength={40}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-isin">
                      ISIN{' '}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id="asset-isin"
                      value={isin}
                      onChange={(e) => setIsin(e.target.value)}
                      placeholder="US0378331005"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={12}
                      className="uppercase"
                    />
                  </div>
                </>
              )}
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
              <Button
                type="submit"
                disabled={
                  isPending || !trimmedSymbol || !trimmedName || !price.trim()
                }
              >
                {isEdit ? 'Guardar cambios' : 'Crear activo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isEdit && (
        <DeleteAssetDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          asset={asset ?? null}
          onDeleted={() => onOpenChange(false)}
        />
      )}
    </>
  )
}
