import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEntity,
  deleteEntity,
  listEntities,
  updateEntity,
  type EntityFormValues,
} from '@/features/entities/api'

export const entitiesKey = (portfolioId: string) =>
  ['entities', portfolioId] as const

export function useEntities(portfolioId: string | null) {
  return useQuery({
    queryKey: entitiesKey(portfolioId ?? ''),
    queryFn: () => listEntities(portfolioId as string),
    enabled: Boolean(portfolioId),
  })
}

export function useCreateEntity(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EntityFormValues) => createEntity(portfolioId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
    },
  })
}

export function useUpdateEntity(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: EntityFormValues }) =>
      updateEntity(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
    },
  })
}

export function useDeleteEntity(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
    },
  })
}
