import * as React from 'react'
import { PencilIcon, PlusIcon, TargetIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/currencies'
import { useObjectives } from '@/features/objectives/hooks'
import { ObjectiveFormDialog } from '@/features/objectives/ObjectiveFormDialog'
import type { InvestmentObjective } from '@/features/objectives/api'

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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Objetivos</h2>
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
                {o.target_price != null && (
                  <div className="text-muted-foreground text-xs">
                    <span className="tabular-nums">
                      Objetivo: {formatMoney(o.target_price, currency)}
                    </span>
                  </div>
                )}
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
    </section>
  )
}
