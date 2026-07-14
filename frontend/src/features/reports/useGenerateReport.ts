import * as React from 'react'
import type { EntityReportData, GlobalReportData } from './buildReportData'

type ReportData = EntityReportData | GlobalReportData

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'informe'
  )
}

/** Nombre de archivo: `warren-<slug>-YYYY-MM-DD.pdf`. */
export function reportFilename(name: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `warren-${slugify(name)}-${date}.pdf`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Genera y descarga un informe PDF. El modelo se construye en el momento del
 * clic (`build`) y `@react-pdf/renderer` se importa de forma diferida, por lo
 * que no penaliza la carga inicial de la app.
 */
export function useGenerateReport() {
  const [isGenerating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const generate = React.useCallback(
    async (build: () => ReportData | null, filename: string) => {
      setGenerating(true)
      setError(null)
      try {
        const data = build()
        if (!data) {
          setError('No hay datos para generar el informe.')
          return
        }
        const { generateReportBlob } = await import('./generate')
        const blob = await generateReportBlob(data)
        triggerDownload(blob, filename)
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Error al generar el informe.',
        )
      } finally {
        setGenerating(false)
      }
    },
    [],
  )

  return { generate, isGenerating, error }
}
