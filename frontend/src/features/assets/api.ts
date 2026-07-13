import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Asset = Database['public']['Tables']['assets']['Row']
export type AssetType = Database['public']['Enums']['asset_type']

export type AssetFormValues = {
  symbol: string
  name: string
  asset_type: AssetType
  currency: string
  isin: string | null
  exchange: string | null
  icon_domain: string | null
  color: string | null
  manual_price: number
}

/** Lista los activos del usuario (RLS filtra por dueño). */
export async function listAssets(includeDeleted = false): Promise<Asset[]> {
  let query = supabase.from('assets').select('*')
  if (!includeDeleted) query = query.is('deleted_at', null)
  const { data, error } = await query.order('symbol', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Obtiene un activo por id. RLS filtra por dueño. */
export async function getAssetById(id: string): Promise<Asset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Crea un activo. user_id se obtiene de la sesión actual. */
export async function createAsset(values: AssetFormValues): Promise<Asset> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No hay sesión activa')

  const { data, error } = await supabase
    .from('assets')
    .insert({
      user_id: user.id,
      symbol: values.symbol,
      name: values.name,
      asset_type: values.asset_type,
      currency: values.currency,
      isin: values.isin,
      exchange: values.exchange,
      icon_domain: values.icon_domain,
      color: values.color,
      manual_price: values.manual_price,
      manual_price_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAsset(
  id: string,
  values: AssetFormValues,
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update({
      symbol: values.symbol,
      name: values.name,
      // asset_type es inmutable: no se envía en updates.
      currency: values.currency,
      isin: values.isin,
      exchange: values.exchange,
      icon_domain: values.icon_domain,
      color: values.color,
      manual_price: values.manual_price,
      manual_price_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Borrado lógico: marca el activo como eliminado conservando su histórico. */
export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Actualiza el precio manual (estimación) de un activo, guardando también la
 * fecha. El precio es obligatorio y debe ser positivo. No toca el histórico ni
 * el patrimonio a coste, solo la vista de valor estimado.
 */
export async function updateAssetPrice(
  id: string,
  price: number,
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update({
      manual_price: price,
      manual_price_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
