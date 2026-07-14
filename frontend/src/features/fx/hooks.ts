import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteFxRate,
  deleteFxRateHistory,
  listFxRates,
  listFxRateHistory,
  upsertFxRate,
  upsertFxRateHistory,
} from '@/features/fx/api'

export const fxRatesKey = ['fx-rates'] as const
export const fxRateHistoryKey = ['fx-rate-history'] as const

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
      queryClient.invalidateQueries({ queryKey: fxRateHistoryKey })
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

export function useFxRateHistory() {
  return useQuery({
    queryKey: fxRateHistoryKey,
    queryFn: listFxRateHistory,
  })
}

export function useUpsertFxRateHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      currency,
      rateToBase,
      effectiveDate,
    }: {
      currency: string
      rateToBase: number
      effectiveDate: string
    }) => upsertFxRateHistory(currency, rateToBase, effectiveDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fxRateHistoryKey })
    },
  })
}

export function useDeleteFxRateHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFxRateHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fxRateHistoryKey })
    },
  })
}
