import type { CashTransactionType } from '@/features/cash/api'

export const CASH_TYPE_LABELS: Record<CashTransactionType, string> = {
  TRANSFER: 'Transferencia',
  DEPOSIT: 'Ingreso',
  WITHDRAWAL: 'Retirada',
  ADJUSTMENT: 'Ajuste',
}

export const CASH_TYPE_ORDER: CashTransactionType[] = [
  'TRANSFER',
  'DEPOSIT',
  'WITHDRAWAL',
  'ADJUSTMENT',
]
