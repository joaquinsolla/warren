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
import { useDeleteAsset } from '@/features/assets/hooks'
import type { Asset } from '@/features/assets/api'

type DeleteAssetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
}

function isForeignKeyError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return (
    e?.code === '23503' ||
    Boolean(e?.message && e.message.includes('foreign key'))
  )
}

export function DeleteAssetDialog({
  open,
  onOpenChange,
  asset,
}: DeleteAssetDialogProps) {
  const deleteMutation = useDeleteAsset()
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) setErrorMsg(null)
  }, [open])

  async function handleDelete() {
    if (!asset) return
    setErrorMsg(null)
    try {
      await deleteMutation.mutateAsync(asset.id)
      onOpenChange(false)
    } catch (err) {
      if (isForeignKeyError(err)) {
        setErrorMsg(
          'No se puede eliminar: este activo tiene inversiones asociadas. ' +
            'El histórico contable no puede perderse.',
        )
        return
      }
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
          <DialogTitle>Eliminar «{asset?.symbol}»</DialogTitle>
          <DialogDescription>
            Solo puedes eliminar un activo si no tiene inversiones registradas.
            Si las tiene, la operación se bloqueará para proteger el histórico.
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
            disabled={deleteMutation.isPending || !asset}
          >
            {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
