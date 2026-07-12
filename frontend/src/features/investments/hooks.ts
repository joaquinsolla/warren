import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entitiesKey } from '@/features/entities/hooks'
import { holdingsKey } from '@/features/holdings/hooks'
import { objectivesKey } from '@/features/objectives/hooks'
import {
  createInvestmentTransaction,
  deleteInvestmentTransaction,
  getInvestmentTransactionById,
  listInvestmentTransactions,
  updateInvestmentTransaction,
  type InvestmentFormValues,
} from '@/features/investments/api'

export const investmentTransactionsKey = (portfolioId: string) =>
  ['investment-transactions', portfolioId] as const

export function useInvestmentTransactions(
  portfolioId: string | null,
  entityIds: string[],
) {
  return useQuery({
    queryKey: [...investmentTransactionsKey(portfolioId ?? ''), entityIds],
    queryFn: () => listInvestmentTransactions(entityIds),
    enabled: Boolean(portfolioId),
  })
}

export const investmentTransactionKey = (id: string) =>
  ['investment-transaction', id] as const

export function useInvestmentTransaction(id: string | undefined) {
  return useQuery({
    queryKey: investmentTransactionKey(id ?? ''),
    queryFn: () => getInvestmentTransactionById(id as string),
    enabled: Boolean(id),
  })
}

/** Invalida movimientos + holdings + entidades (cambian por el trigger). */
function useInvalidateInvestments(portfolioId: string) {
  const queryClient = useQueryClient()
  return () => {
    // Listas
    queryClient.invalidateQueries({
      queryKey: investmentTransactionsKey(portfolioId),
    })
    queryClient.invalidateQueries({ queryKey: holdingsKey(portfolioId) })
    queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
    // Vistas de detalle (getById) que dependen de estos datos
    queryClient.invalidateQueries({ queryKey: ['holding'] })
    queryClient.invalidateQueries({ queryKey: ['entity'] })
    queryClient.invalidateQueries({ queryKey: ['investment-transaction'] })
    // El trigger delete_objectives_on_full_sell puede borrar objetivos al vender todo
    queryClient.invalidateQueries({ queryKey: objectivesKey(portfolioId) })
  }
}

export function useCreateInvestmentTransaction(portfolioId: string) {
  const invalidate = useInvalidateInvestments(portfolioId)
  return useMutation({
    mutationFn: (values: InvestmentFormValues) =>
      createInvestmentTransaction(values),
    onSuccess: invalidate,
  })
}

export function useUpdateInvestmentTransaction(portfolioId: string) {
  const invalidate = useInvalidateInvestments(portfolioId)
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: InvestmentFormValues
    }) => updateInvestmentTransaction(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteInvestmentTransaction(portfolioId: string) {
  const invalidate = useInvalidateInvestments(portfolioId)
  return useMutation({
    mutationFn: (id: string) => deleteInvestmentTransaction(id),
    onSuccess: invalidate,
  })
}
