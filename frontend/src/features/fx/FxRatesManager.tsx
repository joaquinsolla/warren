import * as React from 'react'
import { SearchIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrency } from '@/lib/currencies'
import {
  useDeleteFxRate,
  useFxRates,
  useUpsertFxRate,
} from '@/features/fx/hooks'

type FxRatesManagerProps = {
  base: string
  neededCurrencies: string[]
}

/**
 * Gestión de tipos de cambio manuales. Núcleo reutilizable tanto por la página
 * de tipos de cambio como por el diálogo inline al registrar transferencias.
 */
export function FxRatesManager({
  base,
  neededCurrencies,
}: FxRatesManagerProps) {
  const { data: rates = [] } = useFxRates()
  const upsert = useUpsertFxRate()
  const del = useDeleteFxRate()

  const rateByCurrency = React.useMemo(
    () => new Map(rates.map((r) => [r.currency, r])),
    [rates],
  )

  const currencies = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of neededCurrencies) if (c !== base) set.add(c)
    for (const r of rates) if (r.currency !== base) set.add(r.currency)
    return [...set].sort()
  }, [neededCurrencies, rates, base])

  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [editing, setEditing] = React.useState<Set<string>>(new Set())
  const [query, setQuery] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    const initial: Record<string, string> = {}
    for (const c of currencies) {
      initial[c] = rateByCurrency.get(c)
        ? String(rateByCurrency.get(c)!.rate_to_base)
        : ''
    }
    setDrafts(initial)
    setErrorMsg(null)
  }, [currencies, rateByCurrency])

  const q = query.trim().toLowerCase()
  const filteredCurrencies = q
    ? currencies.filter(
        (c) =>
          c.toLowerCase().includes(q) ||
          (getCurrency(c)?.name ?? '').toLowerCase().includes(q),
      )
    : currencies

  function startEdit(currency: string) {
    setErrorMsg(null)
    setEditing((prev) => new Set(prev).add(currency))
  }

  async function handleSave(currency: string) {
    setErrorMsg(null)
    const value = Number(drafts[currency])
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg(`Introduce un tipo válido (> 0) para ${currency}.`)
      return
    }
    try {
      await upsert.mutateAsync({ currency, rateToBase: value })
      setEditing((prev) => {
        const next = new Set(prev)
        next.delete(currency)
        return next
      })
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {currencies.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No usas ninguna divisa distinta de {base}.
        </p>
      )}

      {currencies.length > 0 && (
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por abreviatura o nombre…"
            className="pl-9"
          />
        </div>
      )}

      {currencies.length > 0 && filteredCurrencies.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Ninguna divisa coincide con «{query}».
        </p>
      )}

      <div className="space-y-5">
        {filteredCurrencies.map((currency) => {
          const existing = rateByCurrency.get(currency)
          const name = getCurrency(currency)?.name ?? currency
          const isEditing = editing.has(currency)
          return (
            <div key={currency} className="space-y-1">
              <Label htmlFor={`fx-${currency}`}>
                {currency} · {name}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  1 {currency} =
                </span>
                <Input
                  id={`fx-${currency}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  readOnly={!isEditing}
                  value={drafts[currency] ?? ''}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [currency]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="flex-1 read-only:opacity-60"
                />
                <span className="text-muted-foreground text-sm">{base}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-20"
                  onClick={() =>
                    isEditing ? handleSave(currency) : startEdit(currency)
                  }
                  disabled={upsert.isPending}
                >
                  {isEditing ? 'Guardar' : 'Editar'}
                </Button>
                {existing && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Eliminar tipo de ${currency}`}
                    onClick={() =>
                      del.mutate(existing.id, {
                        onError: (err) => setErrorMsg((err as Error).message),
                      })
                    }
                    disabled={del.isPending}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}
    </div>
  )
}
