import * as React from 'react'
import { Trash2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import { getCurrency } from '@/lib/currencies'
import {
  useDeleteFxRateHistory,
  useFxRateHistory,
  useUpsertFxRateHistory,
} from '@/features/fx/hooks'

type FxRateHistoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  base: string
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FxRateHistoryDialog({
  open,
  onOpenChange,
  currency,
  base,
}: FxRateHistoryDialogProps) {
  const { data: allHistory = [] } = useFxRateHistory()
  const upsert = useUpsertFxRateHistory()
  const del = useDeleteFxRateHistory()

  const points = React.useMemo(
    () => allHistory.filter((h) => h.currency === currency),
    [allHistory, currency],
  )

  const [date, setDate] = React.useState(todayInputValue())
  const [rate, setRate] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setDate(todayInputValue())
    setRate('')
    setErrorMsg(null)
  }, [open])

  async function handleAdd() {
    setErrorMsg(null)
    if (!date) {
      setErrorMsg('Indica la fecha de vigencia.')
      return
    }
    const value = Number(rate)
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg('Introduce un tipo válido (> 0).')
      return
    }
    try {
      await upsert.mutateAsync({
        currency,
        rateToBase: value,
        effectiveDate: date,
      })
      setRate('')
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  const name = getCurrency(currency)?.name ?? currency

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Historial · {currency} · {name}
          </DialogTitle>
          <DialogDescription>
            Registra el tipo que estuvo vigente en fechas pasadas. La gráfica de
            patrimonio usará el tipo de cada fecha; el tipo actual aplica desde
            el último punto en adelante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="fx-hist-date">Fecha</Label>
              <DateInput id="fx-hist-date" value={date} onChange={setDate} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fx-hist-rate">
                1 {currency} = ({base})
              </Label>
              <Input
                id="fx-hist-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={handleAdd}
            disabled={upsert.isPending}
          >
            Añadir punto
          </Button>
          {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}
        </div>

        <div className="space-y-2">
          {points.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin puntos históricos. Se usa el tipo actual para todas las
              fechas.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {points.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 p-3"
                >
                  <div className="text-sm">
                    <span className="tabular-nums">
                      {dateFmt.format(new Date(`${p.effective_date}T00:00:00`))}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      · 1 {currency} = {p.rate_to_base} {base}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Eliminar punto de ${p.effective_date}`}
                    onClick={() =>
                      del.mutate(p.id, {
                        onError: (err) => setErrorMsg((err as Error).message),
                      })
                    }
                    disabled={del.isPending}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
