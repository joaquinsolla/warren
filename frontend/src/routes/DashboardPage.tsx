import * as React from 'react'
import { LogOutIcon, PlusIcon, WalletIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PortfolioSwitcher } from '@/features/portfolios/PortfolioSwitcher'
import { PortfolioFormDialog } from '@/features/portfolios/PortfolioFormDialog'
import { EntitiesSection } from '@/features/entities/EntitiesSection'
import { CashSection } from '@/features/cash/CashSection'
import { AssetsSection } from '@/features/assets/AssetsSection'

export function DashboardPage() {
  const { currentPortfolio, isLoading, error, setCurrentPortfolioId } =
    useCurrentPortfolio()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">Warren</span>
            {currentPortfolio && <PortfolioSwitcher />}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOutIcon className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
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
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {currentPortfolio.name}
              </h1>
              {currentPortfolio.description && (
                <p className="text-muted-foreground">
                  {currentPortfolio.description}
                </p>
              )}
            </div>

            <EntitiesSection portfolioId={currentPortfolio.id} />
            <CashSection portfolioId={currentPortfolio.id} />
            <AssetsSection />
          </section>
        )}
      </main>

      <PortfolioFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setCurrentPortfolioId(id)}
      />
    </div>
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
