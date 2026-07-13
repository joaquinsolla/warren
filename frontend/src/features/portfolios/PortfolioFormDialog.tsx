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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreatePortfolio,
  useUpdatePortfolio,
} from '@/features/portfolios/hooks'
import { DeletePortfolioDialog } from '@/features/portfolios/DeletePortfolioDialog'
import type { Portfolio } from '@/features/portfolios/api'

type PortfolioFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se pasa, el diálogo edita ese portfolio; si no, crea uno nuevo. */
  portfolio?: Portfolio | null
  /** Se llama con el id del portfolio creado (para seleccionarlo). */
  onCreated?: (id: string) => void
  /** Se llama tras eliminar el portfolio en edición. */
  onDeleted?: () => void
}

export function PortfolioFormDialog({
  open,
  onOpenChange,
  portfolio,
  onCreated,
  onDeleted,
}: PortfolioFormDialogProps) {
  const isEdit = Boolean(portfolio)
  const createMutation = useCreatePortfolio()
  const updateMutation = useUpdatePortfolio()

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  // Rellena o limpia el formulario cada vez que se abre.
  React.useEffect(() => {
    if (open) {
      setName(portfolio?.name ?? '')
      setDescription(portfolio?.description ?? '')
      setErrorMsg(null)
    }
  }, [open, portfolio])

  const isPending = createMutation.isPending || updateMutation.isPending
  const trimmedName = name.trim()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)
    if (!trimmedName) {
      setErrorMsg('El nombre es obligatorio.')
      return
    }
    const values = {
      name: trimmedName,
      description: description.trim() || null,
    }
    try {
      if (isEdit && portfolio) {
        await updateMutation.mutateAsync({ id: portfolio.id, values })
      } else {
        const created = await createMutation.mutateAsync(values)
        onCreated?.(created.id)
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
                {isEdit ? 'Editar cartera' : 'Nueva cartera'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza el nombre o la descripción de tu cartera.'
                  : 'Crea una nueva cartera para agrupar tus entidades y movimientos.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Nombre</Label>
              <Input
                id="portfolio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi patrimonio"
                autoFocus
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-description">
                Descripción{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Textarea
                id="portfolio-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ahorro a largo plazo, inversión, etc."
                rows={3}
                maxLength={280}
              />
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
              <Button type="submit" disabled={isPending || !trimmedName}>
                {isEdit ? 'Guardar cambios' : 'Crear cartera'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isEdit && (
        <DeletePortfolioDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          portfolio={portfolio ?? null}
          onDeleted={() => {
            onOpenChange(false)
            onDeleted?.()
          }}
        />
      )}
    </>
  )
}
