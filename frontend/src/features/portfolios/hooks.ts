import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPortfolio,
  deletePortfolio,
  listPortfolios,
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
