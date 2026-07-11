import * as React from 'react'
import { usePortfolios } from '@/features/portfolios/hooks'
import type { Portfolio } from '@/features/portfolios/api'

type PortfolioContextValue = {
  portfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  currentPortfolioId: string | null
  setCurrentPortfolioId: (id: string) => void
  isLoading: boolean
  error: Error | null
}

const STORAGE_KEY = 'warren-current-portfolio'

export const PortfolioContext = React.createContext<
  PortfolioContextValue | undefined
>(undefined)

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { data: portfolios = [], isLoading, error } = usePortfolios()

  const [storedId, setStoredId] = React.useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  // Resuelve el portfolio activo: el guardado si sigue existiendo, si no el
  // primero de la lista. Nunca apunta a un id inexistente.
  const currentPortfolio = React.useMemo<Portfolio | null>(() => {
    if (portfolios.length === 0) return null
    const match = portfolios.find((p) => p.id === storedId)
    return match ?? portfolios[0]
  }, [portfolios, storedId])

  // Sincroniza localStorage cuando el resuelto difiere del guardado (p. ej. el
  // guardado se borró, o aún no había ninguno).
  React.useEffect(() => {
    if (currentPortfolio && currentPortfolio.id !== storedId) {
      localStorage.setItem(STORAGE_KEY, currentPortfolio.id)
      setStoredId(currentPortfolio.id)
    }
    if (!currentPortfolio && storedId) {
      localStorage.removeItem(STORAGE_KEY)
      setStoredId(null)
    }
  }, [currentPortfolio, storedId])

  const setCurrentPortfolioId = React.useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setStoredId(id)
  }, [])

  const value = React.useMemo<PortfolioContextValue>(
    () => ({
      portfolios,
      currentPortfolio,
      currentPortfolioId: currentPortfolio?.id ?? null,
      setCurrentPortfolioId,
      isLoading,
      error: (error as Error) ?? null,
    }),
    [portfolios, currentPortfolio, setCurrentPortfolioId, isLoading, error],
  )

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
