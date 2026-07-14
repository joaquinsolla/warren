import { useProfile } from '@/features/profile/hooks'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { PriceUpdateManager } from '@/features/assets/PriceUpdateManager'
import { BackButton } from '@/routes/detail/detailShared'

export function PricesPage() {
  const { data: profile } = useProfile()
  const base = profile?.base_currency ?? 'EUR'
  const { currentPortfolio } = useCurrentPortfolio()

  return (
    <>
      <BackButton />
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Actualizar precios
          </h1>
          <p className="text-muted-foreground text-sm">
            Pon el precio actual de cada activo para estimar tu valor de mercado
            y rendimiento. Es solo una estimación; no crea operaciones.
          </p>
        </div>

        {currentPortfolio && (
          <PriceUpdateManager portfolioId={currentPortfolio.id} base={base} />
        )}
      </section>
    </>
  )
}
