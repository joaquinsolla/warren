import type { AssetType } from '@/features/assets/api'

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: 'Acciones',
  ETF: 'ETFs',
  INDEX: 'Índices',
  CRYPTO: 'Criptomonedas',
  BOND: 'Bonos',
  FUND: 'Fondos',
  COMMODITY: 'Materias primas',
  FOREX: 'Divisas',
  OTHER: 'Otros',
}

export const ASSET_TYPE_ORDER: AssetType[] = [
  'STOCK',
  'ETF',
  'INDEX',
  'CRYPTO',
  'BOND',
  'FUND',
  'COMMODITY',
  'FOREX',
  'OTHER',
]
