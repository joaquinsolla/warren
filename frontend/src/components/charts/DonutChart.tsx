import * as React from 'react'
import { formatMoney } from '@/lib/currencies'
import type { DonutSegment } from '@/features/portfolios/patrimonio'

const SIZE = 200
const STROKE = 26
const R = (SIZE - STROKE) / 2
const C = SIZE / 2

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

export function DonutChart({
  segments,
  total,
  base,
  colorOf,
}: {
  segments: DonutSegment[]
  total: number
  base: string
  colorOf: (entityId: string) => string
}) {
  const [hover, setHover] = React.useState<number | null>(null)

  if (segments.length === 0 || total <= 0) {
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm">
        Sin patrimonio para distribuir.
      </div>
    )
  }

  let angle = 0
  const arcs = segments.map((seg, i) => {
    const sweep = (seg.value / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { seg, start, end, i }
  })

  // Agrupa la leyenda por entidad (efectivo + inversiones).
  const byEntity = new Map<
    string,
    { name: string; cash: number; invested: number }
  >()
  for (const seg of segments) {
    const row = byEntity.get(seg.entityId) ?? {
      name: seg.entityName,
      cash: 0,
      invested: 0,
    }
    if (seg.kind === 'cash') row.cash += seg.value
    else row.invested += seg.value
    byEntity.set(seg.entityId, row)
  }

  const hovered = hover !== null ? segments[hover] : null

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {arcs.map(({ seg, start, end, i }) => (
            <path
              key={i}
              d={arcPath(start, end)}
              fill="none"
              stroke={colorOf(seg.entityId)}
              strokeWidth={hover === i ? STROKE + 4 : STROKE}
              strokeOpacity={seg.kind === 'invested' ? 0.5 : 1}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hovered ? (
            <>
              <span className="text-muted-foreground max-w-[7rem] truncate text-center text-xs">
                {hovered.entityName}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(hovered.value, base)}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {hovered.kind === 'cash' ? 'Efectivo' : 'Inversiones'} ·{' '}
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
        {[...byEntity.entries()].map(([id, row]) => {
          const subtotal = row.cash + row.invested
          return (
            <li key={id} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorOf(id) }}
                  />
                  <span className="truncate font-medium">{row.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(subtotal, base)}
                </span>
              </div>
              <p className="text-muted-foreground pl-4.5 text-xs tabular-nums">
                Efectivo {formatMoney(row.cash, base)} · Inversiones{' '}
                {formatMoney(row.invested, base)}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
