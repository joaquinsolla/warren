import * as React from 'react'

/**
 * Devuelve las variables CSS de accent de marca para una entidad/activo.
 * Si `color` es null/indefinido, no sobreescribe nada y se usa el tema
 * monocromo por defecto. Pasa el resultado a la prop `style` de un contenedor;
 * dentro, usa las clases `bg-brand`, `text-brand`, etc.
 */
export function brandStyle(color?: string | null): React.CSSProperties {
  if (!color) return {}
  return {
    ['--brand' as string]: color,
    ['--brand-foreground' as string]: readableForeground(color),
  }
}

/**
 * Elige texto claro u oscuro según la luminancia del color de fondo, para que
 * el contenido sobre el accent siempre sea legible.
 */
function readableForeground(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.6 ? '#0a0a0a' : '#ffffff'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.trim().replace('#', '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (value.length !== 6) return null
  const int = Number.parseInt(value, 16)
  if (Number.isNaN(int)) return null
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}
