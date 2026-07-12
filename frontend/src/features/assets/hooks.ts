import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAsset,
  deleteAsset,
  getAssetById,
  listAssets,
  updateAsset,
  type AssetFormValues,
} from '@/features/assets/api'

export const assetsKey = ['assets'] as const
export const allAssetsKey = ['assets', 'all'] as const

export function useAssets() {
  return useQuery({
    queryKey: assetsKey,
    queryFn: () => listAssets(),
  })
}

/** Incluye activos eliminados. Para resolver símbolos en el histórico. */
export function useAllAssets() {
  return useQuery({
    queryKey: allAssetsKey,
    queryFn: () => listAssets(true),
  })
}

export const assetKey = (id: string) => ['asset', id] as const

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKey(id ?? ''),
    queryFn: () => getAssetById(id as string),
    enabled: Boolean(id),
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
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
      queryClient.invalidateQueries({ queryKey: assetKey(id) })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
      queryClient.invalidateQueries({ queryKey: assetKey(id) })
    },
  })
}
