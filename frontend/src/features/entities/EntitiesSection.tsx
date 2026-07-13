import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVerticalIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { useHoldings } from '@/features/holdings/hooks'
import { useAllAssets } from '@/features/assets/hooks'
import { EntityFormDialog } from '@/features/entities/EntityFormDialog'
import type { Entity } from '@/features/entities/api'

const TYPE_LABELS: Record<Entity['type'], string> = {
  BANK: 'Bancos',
  BROKER: 'Brókers',
}

const TYPE_ORDER: Entity['type'][] = ['BANK', 'BROKER']

export function EntitiesSection({ portfolioId }: { portfolioId: string }) {
  const { data: entities = [], isLoading, error } = useEntities(portfolioId)
  const entityIds = React.useMemo(() => entities.map((e) => e.id), [entities])
  const { data: holdings = [] } = useHoldings(portfolioId, entityIds)
  const { data: assets = [] } = useAllAssets()

  // Valor estimado de las inversiones por entidad (precio manual donde exista,
  // coste si no), para que el balance de la tarjeta refleje los ajustes.
  const estInvByEntity = React.useMemo(() => {
    const priceMap = new Map(assets.map((a) => [a.id, a.manual_price]))
    const m = new Map<string, number>()
    for (const h of holdings) {
      const price = priceMap.get(h.asset_id)
      const value = price != null ? h.quantity * price : h.invested_amount
      m.set(h.entity_id, (m.get(h.entity_id) ?? 0) + value)
    }
    return m
  }, [holdings, assets])

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Entity | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(entity: Entity) {
    setEditing(entity)
    setFormOpen(true)
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: entities.filter((e) => e.type === type),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Entidades</h2>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Añadir
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando entidades…</p>
      )}

      {error && (
        <p className="text-destructive text-sm">
          Error al cargar entidades: {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && entities.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Aún no has añadido bancos ni brókers a esta cartera.
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.type} className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {TYPE_LABELS[group.type]}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                investedValue={estInvByEntity.get(entity.id) ?? 0}
                onEdit={() => openEdit(entity)}
              />
            ))}
          </div>
        </div>
      ))}

      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        portfolioId={portfolioId}
        entity={editing}
      />
    </section>
  )
}

function EntityCard({
  entity,
  investedValue,
  onEdit,
}: {
  entity: Entity
  investedValue: number
  onEdit: () => void
}) {
  const navigate = useNavigate()
  const balance = entity.cash_balance_cache + investedValue

  return (
    <div
      style={brandStyle(entity.color)}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/entities/${entity.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/entities/${entity.id}`)
      }}
      className="bg-card hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-xl border p-4"
    >
      <BrandIcon
        name={entity.name}
        domain={entity.icon_domain}
        className={
          entity.color ? 'bg-brand text-brand-foreground size-10' : 'size-10'
        }
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entity.name}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatMoney(balance, entity.currency)}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones de la entidad"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon className="size-4" />
            Editar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
