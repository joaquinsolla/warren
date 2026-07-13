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
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
} from '@/features/objectives/hooks'
import type { InvestmentObjective } from '@/features/objectives/api'

type ObjectiveFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  assetId: string
  entityId: string | null
  transactionId?: string | null
  currency: string
  objective?: InvestmentObjective | null
}

export function ObjectiveFormDialog({
  open,
  onOpenChange,
  portfolioId,
  assetId,
  entityId,
  transactionId = null,
  currency,
  objective,
}: ObjectiveFormDialogProps) {
  const isEdit = Boolean(objective)
  const createMutation = useCreateObjective(portfolioId)
  const updateMutation = useUpdateObjective(portfolioId)
  const deleteMutation = useDeleteObjective(portfolioId)

  const [body, setBody] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [date, setDate] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setBody(objective?.target_body ?? '')
    setPrice(
      objective?.target_price != null ? String(objective.target_price) : '',
    )
    setDate(objective?.target_date ?? '')
    setIsActive(objective?.is_active ?? true)
  }, [open, objective])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)

    const trimmedBody = body.trim()
    const priceNum = price === '' ? null : Number(price)
    const hasBody = trimmedBody.length > 0
    const hasPrice = priceNum !== null
    const hasDate = date !== ''

    if (!hasBody && !hasPrice && !hasDate) {
      setErrorMsg('Define al menos una meta: estrategia, precio o fecha.')
      return
    }
    if (hasPrice && (!Number.isFinite(priceNum) || (priceNum as number) <= 0)) {
      setErrorMsg('El precio objetivo debe ser un número mayor que 0.')
      return
    }

    const values = {
      target_body: hasBody ? trimmedBody : null,
      target_price: hasPrice ? priceNum : null,
      target_date: hasDate ? date : null,
      is_active: isActive,
    }

    try {
      if (isEdit && objective) {
        await updateMutation.mutateAsync({ id: objective.id, values })
      } else {
        await createMutation.mutateAsync({
          ...values,
          portfolio_id: portfolioId,
          asset_id: assetId,
          entity_id: entityId,
          transaction_id: transactionId,
        })
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
                {isEdit ? 'Editar objetivo' : 'Nuevo objetivo'}
              </DialogTitle>
              <DialogDescription>
                Registra tu tesis: la estrategia, un precio objetivo y/o una
                fecha límite. Al menos uno.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="obj-body">Estrategia / motivo</Label>
              <Textarea
                id="obj-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ej: holdear hasta que llegue a 250 o hasta fin de trimestre."
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="obj-price">
                  Precio objetivo ({currency}){' '}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="obj-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obj-date">
                  Fecha límite{' '}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="obj-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4"
              />
              Objetivo activo (desmárcalo para pausarlo)
            </label>

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
              <Button type="submit" disabled={isPending}>
                {isEdit ? 'Guardar cambios' : 'Crear objetivo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isEdit && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar objetivo</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!objective) return
                  await deleteMutation.mutateAsync(objective.id)
                  setDeleteOpen(false)
                  onOpenChange(false)
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
