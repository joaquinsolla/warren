import * as React from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteInvestmentTransaction } from '@/features/investments/hooks'
import type { InvestmentTransaction } from '@/features/investments/api'

type DeleteInvestmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  transaction: InvestmentTransaction | null
}

export function DeleteInvestmentDialog({
  open,
  onOpenChange,
  portfolioId,
  transaction,
}: DeleteInvestmentDialogProps) {
  const deleteMutation = useDeleteInvestmentTransaction(portfolioId)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) setErrorMsg(null)
  }, [open])

  async function handleDelete() {
    if (!transaction) return
    setErrorMsg(null)
    try {
      await deleteMutation.mutateAsync(transaction.id)
      onOpenChange(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
            <TriangleAlertIcon className="size-5" />
          </div>
          <DialogTitle>Eliminar operación</DialogTitle>
          <DialogDescription>
            El histórico de inversión no suele modificarse. Al eliminar esta
            operación se recalcularán la posición (FIFO) y el efectivo de la
            entidad. Úsalo solo para corregir un error.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !transaction}
          >
            {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
