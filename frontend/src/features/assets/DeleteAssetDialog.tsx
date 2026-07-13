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
  onDeleted?: () => void
}

export function DeleteAssetDialog({
  open,
  onOpenChange,
  asset,
  onDeleted,
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
          <DialogTitle>Eliminar «{asset?.symbol}»</DialogTitle>
          <DialogDescription>
            El activo desaparecerá de tu catálogo y de los selectores de compra.
            Si tiene inversiones registradas, sus movimientos se conservan en el
            histórico, marcados como pertenecientes a un símbolo eliminado. Esta
            acción no se puede deshacer.
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
