import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface BrandIconProps {
  /** Nombre de la entidad o activo (usado para el fallback con la inicial). */
  name: string
  /** Dominio de la marca (ej. 'bbva.com', 'nvidia.com'). Opcional. */
  domain?: string | null
  className?: string
}

/** Normaliza lo que escriba el usuario a un dominio limpio (sin http, sin path). */
export function normalizeDomain(
  input: string | null | undefined,
): string | null {
  if (!input) return null
  let value = input.trim().toLowerCase()
  if (!value) return null
  value = value.replace(/^https?:\/\//, '').replace(/^www\./, '')
  value = value.split('/')[0]
  return value || null
}

export function brandIconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`
}

/**
 * Muestra el icono de marca desde DuckDuckGo Icons a partir de un dominio.
 * Si no hay dominio o el icono no carga, cae al fallback con la inicial.
 */
export function BrandIcon({ name, domain, className }: BrandIconProps) {
  const [failed, setFailed] = useState(false)
  const cleanDomain = normalizeDomain(domain)

  // Reintenta cargar la imagen si cambia el dominio.
  useEffect(() => {
    setFailed(false)
  }, [cleanDomain])

  const showImage = Boolean(cleanDomain) && !failed
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium',
        className,
      )}
    >
      {showImage && cleanDomain ? (
        <img
          src={brandIconUrl(cleanDomain)}
          alt={name}
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  )
}
