import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type CashTransaction =
  Database['public']['Tables']['cash_transactions']['Row']
export type CashTransactionType =
  Database['public']['Enums']['cash_transaction_type']

export type CashTransactionFormValues = {
  transaction_type: CashTransactionType
  from_entity_id: string | null
  to_entity_id: string | null
  amount: number
  to_amount: number | null
  currency: string
  exchange_rate_to_base: number
  executed_at: string
  notes: string | null
}

/** Lista los movimientos de efectivo de un portfolio (RLS filtra por dueño). */
export async function listCashTransactions(
  portfolioId: string,
): Promise<CashTransaction[]> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('executed_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Obtiene un movimiento de efectivo por id. RLS filtra por dueño. */
export async function getCashTransactionById(
  id: string,
): Promise<CashTransaction | null> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createCashTransaction(
  portfolioId: string,
  values: CashTransactionFormValues,
): Promise<CashTransaction> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .insert({
      portfolio_id: portfolioId,
      transaction_type: values.transaction_type,
      from_entity_id: values.from_entity_id,
      to_entity_id: values.to_entity_id,
      amount: values.amount,
      to_amount: values.to_amount,
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

export async function updateCashTransaction(
  id: string,
  values: CashTransactionFormValues,
): Promise<CashTransaction> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .update({
      transaction_type: values.transaction_type,
      from_entity_id: values.from_entity_id,
      to_entity_id: values.to_entity_id,
      amount: values.amount,
      to_amount: values.to_amount,
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

export async function deleteCashTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
