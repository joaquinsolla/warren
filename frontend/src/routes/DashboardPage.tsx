import * as React from 'react'
import { PlusIcon, WalletIcon } from 'lucide-react'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { Button } from '@/components/ui/button'
import { PortfolioFormDialog } from '@/features/portfolios/PortfolioFormDialog'
import { PortfolioSummary } from '@/features/portfolios/PortfolioSummary'
import { EntitiesSection } from '@/features/entities/EntitiesSection'
import { HoldingsSection } from '@/features/holdings/HoldingsSection'

export function DashboardPage() {
  const { currentPortfolio, isLoading, error, setCurrentPortfolioId } =
    useCurrentPortfolio()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <>
      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando carteras…</p>
      )}

      {error && (
        <p className="text-destructive text-sm">
          Error al cargar tus carteras: {error.message}
        </p>
      )}

      {!isLoading && !error && !currentPortfolio && (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      )}

      {!isLoading && !error && currentPortfolio && (
        <section className="space-y-8">
          <PortfolioSummary
            portfolioId={currentPortfolio.id}
            title={currentPortfolio.name}
            description={currentPortfolio.description}
          />
          <EntitiesSection portfolioId={currentPortfolio.id} />
          <HoldingsSection portfolioId={currentPortfolio.id} />
        </section>
      )}

      <PortfolioFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setCurrentPortfolioId(id)}
      />
    </>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <WalletIcon className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Crea tu primera cartera
        </h1>
        <p className="text-muted-foreground text-sm">
          Una cartera agrupa tus bancos, brokers y todos sus movimientos.
          Empieza creando una.
        </p>
      </div>
      <Button onClick={onCreate}>
        <PlusIcon className="size-4" />
        Nueva cartera
      </Button>
    </div>
  )
}
