import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteFxRate, listFxRates, upsertFxRate } from '@/features/fx/api'

export const fxRatesKey = ['fx-rates'] as const

export function useFxRates() {
  return useQuery({
    queryKey: fxRatesKey,
    queryFn: listFxRates,
  })
}

export function useUpsertFxRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      currency,
      rateToBase,
    }: {
      currency: string
      rateToBase: number
    }) => upsertFxRate(currency, rateToBase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fxRatesKey })
    },
  })
}

export function useDeleteFxRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fxRatesKey })
    },
  })
}
