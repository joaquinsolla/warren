import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createObjective,
  deleteObjective,
  listObjectives,
  updateObjective,
  type CreateObjectiveInput,
  type ObjectiveFormValues,
} from '@/features/objectives/api'

export const objectivesKey = (portfolioId: string) =>
  ['objectives', portfolioId] as const

export function useObjectives(portfolioId: string | null) {
  return useQuery({
    queryKey: objectivesKey(portfolioId ?? ''),
    queryFn: () => listObjectives(portfolioId as string),
    enabled: Boolean(portfolioId),
  })
}

export function useCreateObjective(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateObjectiveInput) => createObjective(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectivesKey(portfolioId) })
    },
  })
}

export function useUpdateObjective(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ObjectiveFormValues }) =>
      updateObjective(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectivesKey(portfolioId) })
    },
  })
}

export function useDeleteObjective(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteObjective(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectivesKey(portfolioId) })
    },
  })
}
