import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type FxRate = Database['public']['Tables']['fx_rates']['Row']

/** Lista los tipos de cambio manuales del usuario (RLS filtra por dueño). */
export async function listFxRates(): Promise<FxRate[]> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .order('currency', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Crea o actualiza el tipo de una divisa (1 currency = rate_to_base base). */
export async function upsertFxRate(
  currency: string,
  rateToBase: number,
): Promise<FxRate> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No hay sesión activa')

  const { data, error } = await supabase
    .from('fx_rates')
    .upsert(
      { user_id: user.id, currency, rate_to_base: rateToBase },
      { onConflict: 'user_id,currency' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFxRate(id: string): Promise<void> {
  const { error } = await supabase.from('fx_rates').delete().eq('id', id)
  if (error) throw error
}
