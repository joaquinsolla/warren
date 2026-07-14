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

/** Etiqueta en singular, para describir un activo concreto. */
export const ASSET_TYPE_LABELS_SINGULAR: Record<AssetType, string> = {
  STOCK: 'Acción',
  ETF: 'ETF',
  INDEX: 'Índice',
  CRYPTO: 'Criptomoneda',
  BOND: 'Bono',
  FUND: 'Fondo',
  COMMODITY: 'Materia prima',
  FOREX: 'Divisa',
  OTHER: 'Otro',
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

/** Término para la cantidad de cada activo según su tipo (plural). */
export const ASSET_UNIT_LABELS: Record<AssetType, string> = {
  STOCK: 'Acciones',
  ETF: 'Participaciones',
  INDEX: 'Participaciones',
  CRYPTO: 'Unidades',
  BOND: 'Títulos',
  FUND: 'Participaciones',
  COMMODITY: 'Unidades',
  FOREX: 'Unidades',
  OTHER: 'Unidades',
}

export function unitLabel(type: AssetType | undefined): string {
  return type ? ASSET_UNIT_LABELS[type] : 'Unidades'
}
