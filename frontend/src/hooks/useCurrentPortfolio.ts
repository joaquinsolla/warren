import * as React from 'react'
import { PortfolioContext } from '@/features/portfolios/PortfolioProvider'

export function useCurrentPortfolio() {
  const ctx = React.useContext(PortfolioContext)
  if (!ctx) {
    throw new Error(
      'useCurrentPortfolio debe usarse dentro de <PortfolioProvider>',
    )
  }
  return ctx
}
