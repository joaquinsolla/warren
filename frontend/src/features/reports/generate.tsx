import { pdf } from '@react-pdf/renderer'
import type { EntityReportData, GlobalReportData } from './buildReportData'
import { EntityReport } from './pdf/EntityReport'
import { GlobalReport } from './pdf/GlobalReport'

/**
 * Genera el PDF a partir del modelo del informe. Vive en su propio módulo para
 * que `@react-pdf/renderer` (pesado) se cargue de forma diferida: solo entra en
 * el bundle cuando el usuario pulsa "Generar informe".
 */
export async function generateReportBlob(
  data: EntityReportData | GlobalReportData,
): Promise<Blob> {
  const doc =
    data.kind === 'entity' ? (
      <EntityReport data={data} />
    ) : (
      <GlobalReport data={data} />
    )
  return pdf(doc).toBlob()
}
