import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEntity,
  deleteEntity,
  getEntityById,
  listEntities,
  updateEntity,
  type EntityFormValues,
} from '@/features/entities/api'

export const entitiesKey = (portfolioId: string) =>
  ['entities', portfolioId] as const

export const allEntitiesKey = (portfolioId: string) =>
  ['entities', portfolioId, 'all'] as const

export function useEntities(portfolioId: string | null) {
  return useQuery({
    queryKey: entitiesKey(portfolioId ?? ''),
    queryFn: () => listEntities(portfolioId as string),
    enabled: Boolean(portfolioId),
  })
}

/** Incluye entidades eliminadas. Para resolver nombres en el histórico. */
export function useAllEntities(portfolioId: string | null) {
  return useQuery({
    queryKey: allEntitiesKey(portfolioId ?? ''),
    queryFn: () => listEntities(portfolioId as string, true),
    enabled: Boolean(portfolioId),
  })
}

export const entityKey = (id: string) => ['entity', id] as const

export function useEntity(id: string | undefined) {
  return useQuery({
    queryKey: entityKey(id ?? ''),
    queryFn: () => getEntityById(id as string),
    enabled: Boolean(id),
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
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
      queryClient.invalidateQueries({ queryKey: entityKey(id) })
    },
  })
}

export function useDeleteEntity(portfolioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEntity(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: entitiesKey(portfolioId) })
      queryClient.invalidateQueries({ queryKey: entityKey(id) })
    },
  })
}
