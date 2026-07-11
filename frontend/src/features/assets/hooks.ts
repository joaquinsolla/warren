import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
  type AssetFormValues,
} from '@/features/assets/api'

export const assetsKey = ['assets'] as const

export function useAssets() {
  return useQuery({
    queryKey: assetsKey,
    queryFn: listAssets,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AssetFormValues) => createAsset(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AssetFormValues }) =>
      updateAsset(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
    },
  })
}
