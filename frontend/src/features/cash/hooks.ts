import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entitiesKey } from '@/features/entities/hooks'
import {
  createCashTransaction,
  deleteCashTransaction,
  getCashTransactionById,
  listCashTransactions,
  updateCashTransaction,
  type CashTransactionFormValues,
} from '@/features/cash/api'

export const cashTransactionsKey = (portfolioId: string) =>
  ['cash-transactions', portfolioId] as const

export function useCashTransactions(portfolioId: string | null) {
  return useQuery({
    queryKey: cashTransactionsKey(portfolioId ?? ''),
    queryFn: () => listCashTransactions(portfolioId as string),
    enabled: Boolean(portfolioId),
  })
}

export const cashTransactionKey = (id: string) =>
  ['cash-transaction', id] as const

export function useCashTransaction(id: string | undefined) {
  return useQuery({
    queryKey: cashTransactionKey(id ?? ''),
    queryFn: () => getCashTransactionById(id as string),
    enabled: Boolean(id),
  })
}

/** Invalida movimientos + entidades (el trigger cambia cash_balance_cache). */
function useInvalidateCash(portfolioId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({
      queryKey: cashTransactionsKey(portfolioId),
    })
    queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
    // Vistas de detalle (getById) que dependen de estos datos
    queryClient.invalidateQueries({ queryKey: ['entity'] })
    queryClient.invalidateQueries({ queryKey: ['cash-transaction'] })
  }
}

export function useCreateCashTransaction(portfolioId: string) {
  const invalidate = useInvalidateCash(portfolioId)
  return useMutation({
    mutationFn: (values: CashTransactionFormValues) =>
      createCashTransaction(portfolioId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateCashTransaction(portfolioId: string) {
  const invalidate = useInvalidateCash(portfolioId)
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: CashTransactionFormValues
    }) => updateCashTransaction(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteCashTransaction(portfolioId: string) {
  const invalidate = useInvalidateCash(portfolioId)
  return useMutation({
    mutationFn: (id: string) => deleteCashTransaction(id),
    onSuccess: invalidate,
  })
}
