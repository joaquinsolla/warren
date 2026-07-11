import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface BrandIconProps {
  /** Nombre de la entidad o activo (usado para el fallback con la inicial). */
  name: string
  /** Slug de Simple Icons (ej. 'nvidia', 'bbva'). Opcional. */
  slug?: string | null
  className?: string
}

/**
 * Muestra el logo de marca desde Simple Icons (vía CDN) a partir de un slug.
 * Si no hay slug o el logo no existe, cae al fallback con la inicial del nombre.
 */
export function BrandIcon({ name, slug, className }: BrandIconProps) {
  const [failed, setFailed] = useState(false)

  // Reintenta cargar la imagen si cambia el slug.
  useEffect(() => {
    setFailed(false)
  }, [slug])

  const showImage = Boolean(slug) && !failed
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className,
      )}
    >
      {showImage ? (
        <img
          src={`https://cdn.simpleicons.org/${slug}`}
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
