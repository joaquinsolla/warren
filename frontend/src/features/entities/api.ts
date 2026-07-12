import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Entity = Database['public']['Tables']['entities']['Row']
export type EntityType = Database['public']['Enums']['entity_type']

export type EntityFormValues = {
  name: string
  type: EntityType
  currency: string
  icon_domain: string | null
  color: string | null
}

/** Lista las entidades de un portfolio (RLS valida propiedad). */
export async function listEntities(
  portfolioId: string,
  includeDeleted = false,
): Promise<Entity[]> {
  let query = supabase
    .from('entities')
    .select('*')
    .eq('portfolio_id', portfolioId)
  if (!includeDeleted) query = query.is('deleted_at', null)
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Obtiene una entidad por id (incluye eliminadas). RLS valida propiedad. */
export async function getEntityById(id: string): Promise<Entity | null> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createEntity(
  portfolioId: string,
  values: EntityFormValues,
): Promise<Entity> {
  const { data, error } = await supabase
    .from('entities')
    .insert({
      portfolio_id: portfolioId,
      name: values.name,
      type: values.type,
      currency: values.currency,
      icon_domain: values.icon_domain,
      color: values.color,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEntity(
  id: string,
  values: EntityFormValues,
): Promise<Entity> {
  const { data, error } = await supabase
    .from('entities')
    .update({
      name: values.name,
      // type es inmutable: no se envía en updates.
      currency: values.currency,
      icon_domain: values.icon_domain,
      color: values.color,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Borrado lógico: marca la entidad como eliminada conservando su histórico. */
export async function deleteEntity(id: string): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
