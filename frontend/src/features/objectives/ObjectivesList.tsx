import * as React from 'react'
import { PencilIcon, PlusIcon, TargetIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/currencies'
import { useObjectives, useDeleteObjective } from '@/features/objectives/hooks'
import { ObjectiveFormDialog } from '@/features/objectives/ObjectiveFormDialog'
import type { InvestmentObjective } from '@/features/objectives/api'

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function dateStatus(target: string): { label: string; className: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${target}T00:00:00`)
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { label: 'Fecha vencida', className: 'text-negative' }
  if (days === 0) return { label: 'Vence hoy', className: 'text-negative' }
  return { label: `Quedan ${days} días`, className: 'text-muted-foreground' }
}

type ObjectivesListProps = {
  portfolioId: string
  assetId: string
  /** Entidad de la posición. Con scope 'entity' se filtra por ella. */
  entityId: string | null
  scope: 'entity' | 'asset'
  currency: string
}

export function ObjectivesList({
  portfolioId,
  assetId,
  entityId,
  scope,
  currency,
}: ObjectivesListProps) {
  const { data: all = [] } = useObjectives(portfolioId)
  const deleteMutation = useDeleteObjective(portfolioId)

  const objectives = React.useMemo(
    () =>
      all.filter(
        (o) =>
          o.asset_id === assetId &&
          (scope === 'asset' || o.entity_id === entityId),
      ),
    [all, assetId, entityId, scope],
  )

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<InvestmentObjective | null>(null)
  const [deleting, setDeleting] = React.useState<InvestmentObjective | null>(
    null,
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Objetivos</h2>
          <p className="text-muted-foreground text-xs">
            Tu tesis: estrategia, precio y/o fecha. El estado se deriva.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon className="size-4" />
          Añadir
        </Button>
      </div>

      {objectives.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Sin objetivos todavía.
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {objectives.map((o) => (
            <div key={o.id} className="flex items-start gap-3 p-4">
              <div className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
                <TargetIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {o.target_body && <p className="text-sm">{o.target_body}</p>}
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {o.target_price != null && (
                    <span className="tabular-nums">
                      Objetivo: {formatMoney(o.target_price, currency)}
                    </span>
                  )}
                  {o.target_date && (
                    <span className={dateStatus(o.target_date).className}>
                      {dateFmt.format(new Date(`${o.target_date}T00:00:00`))} ·{' '}
                      {dateStatus(o.target_date).label}
                    </span>
                  )}
                  {!o.is_active && (
                    <span className="text-muted-foreground">Pausado</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar objetivo"
                  onClick={() => {
                    setEditing(o)
                    setFormOpen(true)
                  }}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar objetivo"
                  onClick={() => setDeleting(o)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ObjectiveFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        portfolioId={portfolioId}
        assetId={assetId}
        entityId={scope === 'entity' ? entityId : null}
        currency={currency}
        objective={editing}
      />

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
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
              onClick={() => setDeleting(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting) return
                await deleteMutation.mutateAsync(deleting.id)
                setDeleting(null)
              }}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
