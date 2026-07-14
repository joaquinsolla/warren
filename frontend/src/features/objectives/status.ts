import type { InvestmentObjective } from '@/features/objectives/api'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Estado "cumplido" de un objetivo. Es derivado (no se persiste) y volátil:
 * puede dejar de cumplirse si el precio cae. Un objetivo se considera cumplido
 * cuando se alcanza alguna de sus metas evaluables:
 *   - Precio: precio actual (manual) ≥ `target_price`.
 *   - Fecha: hoy ≥ `target_date`.
 * `target_body` es texto libre y no se evalúa automáticamente.
 */
export function isObjectiveMet(
  objective: Pick<InvestmentObjective, 'target_price' | 'target_date'>,
  currentPrice: number | null,
): boolean {
  const priceMet =
    objective.target_price != null &&
    currentPrice != null &&
    currentPrice >= objective.target_price
  const dateMet =
    objective.target_date != null && todayStr() >= objective.target_date
  return priceMet || dateMet
}
