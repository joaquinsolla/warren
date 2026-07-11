// =============================================================================
// Modelos fiscales para ESTIMAR el impuesto sobre plusvalías (ganancias de capital).
//
// ⚠️ AVISO: cifras APROXIMADAS con fines de estimación (personas físicas, acciones/
// ETF, tenencia a largo plazo). NO es asesoramiento fiscal. Verifica siempre con
// fuentes oficiales o un asesor. Los umbrales están en la MONEDA local del país.
//
// Última revisión aproximada: 2025.
// =============================================================================

export interface TaxBracket {
  /** Umbral superior del tramo (absoluto, en la moneda del régimen). null = sin límite. */
  upTo: number | null
  /** Tipo aplicado en el tramo (0.19 = 19%). */
  rate: number
}

export interface TaxRegime {
  label: string
  /** Moneda en la que están expresados los umbrales/exención. */
  currency: string
  /** Mínimo exento anual antes de aplicar los tramos (opcional). */
  taxFreeAllowance?: number
  /** Tramos progresivos. Un único tramo con upTo=null equivale a tipo fijo. */
  brackets: TaxBracket[]
  /** Aclaración cuando el modelo es una aproximación (renta, tenencia, etc.). */
  note?: string
}

export const DEFAULT_TAX_REGIME = 'ES'

export const TAX_REGIMES: Record<string, TaxRegime> = {
  // --- Tramos progresivos por importe -----------------------------------------
  ES: {
    label: 'España',
    currency: 'EUR',
    brackets: [
      { upTo: 6000, rate: 0.19 },
      { upTo: 50000, rate: 0.21 },
      { upTo: 200000, rate: 0.23 },
      { upTo: 300000, rate: 0.27 },
      { upTo: null, rate: 0.28 },
    ],
  },
  FI: {
    label: 'Finlandia',
    currency: 'EUR',
    brackets: [
      { upTo: 30000, rate: 0.3 },
      { upTo: null, rate: 0.34 },
    ],
  },
  DK: {
    label: 'Dinamarca',
    currency: 'DKK',
    brackets: [
      { upTo: 61000, rate: 0.27 },
      { upTo: null, rate: 0.42 },
    ],
  },

  // --- Tipo fijo --------------------------------------------------------------
  PT: {
    label: 'Portugal',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.28 }],
    note: 'Tipo fijo del 28% (existe opción de englobamiento en el IRS).',
  },
  FR: {
    label: 'Francia',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.3 }],
    note: 'PFU "flat tax" del 30% (incluye cotizaciones sociales).',
  },
  IT: {
    label: 'Italia',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.26 }],
  },
  AT: {
    label: 'Austria',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.275 }],
  },
  SE: {
    label: 'Suecia',
    currency: 'SEK',
    brackets: [{ upTo: null, rate: 0.3 }],
  },
  PL: {
    label: 'Polonia',
    currency: 'PLN',
    brackets: [{ upTo: null, rate: 0.19 }],
  },
  GR: {
    label: 'Grecia',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.15 }],
  },
  NO: {
    label: 'Noruega',
    currency: 'NOK',
    brackets: [{ upTo: null, rate: 0.3784 }],
    note: 'Aprox. 37,84% tras el factor de ajuste sobre acciones.',
  },

  // --- Tipo fijo con mínimo exento --------------------------------------------
  DE: {
    label: 'Alemania',
    currency: 'EUR',
    taxFreeAllowance: 1000,
    brackets: [{ upTo: null, rate: 0.26375 }],
    note: 'Abgeltungsteuer 25% + recargo de solidaridad (≈26,375%). Exención Sparerpauschbetrag 1.000€.',
  },
  IE: {
    label: 'Irlanda',
    currency: 'EUR',
    taxFreeAllowance: 1270,
    brackets: [{ upTo: null, rate: 0.33 }],
    note: 'CGT 33% con exención anual de 1.270€.',
  },

  // --- Casos aproximados (dependen de renta o tenencia) -----------------------
  US: {
    label: 'Estados Unidos',
    currency: 'USD',
    brackets: [
      { upTo: 47025, rate: 0.0 },
      { upTo: 518900, rate: 0.15 },
      { upTo: null, rate: 0.2 },
    ],
    note: 'Aprox. de ganancias a largo plazo (0/15/20%). En realidad depende de la renta total y puede sumar el NIIT 3,8%.',
  },
  GB: {
    label: 'Reino Unido',
    currency: 'GBP',
    taxFreeAllowance: 3000,
    brackets: [{ upTo: null, rate: 0.24 }],
    note: 'Aprox. tipo alto 24% con exención de 3.000£. El tipo real (18%/24%) depende de tu renta.',
  },
  CA: {
    label: 'Canadá',
    currency: 'CAD',
    brackets: [{ upTo: null, rate: 0.25 }],
    note: 'Aprox.: se integra el 50% de la ganancia al tipo marginal (≈25% efectivo). Depende de la renta.',
  },
  AU: {
    label: 'Australia',
    currency: 'AUD',
    brackets: [{ upTo: null, rate: 0.235 }],
    note: 'Aprox.: descuento del 50% si se mantiene >12 meses, luego tipo marginal (≈23,5% efectivo).',
  },
  NL: {
    label: 'Países Bajos',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.31 }],
    note: 'Aprox.: los Países Bajos tributan por patrimonio (box 3), no por la plusvalía real. Estimación orientativa.',
  },

  // --- Habitualmente exentos para particulares --------------------------------
  BE: {
    label: 'Bélgica',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.0 }],
    note: 'Tradicionalmente exento para inversores particulares (hay reformas en curso).',
  },
  CH: {
    label: 'Suiza',
    currency: 'CHF',
    brackets: [{ upTo: null, rate: 0.0 }],
    note: 'Las plusvalías privadas de bienes muebles suelen estar exentas.',
  },
  LU: {
    label: 'Luxemburgo',
    currency: 'EUR',
    brackets: [{ upTo: null, rate: 0.0 }],
    note: 'Exento si la tenencia supera los 6 meses (posición no significativa).',
  },
}

/** Opciones para un selector (ordenadas por etiqueta). */
export const TAX_REGIME_OPTIONS = Object.entries(TAX_REGIMES)
  .map(([value, regime]) => ({ value, label: regime.label }))
  .sort((a, b) => a.label.localeCompare(b.label))

export interface TaxConfig {
  /** Régimen/país a aplicar (clave de TAX_REGIMES). */
  regime: string
}

/**
 * Estima el impuesto sobre una ganancia NETA anual (ganancias − pérdidas).
 * Aplica primero el mínimo exento y luego los tramos progresivos del país.
 * Es un cálculo derivado: nunca se persiste.
 */
export function estimateCapitalGainsTax(
  netGain: number,
  config: TaxConfig,
): number {
  if (netGain <= 0) return 0

  const regime = TAX_REGIMES[config.regime] ?? TAX_REGIMES[DEFAULT_TAX_REGIME]

  let taxable = netGain - (regime.taxFreeAllowance ?? 0)
  if (taxable <= 0) return 0

  let prevThreshold = 0
  let tax = 0

  for (const bracket of regime.brackets) {
    const upper = bracket.upTo ?? Infinity
    const inBracket = Math.min(taxable, upper - prevThreshold)
    if (inBracket <= 0) break
    tax += inBracket * bracket.rate
    taxable -= inBracket
    prevThreshold = upper
    if (taxable <= 0) break
  }

  return tax
}
