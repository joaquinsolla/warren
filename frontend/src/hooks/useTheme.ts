import * as React from 'react'
import { ThemeContext } from '@/features/theme/ThemeProvider'

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  }
  return ctx
}
