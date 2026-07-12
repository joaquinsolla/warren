import { useQuery } from '@tanstack/react-query'
import { getHoldingById, listHoldings } from '@/features/holdings/api'

export const holdingsKey = (portfolioId: string) =>
  ['holdings', portfolioId] as const

export function useHoldings(portfolioId: string | null, entityIds: string[]) {
  return useQuery({
    queryKey: [...holdingsKey(portfolioId ?? ''), entityIds],
    queryFn: () => listHoldings(entityIds),
    enabled: Boolean(portfolioId),
  })
}

export const holdingKey = (id: string) => ['holding', id] as const

export function useHolding(id: string | undefined) {
  return useQuery({
    queryKey: holdingKey(id ?? ''),
    queryFn: () => getHoldingById(id as string),
    enabled: Boolean(id),
  })
}
