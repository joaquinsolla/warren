import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRightIcon,
  CoinsIcon,
  LayersIcon,
  PlusIcon,
  RefreshCwIcon,
  ScaleIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import { RecomputeBalancesDialog } from '@/features/portfolios/RecomputeBalancesDialog'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'

export function SettingsMenu() {
  const navigate = useNavigate()
  const { currentPortfolioId } = useCurrentPortfolio()

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [assetOpen, setAssetOpen] = React.useState(false)
  const [recomputeOpen, setRecomputeOpen] = React.useState(false)

  const options: {
    label: string
    description: string
    icon: React.ReactNode
    onClick: () => void
  }[] = [
    {
      label: 'Añadir activo',
      description: 'Registra un nuevo activo en tu catálogo.',
      icon: <PlusIcon className="size-4" />,
      onClick: () => setAssetOpen(true),
    },
    {
      label: 'Actualizar precios',
      description: 'Fija el precio actual de tus activos.',
      icon: <RefreshCwIcon className="size-4" />,
      onClick: () => navigate('/prices'),
    },
    {
      label: 'Gestionar activos',
      description: 'Revisa y edita todo tu catálogo.',
      icon: <LayersIcon className="size-4" />,
      onClick: () => navigate('/assets'),
    },
    {
      label: 'Tipos de cambio',
      description: 'Configura las conversiones de divisa.',
      icon: <CoinsIcon className="size-4" />,
      onClick: () => navigate('/fx'),
    },
    {
      label: 'Recalcular saldos',
      description: 'Reconstruye la caché desde el histórico.',
      icon: <ScaleIcon className="size-4" />,
      onClick: () => setRecomputeOpen(true),
    },
  ]

  function run(onClick: () => void) {
    setMenuOpen(false)
    onClick()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ajustes"
        onClick={() => setMenuOpen(true)}
      >
        <SettingsIcon className="size-4" />
      </Button>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => run(opt.onClick)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left"
              >
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {opt.description}
                  </p>
                </div>
                <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AssetFormDialog
        open={assetOpen}
        onOpenChange={setAssetOpen}
        asset={null}
      />

      {currentPortfolioId && (
        <RecomputeBalancesDialog
          open={recomputeOpen}
          onOpenChange={setRecomputeOpen}
          portfolioId={currentPortfolioId}
        />
      )}
    </>
  )
}
