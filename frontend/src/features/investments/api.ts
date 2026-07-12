import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type InvestmentTransaction =
  Database['public']['Tables']['investment_transactions']['Row']
export type InvestmentTransactionType =
  Database['public']['Enums']['investment_transaction_type']

export type InvestmentFormValues = {
  entity_id: string
  asset_id: string
  transaction_type: InvestmentTransactionType
  quantity: number
  price_per_unit: number
  gross_amount: number
  fees: number
  taxes: number
  currency: string
  exchange_rate_to_base: number
  executed_at: string
  notes: string | null
}

/** Lista los movimientos de inversión de las entidades del portfolio. */
export async function listInvestmentTransactions(
  entityIds: string[],
): Promise<InvestmentTransaction[]> {
  if (entityIds.length === 0) return []
  const { data, error } = await supabase
    .from('investment_transactions')
    .select('*')
    .in('entity_id', entityIds)
    .order('executed_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Obtiene un movimiento de inversión por id. RLS valida propiedad. */
export async function getInvestmentTransactionById(
  id: string,
): Promise<InvestmentTransaction | null> {
  const { data, error } = await supabase
    .from('investment_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createInvestmentTransaction(
  values: InvestmentFormValues,
): Promise<InvestmentTransaction> {
  const { data, error } = await supabase
    .from('investment_transactions')
    .insert({
      entity_id: values.entity_id,
      asset_id: values.asset_id,
      transaction_type: values.transaction_type,
      quantity: values.quantity,
      price_per_unit: values.price_per_unit,
      gross_amount: values.gross_amount,
      fees: values.fees,
      taxes: values.taxes,
      currency: values.currency,
      exchange_rate_to_base: values.exchange_rate_to_base,
      executed_at: values.executed_at,
      notes: values.notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInvestmentTransaction(
  id: string,
  values: InvestmentFormValues,
): Promise<InvestmentTransaction> {
  const { data, error } = await supabase
    .from('investment_transactions')
    .update({
      entity_id: values.entity_id,
      asset_id: values.asset_id,
      transaction_type: values.transaction_type,
      quantity: values.quantity,
      price_per_unit: values.price_per_unit,
      gross_amount: values.gross_amount,
      fees: values.fees,
      taxes: values.taxes,
      currency: values.currency,
      exchange_rate_to_base: values.exchange_rate_to_base,
      executed_at: values.executed_at,
      notes: values.notes,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInvestmentTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
