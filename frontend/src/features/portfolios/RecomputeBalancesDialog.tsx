import * as React from 'react'
import { CheckCircle2Icon, RefreshCwIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRecomputePortfolio } from '@/features/portfolios/hooks'

type RecomputeBalancesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
}

export function RecomputeBalancesDialog({
  open,
  onOpenChange,
  portfolioId,
}: RecomputeBalancesDialogProps) {
  const recompute = useRecomputePortfolio()
  const [done, setDone] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setDone(false)
    setErrorMsg(null)
  }, [open])

  async function handleRecompute() {
    setErrorMsg(null)
    setDone(false)
    try {
      await recompute.mutateAsync(portfolioId)
      setDone(true)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recalcular saldos</DialogTitle>
          <DialogDescription>
            Reconstruye el efectivo de cada entidad y todas tus posiciones desde
            el histórico de movimientos. Úsalo si algún saldo parece
            descuadrado: los movimientos no se tocan, solo se recalcula la
            caché.
          </DialogDescription>
        </DialogHeader>

        {done && (
          <div className="text-positive flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4" />
            Saldos recalculados correctamente.
          </div>
        )}

        {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={recompute.isPending}
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleRecompute}
            disabled={recompute.isPending}
          >
            <RefreshCwIcon
              className={`size-4 ${recompute.isPending ? 'animate-spin' : ''}`}
            />
            {recompute.isPending ? 'Recalculando…' : 'Recalcular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
