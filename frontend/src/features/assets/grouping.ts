import type { AssetType } from '@/features/assets/api'
import { ASSET_TYPE_LABELS, ASSET_TYPE_ORDER } from '@/features/assets/labels'

export type AssetTypeGroup<T> = {
  type: AssetType
  label: string
  items: T[]
}

/**
 * Agrupa una lista por tipo de activo, respetando ASSET_TYPE_ORDER y
 * descartando los grupos vacíos. Los elementos sin tipo caen en "OTHER".
 */
export function groupByAssetType<T>(
  items: T[],
  getType: (item: T) => AssetType | undefined,
): AssetTypeGroup<T>[] {
  const buckets = new Map<AssetType, T[]>()
  for (const item of items) {
    const type = getType(item) ?? 'OTHER'
    const bucket = buckets.get(type)
    if (bucket) bucket.push(item)
    else buckets.set(type, [item])
  }
  return ASSET_TYPE_ORDER.map((type) => ({
    type,
    label: ASSET_TYPE_LABELS[type],
    items: buckets.get(type) ?? [],
  })).filter((group) => group.items.length > 0)
}
