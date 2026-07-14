export type Currency = {
  code: string
  name: string
  symbol: string
}

/** Monedas comunes para el efectivo de las entidades. */
export const CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'CHF', name: 'Franco suizo', symbol: 'CHF' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$' },
  { code: 'CNY', name: 'Yuan chino', symbol: '¥' },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$' },
  { code: 'SEK', name: 'Corona sueca', symbol: 'kr' },
  { code: 'NOK', name: 'Corona noruega', symbol: 'kr' },
  { code: 'DKK', name: 'Corona danesa', symbol: 'kr' },
  { code: 'PLN', name: 'Złoty polaco', symbol: 'zł' },
  { code: 'CZK', name: 'Corona checa', symbol: 'Kč' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
  { code: 'INR', name: 'Rupia india', symbol: '₹' },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$' },
  { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$' },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R' },
  { code: 'TRY', name: 'Lira turca', symbol: '₺' },
  { code: 'AED', name: 'Dírham de EAU', symbol: 'د.إ' },
]

const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]))

export function getCurrency(code: string): Currency | undefined {
  return CURRENCY_MAP.get(code)
}

/** Número de decimales de la unidad mínima de la moneda (EUR→2, JPY→0). */
export function moneyDecimals(code: string): number {
  try {
    return (
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

/**
 * Redondea un importe a la unidad mínima de su moneda (céntimos).
 * Las cantidades de acciones y los tipos de cambio conservan toda su
 * precisión; solo el dinero que impacta un saldo de caja se redondea, igual
 * que hace un bróker real al cobrar/abonar.
 */
export function roundMoney(amount: number, code: string): number {
  const factor = 10 ** moneyDecimals(code)
  return Math.round((amount + Number.EPSILON) * factor) / factor
}

export function formatCurrencyLabel(code: string): string {
  const c = CURRENCY_MAP.get(code)
  return c ? `${c.code} · ${c.name}` : code
}

/** Formatea un importe en su moneda (locale es-ES). */
export function formatMoney(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: code,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${code}`
  }
}
