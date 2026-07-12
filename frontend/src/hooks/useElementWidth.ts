import * as React from 'react'

/**
 * Devuelve el ancho en píxeles de un elemento, observando cambios de tamaño.
 * Útil para dibujar SVGs nítidos (grosores de línea sin distorsión).
 */
export function useElementWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = React.useRef<T>(null)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
