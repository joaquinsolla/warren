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
}

/** Lista los activos del usuario (RLS filtra por dueño). */
export async function listAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('symbol', { ascending: true })
  if (error) throw error
  return data ?? []
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
      asset_type: values.asset_type,
      currency: values.currency,
      isin: values.isin,
      exchange: values.exchange,
      icon_domain: values.icon_domain,
      color: values.color,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}
