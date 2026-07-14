import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FxRatesManager } from '@/features/fx/FxRatesManager'

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

        <FxRatesManager base={base} neededCurrencies={neededCurrencies} />

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
