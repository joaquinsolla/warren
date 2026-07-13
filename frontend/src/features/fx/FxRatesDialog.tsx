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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrency, CURRENCIES } from '@/lib/currencies'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDeleteFxRate,
  useFxRates,
  useUpsertFxRate,
} from '@/features/fx/hooks'

type FxRatesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  base: string
  neededCurrencies: string[]
}

export function FxRatesDialog({
  open,
  onOpenChange,
  base,
  neededCurrencies,
}: FxRatesDialogProps) {
  const { data: rates = [] } = useFxRates()
  const upsert = useUpsertFxRate()
  const del = useDeleteFxRate()

  const rateByCurrency = React.useMemo(
    () => new Map(rates.map((r) => [r.currency, r])),
    [rates],
  )

  const [extraCurrencies, setExtraCurrencies] = React.useState<string[]>([])
  const [picker, setPicker] = React.useState<string>('')

  const currencies = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of neededCurrencies) if (c !== base) set.add(c)
    for (const r of rates) if (r.currency !== base) set.add(r.currency)
    for (const c of extraCurrencies) if (c !== base) set.add(c)
    return [...set].sort()
  }, [neededCurrencies, rates, base, extraCurrencies])

  const addableCurrencies = React.useMemo(
    () =>
      CURRENCIES.filter((c) => c.code !== base && !currencies.includes(c.code)),
    [base, currencies],
  )

  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setExtraCurrencies([])
    setPicker('')
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    for (const c of currencies) {
      initial[c] = rateByCurrency.get(c)
        ? String(rateByCurrency.get(c)!.rate_to_base)
        : ''
    }
    setDrafts(initial)
    setErrorMsg(null)
  }, [open, currencies, rateByCurrency])

  async function handleSave(currency: string) {
    setErrorMsg(null)
    const value = Number(drafts[currency])
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg(`Introduce un tipo válido (> 0) para ${currency}.`)
      return
    }
    try {
      await upsert.mutateAsync({ currency, rateToBase: value })
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tipos de cambio</DialogTitle>
          <DialogDescription>
            Introduce cuánto vale 1 unidad de cada divisa en tu moneda base (
            {base}). Se usan para el total agregado y como ayuda al transferir.
          </DialogDescription>
        </DialogHeader>

        {currencies.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No usas ninguna divisa distinta de {base}.
          </p>
        )}

        <div className="space-y-3">
          {currencies.map((currency) => {
            const existing = rateByCurrency.get(currency)
            const name = getCurrency(currency)?.name ?? currency
            return (
              <div key={currency} className="space-y-1">
                <Label htmlFor={`fx-${currency}`}>
                  {currency} · {name}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    1 {currency} =
                  </span>
                  <Input
                    id={`fx-${currency}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={drafts[currency] ?? ''}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [currency]: e.target.value }))
                    }
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm">{base}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(currency)}
                    disabled={upsert.isPending}
                  >
                    Guardar
                  </Button>
                  {existing && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Eliminar tipo de ${currency}`}
                      onClick={() => del.mutate(existing.id)}
                      disabled={del.isPending}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {addableCurrencies.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <Label>Añadir otra divisa</Label>
            <div className="flex items-center gap-2">
              <Select
                value={picker}
                onValueChange={(code) => {
                  setExtraCurrencies((prev) =>
                    prev.includes(code) ? prev : [...prev, code],
                  )
                  setPicker('')
                }}
              >
                <SelectTrigger className="flex-1">
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
            <p className="text-muted-foreground text-xs">
              Útil si operas con posiciones en una divisa que ninguna entidad
              usa todavía.
            </p>
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
