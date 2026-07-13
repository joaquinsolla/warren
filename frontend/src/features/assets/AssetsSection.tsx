import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandIcon } from '@/components/BrandIcon'
import { brandStyle } from '@/lib/brand'
import { getCurrency } from '@/lib/currencies'
import { useAssets } from '@/features/assets/hooks'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import { ASSET_TYPE_LABELS, ASSET_TYPE_ORDER } from '@/features/assets/labels'
import type { Asset } from '@/features/assets/api'

export function AssetsSection() {
  const { data: assets = [], isLoading, error } = useAssets()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Asset | null>(null)
  const [query, setQuery] = React.useState('')

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setFormOpen(true)
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q),
      )
    : assets

  const grouped = ASSET_TYPE_ORDER.map((type) => ({
    type,
    items: filtered.filter((a) => a.asset_type === type),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Activos</h2>
          <p className="text-muted-foreground text-xs">
            Tu catálogo personal, compartido entre todas tus carteras.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Añadir
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando activos…</p>
      )}

      {error && (
        <p className="text-destructive text-sm">
          Error al cargar activos: {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && assets.length > 0 && (
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o símbolo…"
            className="pl-9"
          />
        </div>
      )}

      {!isLoading && !error && assets.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Aún no has añadido ningún activo a tu catálogo.
        </div>
      )}

      {!isLoading && !error && assets.length > 0 && grouped.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Ningún activo coincide con «{query}».
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.type} className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {ASSET_TYPE_LABELS[group.type]}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={() => openEdit(asset)}
              />
            ))}
          </div>
        </div>
      ))}

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editing}
      />
    </section>
  )
}

function AssetCard({ asset, onEdit }: { asset: Asset; onEdit: () => void }) {
  const currency = getCurrency(asset.currency)
  const navigate = useNavigate()

  return (
    <div
      style={brandStyle(asset.color)}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/assets/${asset.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/assets/${asset.id}`)
      }}
      className="bg-card hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-xl border p-4"
    >
      <BrandIcon
        name={asset.name || asset.symbol}
        domain={asset.icon_domain}
        className={
          asset.color ? 'bg-brand text-brand-foreground size-10' : 'size-10'
        }
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{asset.symbol}</p>
        <p className="text-muted-foreground truncate text-xs">
          {asset.name}
          {asset.exchange ? ` · ${asset.exchange}` : ''}
          {currency ? ` · ${currency.code}` : ''}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones del activo"
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
