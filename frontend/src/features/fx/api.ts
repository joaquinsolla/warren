import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type FxRate = Database['public']['Tables']['fx_rates']['Row']
export type FxRateHistory =
  Database['public']['Tables']['fx_rate_history']['Row']

/** Lista los tipos de cambio manuales del usuario (RLS filtra por dueño). */
export async function listFxRates(): Promise<FxRate[]> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .order('currency', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Crea o actualiza el tipo actual de una divisa (1 currency = rate_to_base base).
 * Mantiene el histórico (`fx_rate_history`) con una entrada por día = el tipo
 * más reciente de ese día: registra el valor vigente en la fecha de hoy (varias
 * ediciones el mismo día se sobrescriben) y preserva el valor anterior en su
 * día de inicio para no perder tramos de días pasados.
 */
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

  const { data: existing } = await supabase
    .from('fx_rates')
    .select('rate_to_base, updated_at')
    .eq('user_id', user.id)
    .eq('currency', currency)
    .maybeSingle()

  const { data, error } = await supabase
    .from('fx_rates')
    .upsert(
      { user_id: user.id, currency, rate_to_base: rateToBase },
      { onConflict: 'user_id,currency' },
    )
    .select()
    .single()
  if (error) throw error

  const today = new Date().toISOString().slice(0, 10)

  // Preserva el valor anterior en su día de inicio (si fue un día pasado);
  // si empezó hoy, quedará sobrescrito por el punto de hoy más abajo.
  if (existing && existing.rate_to_base !== rateToBase) {
    const startDate = existing.updated_at.slice(0, 10)
    if (startDate !== today) {
      const { error: histError } = await supabase
        .from('fx_rate_history')
        .upsert(
          {
            user_id: user.id,
            currency,
            rate_to_base: existing.rate_to_base,
            effective_date: startDate,
          },
          { onConflict: 'user_id,currency,effective_date' },
        )
      if (histError) throw histError
    }
  }

  // Registra el tipo vigente como punto de hoy (el más reciente del día gana).
  const { error: todayError } = await supabase.from('fx_rate_history').upsert(
    {
      user_id: user.id,
      currency,
      rate_to_base: rateToBase,
      effective_date: today,
    },
    { onConflict: 'user_id,currency,effective_date' },
  )
  if (todayError) throw todayError

  return data
}

export async function deleteFxRate(id: string): Promise<void> {
  const { error } = await supabase.from('fx_rates').delete().eq('id', id)
  if (error) throw error
}

/** Lista todos los puntos históricos de tipos de cambio del usuario. */
export async function listFxRateHistory(): Promise<FxRateHistory[]> {
  const { data, error } = await supabase
    .from('fx_rate_history')
    .select('*')
    .order('currency', { ascending: true })
    .order('effective_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Crea o actualiza el tipo de una divisa vigente en una fecha concreta.
 * (user_id, currency, effective_date) es único.
 */
export async function upsertFxRateHistory(
  currency: string,
  rateToBase: number,
  effectiveDate: string,
): Promise<FxRateHistory> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No hay sesión activa')

  const { data, error } = await supabase
    .from('fx_rate_history')
    .upsert(
      {
        user_id: user.id,
        currency,
        rate_to_base: rateToBase,
        effective_date: effectiveDate,
      },
      { onConflict: 'user_id,currency,effective_date' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFxRateHistory(id: string): Promise<void> {
  const { error } = await supabase.from('fx_rate_history').delete().eq('id', id)
  if (error) throw error
}
