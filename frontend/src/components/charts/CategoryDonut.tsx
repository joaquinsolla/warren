import * as React from 'react'
import { formatMoney } from '@/lib/currencies'

const SIZE = 200
const STROKE = 26
const R = (SIZE - STROKE) / 2
const C = SIZE / 2

export type CategorySlice = { label: string; value: number; color: string }

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polar(C, C, R, endAngle)
  const end = polar(C, C, R, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

/** Donut genérico para pocas categorías (etiqueta + valor + color). */
export function CategoryDonut({
  slices,
  base,
  emptyLabel = 'Sin datos para distribuir.',
}: {
  slices: CategorySlice[]
  base: string
  emptyLabel?: string
}) {
  const [hover, setHover] = React.useState<number | null>(null)

  const visible = slices.filter((s) => s.value > 0)
  const total = visible.reduce((sum, s) => sum + s.value, 0)

  if (visible.length === 0 || total <= 0) {
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm">
        {emptyLabel}
      </div>
    )
  }

  let angle = 0
  const arcs = visible.map((slice, i) => {
    const sweep = (slice.value / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { slice, start, end, i }
  })

  const hovered = hover !== null ? visible[hover] : null

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {arcs.map(({ slice, start, end, i }) =>
            end - start >= 359.999 ? (
              <circle
                key={i}
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === i ? STROKE + 4 : STROKE}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            ) : (
              <path
                key={i}
                d={arcPath(start, end)}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === i ? STROKE + 4 : STROKE}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            ),
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hovered ? (
            <>
              <span className="text-muted-foreground text-xs">
                {hovered.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(hovered.value, base)}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {((hovered.value / total) * 100).toFixed(0)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-xs">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(total, base)}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="w-full space-y-2 text-sm">
        {visible.map((slice, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate font-medium">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatMoney(slice.value, base)}
              <span className="text-muted-foreground ml-1">
                {((slice.value / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
