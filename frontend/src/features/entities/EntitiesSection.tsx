import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { formatMoney, getCurrency } from '@/lib/currencies'
import { useEntities } from '@/features/entities/hooks'
import { EntityFormDialog } from '@/features/entities/EntityFormDialog'
import { DeleteEntityDialog } from '@/features/entities/DeleteEntityDialog'
import type { Entity } from '@/features/entities/api'

const TYPE_LABELS: Record<Entity['type'], string> = {
  BANK: 'Bancos',
  BROKER: 'Brókers',
}

const TYPE_ORDER: Entity['type'][] = ['BANK', 'BROKER']

export function EntitiesSection({ portfolioId }: { portfolioId: string }) {
  const { data: entities = [], isLoading, error } = useEntities(portfolioId)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Entity | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<Entity | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(entity: Entity) {
    setEditing(entity)
    setFormOpen(true)
  }

  function openDelete(entity: Entity) {
    setDeleting(entity)
    setDeleteOpen(true)
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
                onEdit={() => openEdit(entity)}
                onDelete={() => openDelete(entity)}
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
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        portfolioId={portfolioId}
        entity={deleting}
      />
    </section>
  )
}

function EntityCard({
  entity,
  onEdit,
  onDelete,
}: {
  entity: Entity
  onEdit: () => void
  onDelete: () => void
}) {
  const currency = getCurrency(entity.currency)
  const navigate = useNavigate()

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
          {formatMoney(entity.cash_balance_cache, entity.currency)}
          {currency ? ` · ${currency.code}` : ''}
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
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
