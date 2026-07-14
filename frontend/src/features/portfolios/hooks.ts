import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPortfolio,
  deletePortfolio,
  listPortfolios,
  recomputePortfolio,
  updatePortfolio,
  type PortfolioFormValues,
} from '@/features/portfolios/api'

export const portfoliosKey = ['portfolios'] as const

export function usePortfolios() {
  return useQuery({
    queryKey: portfoliosKey,
    queryFn: listPortfolios,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PortfolioFormValues) => createPortfolio(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfoliosKey })
    },
  })
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: PortfolioFormValues }) =>
      updatePortfolio(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfoliosKey })
    },
  })
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePortfolio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfoliosKey })
    },
  })
}

/**
 * Recalcula toda la caché (efectivo y holdings) del portfolio desde el
 * histórico e invalida las queries que dependen de esos valores.
 */
export function useRecomputePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (portfolioId: string) => recomputePortfolio(portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      queryClient.invalidateQueries({ queryKey: ['entity'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['holding'] })
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['investment-transaction'] })
    },
  })
}
