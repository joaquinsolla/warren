import * as React from 'react'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PencilIcon,
  PlusIcon,
  WalletIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { PortfolioFormDialog } from '@/features/portfolios/PortfolioFormDialog'
import type { Portfolio } from '@/features/portfolios/api'

export function PortfolioSwitcher() {
  const { portfolios, currentPortfolio, setCurrentPortfolioId } =
    useCurrentPortfolio()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Portfolio | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit() {
    if (!currentPortfolio) return
    setEditing(currentPortfolio)
    setFormOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="max-w-[16rem] justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <WalletIcon className="size-4 shrink-0" />
              <span className="truncate">
                {currentPortfolio?.name ?? 'Sin cartera'}
              </span>
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Tus carteras</DropdownMenuLabel>
          {portfolios.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => setCurrentPortfolioId(p.id)}
            >
              <span className="truncate">{p.name}</span>
              {p.id === currentPortfolio?.id && (
                <CheckIcon className="ml-auto size-4" />
              )}
            </DropdownMenuItem>
          ))}
          {portfolios.length === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">
              Aún no tienes carteras.
            </div>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openCreate}>
            <PlusIcon className="size-4" />
            Nueva cartera
          </DropdownMenuItem>
          {currentPortfolio && (
            <DropdownMenuItem onSelect={openEdit}>
              <PencilIcon className="size-4" />
              Editar cartera actual
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PortfolioFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        portfolio={editing}
        onCreated={(id) => setCurrentPortfolioId(id)}
      />
    </>
  )
}
