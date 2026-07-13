import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type InvestmentObjective =
  Database['public']['Tables']['investment_objectives']['Row']

export type ObjectiveFormValues = {
  target_body: string | null
  target_price: number | null
  target_date: string | null
}

/** Lista los objetivos de un portfolio (RLS filtra por dueño). */
export async function listObjectives(
  portfolioId: string,
): Promise<InvestmentObjective[]> {
  const { data, error } = await supabase
    .from('investment_objectives')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export type CreateObjectiveInput = ObjectiveFormValues & {
  portfolio_id: string
  asset_id: string
  entity_id: string | null
  transaction_id: string | null
}

export async function createObjective(
  input: CreateObjectiveInput,
): Promise<InvestmentObjective> {
  const { data, error } = await supabase
    .from('investment_objectives')
    .insert({
      portfolio_id: input.portfolio_id,
      asset_id: input.asset_id,
      entity_id: input.entity_id,
      transaction_id: input.transaction_id,
      target_body: input.target_body,
      target_price: input.target_price,
      target_date: input.target_date,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateObjective(
  id: string,
  values: ObjectiveFormValues,
): Promise<InvestmentObjective> {
  const { data, error } = await supabase
    .from('investment_objectives')
    .update({
      target_body: values.target_body,
      target_price: values.target_price,
      target_date: values.target_date,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteObjective(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_objectives')
    .delete()
    .eq('id', id)
  if (error) throw error
}
