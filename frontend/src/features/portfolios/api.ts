import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Portfolio = Database['public']['Tables']['portfolios']['Row']
export type PortfolioInsert =
  Database['public']['Tables']['portfolios']['Insert']
export type PortfolioUpdate =
  Database['public']['Tables']['portfolios']['Update']

export type PortfolioFormValues = {
  name: string
  description: string | null
}

/** Lista los portfolios del usuario (RLS filtra por dueño). */
export async function listPortfolios(): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Crea un portfolio. user_id se obtiene de la sesión actual. */
export async function createPortfolio(
  values: PortfolioFormValues,
): Promise<Portfolio> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No hay sesión activa')

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id,
      name: values.name,
      description: values.description,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Actualiza nombre/descripción de un portfolio propio. */
export async function updatePortfolio(
  id: string,
  values: PortfolioFormValues,
): Promise<Portfolio> {
  const { data, error } = await supabase
    .from('portfolios')
    .update({ name: values.name, description: values.description })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Elimina un portfolio (CASCADE borra entidades y movimientos asociados). */
export async function deletePortfolio(id: string): Promise<void> {
  const { error } = await supabase.from('portfolios').delete().eq('id', id)
  if (error) throw error
}

/**
 * Reconstruye toda la caché (efectivo de entidades y holdings) del portfolio
 * desde el histórico de movimientos. Fuente de verdad = las transacciones.
 */
export async function recomputePortfolio(portfolioId: string): Promise<void> {
  const { error } = await supabase.rpc('recompute_portfolio', {
    p_portfolio_id: portfolioId,
  })
  if (error) throw error
}
