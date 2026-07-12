import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Holding = Database['public']['Tables']['holdings']['Row']

/** Lista las posiciones abiertas de las entidades del portfolio. */
export async function listHoldings(entityIds: string[]): Promise<Holding[]> {
  if (entityIds.length === 0) return []
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .in('entity_id', entityIds)
  if (error) throw error
  return data ?? []
}

/** Obtiene una posición por id. RLS valida propiedad vía entidad. */
export async function getHoldingById(id: string): Promise<Holding | null> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}
