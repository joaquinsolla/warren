import { LogOutIcon } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PortfolioSwitcher } from '@/features/portfolios/PortfolioSwitcher'

export function AppLayout() {
  const { currentPortfolio } = useCurrentPortfolio()

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-lg font-semibold tracking-tight hover:opacity-80"
            >
              Warren
            </Link>
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
        <Outlet />
      </main>
    </div>
  )
}
