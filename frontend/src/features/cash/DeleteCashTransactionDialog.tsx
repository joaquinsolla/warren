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
import { useDeleteCashTransaction } from '@/features/cash/hooks'
import { CASH_TYPE_LABELS } from '@/features/cash/labels'
import type { CashTransaction } from '@/features/cash/api'

type DeleteCashTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  transaction: CashTransaction | null
  onDeleted?: () => void
}

export function DeleteCashTransactionDialog({
  open,
  onOpenChange,
  portfolioId,
  transaction,
  onDeleted,
}: DeleteCashTransactionDialogProps) {
  const deleteMutation = useDeleteCashTransaction(portfolioId)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) setErrorMsg(null)
  }, [open])

  async function handleDelete() {
    if (!transaction) return
    setErrorMsg(null)
    try {
      await deleteMutation.mutateAsync(transaction.id)
      onDeleted?.()
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
          <DialogTitle>Eliminar movimiento</DialogTitle>
          <DialogDescription>
            Se eliminará este{' '}
            {transaction
              ? CASH_TYPE_LABELS[transaction.transaction_type].toLowerCase()
              : 'movimiento'}{' '}
            y los saldos de las entidades implicadas se recalcularán
            automáticamente.
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
