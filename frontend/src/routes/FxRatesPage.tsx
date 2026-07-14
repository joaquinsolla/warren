import * as React from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/features/profile/hooks'
import { useCurrentPortfolio } from '@/hooks/useCurrentPortfolio'
import { useEntities } from '@/features/entities/hooks'
import { useFxRates } from '@/features/fx/hooks'
import { FxRatesManager } from '@/features/fx/FxRatesManager'
import { AddCurrencyDialog } from '@/features/fx/AddCurrencyDialog'
import { BackButton } from '@/routes/detail/detailShared'

export function FxRatesPage() {
  const { data: profile } = useProfile()
  const base = profile?.base_currency ?? 'EUR'
  const { currentPortfolio } = useCurrentPortfolio()
  const { data: entities = [] } = useEntities(currentPortfolio?.id ?? null)
  const { data: rates = [] } = useFxRates()

  const [addOpen, setAddOpen] = React.useState(false)

  const neededCurrencies = React.useMemo(
    () => [...new Set(entities.map((e) => e.currency))],
    [entities],
  )

  const existingCurrencies = React.useMemo(() => {
    const set = new Set<string>([base])
    for (const c of neededCurrencies) set.add(c)
    for (const r of rates) set.add(r.currency)
    return [...set]
  }, [base, neededCurrencies, rates])

  return (
    <>
      <BackButton />
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Tipos de cambio
            </h1>
            <p className="text-muted-foreground text-sm">
              Introduce cuánto vale 1 unidad de cada divisa en tu moneda base (
              {base}). Se usan para el total agregado y como ayuda al
              transferir.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon className="size-4" />
            Añadir divisa
          </Button>
        </div>

        <FxRatesManager base={base} neededCurrencies={neededCurrencies} />
      </section>

      <AddCurrencyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        base={base}
        existingCurrencies={existingCurrencies}
      />
    </>
  )
}
