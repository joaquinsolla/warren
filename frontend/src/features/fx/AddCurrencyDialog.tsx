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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES } from '@/lib/currencies'
import { useUpsertFxRate } from '@/features/fx/hooks'

type AddCurrencyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  base: string
  existingCurrencies: string[]
}

export function AddCurrencyDialog({
  open,
  onOpenChange,
  base,
  existingCurrencies,
}: AddCurrencyDialogProps) {
  const upsert = useUpsertFxRate()

  const [code, setCode] = React.useState('')
  const [rate, setRate] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setCode('')
    setRate('')
    setErrorMsg(null)
  }, [open])

  const addableCurrencies = React.useMemo(
    () =>
      CURRENCIES.filter(
        (c) => c.code !== base && !existingCurrencies.includes(c.code),
      ),
    [base, existingCurrencies],
  )

  async function handleSave() {
    setErrorMsg(null)
    if (!code) {
      setErrorMsg('Selecciona una divisa.')
      return
    }
    const value = Number(rate)
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg('Introduce un tipo válido (> 0).')
      return
    }
    try {
      await upsert.mutateAsync({ currency: code, rateToBase: value })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir divisa</DialogTitle>
          <DialogDescription>
            Elige la divisa e indica cuánto vale 1 unidad en tu moneda base (
            {base}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Divisa</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una divisa…" />
              </SelectTrigger>
              <SelectContent>
                {addableCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="add-fx-rate">Tipo de cambio</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                1 {code || '—'} =
              </span>
              <Input
                id="add-fx-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">{base}</span>
            </div>
          </div>

          {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={upsert.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={upsert.isPending}
          >
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
