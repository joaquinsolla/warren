import * as React from 'react'
import { formatMoney } from '@/lib/currencies'
import { useElementWidth } from '@/hooks/useElementWidth'
import type { TimelinePoint } from '@/features/portfolios/patrimonio'

const DAY = 86_400_000
const RANGES = [
  { key: '1D', ms: DAY },
  { key: '1S', ms: 7 * DAY },
  { key: '1M', ms: 30 * DAY },
  { key: '1A', ms: 365 * DAY },
  { key: '5A', ms: 5 * 365 * DAY },
  { key: 'MAX', ms: Infinity },
] as const

type RangeKey = (typeof RANGES)[number]['key']

const HEIGHT = 220
const PAD_TOP = 12
const PAD_BOTTOM = 20
const EPS_RANGE = 1e-6

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function GrowthChart({
  points,
  base,
}: {
  points: TimelinePoint[]
  base: string
}) {
  const [range, setRange] = React.useState<RangeKey>('MAX')
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = React.useState<number | null>(null)
  const gradId = React.useId()

  const now = React.useMemo(() => Date.now(), [])

  const series = React.useMemo(() => {
    if (points.length === 0) return [] as TimelinePoint[]
    const cfg = RANGES.find((r) => r.key === range)!
    const start = cfg.ms === Infinity ? points[0].t : now - cfg.ms
    // Valor de arranque = último punto anterior al inicio de la ventana.
    let baseline = points[0].value
    for (const p of points) {
      if (p.t <= start) baseline = p.value
      else break
    }
    const inWindow = points.filter((p) => p.t > start && p.t <= now)
    const result: TimelinePoint[] = [{ t: start, value: baseline }]
    for (const p of inWindow) result.push(p)
    const lastValue = result[result.length - 1].value
    if (result[result.length - 1].t < now) {
      result.push({ t: now, value: lastValue })
    }
    return result
  }, [points, range, now])

  if (points.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[220px] items-center justify-center rounded-xl border border-dashed text-sm">
        Sin movimientos todavía. Registra operaciones para ver tu evolución.
      </div>
    )
  }

  const minT = series[0].t
  const maxT = series[series.length - 1].t
  const spanT = Math.max(maxT - minT, 1)
  const values = series.map((p) => p.value)
  let minV = Math.min(...values)
  let maxV = Math.max(...values)
  if (maxV - minV < EPS_RANGE) {
    const pad = Math.max(Math.abs(maxV) * 0.05, 1)
    minV -= pad
    maxV += pad
  } else {
    const pad = (maxV - minV) * 0.08
    minV -= pad
    maxV += pad
  }
  const spanV = Math.max(maxV - minV, 1)

  const w = width || 600
  const x = (t: number) => ((t - minT) / spanT) * w
  const y = (v: number) =>
    PAD_TOP + (1 - (v - minV) / spanV) * (HEIGHT - PAD_TOP - PAD_BOTTOM)

  const linePath = series
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(2)} ${y(p.value).toFixed(2)}`,
    )
    .join(' ')
  const areaPath =
    `${linePath} L ${x(maxT).toFixed(2)} ${(HEIGHT - PAD_BOTTOM).toFixed(2)}` +
    ` L ${x(minT).toFixed(2)} ${(HEIGHT - PAD_BOTTOM).toFixed(2)} Z`

  const first = series[0].value
  const last = series[series.length - 1].value
  const up = last >= first
  const color = up ? 'var(--positive)' : 'var(--negative)'
  const delta = last - first
  const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const t = minT + frac * spanT
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < series.length; i++) {
      const d = Math.abs(series[i].t - t)
      if (d < best) {
        best = d
        nearest = i
      }
    }
    setHover(nearest)
  }

  const hoverPoint = hover !== null ? series[hover] : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="space-y-0.5">
          <p className="text-muted-foreground text-xs">
            Evolución del patrimonio
          </p>
          <p
            className="text-sm font-medium tabular-nums"
            style={{ color: delta === 0 ? undefined : color }}
          >
            {delta >= 0 ? '+' : ''}
            {formatMoney(delta, base)}
            {first !== 0 && (
              <span className="text-muted-foreground ml-1">
                ({delta >= 0 ? '+' : ''}
                {pct.toFixed(1)}%)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={
                'rounded-md px-2 py-1 text-xs font-medium transition-colors ' +
                (range === r.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50')
              }
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className="relative">
        <svg
          width={w}
          height={HEIGHT}
          viewBox={`0 0 ${w} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block w-full touch-none select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {hoverPoint && (
            <line
              x1={x(hoverPoint.t)}
              y1={PAD_TOP}
              x2={x(hoverPoint.t)}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {hoverPoint && (
          <span
            className="pointer-events-none absolute z-10 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${(x(hoverPoint.t) / w) * 100}%`,
              top: `${y(hoverPoint.value)}px`,
              backgroundColor: color,
              boxShadow: '0 0 0 2px var(--background)',
            }}
          />
        )}

        {hoverPoint && (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 rounded-md border px-2 py-1 text-xs shadow-sm"
            style={{
              left: `${(x(hoverPoint.t) / w) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="font-medium tabular-nums">
              {formatMoney(hoverPoint.value, base)}
            </span>
            <span className="text-muted-foreground ml-1">
              {dateFmt.format(new Date(hoverPoint.t))}
            </span>
          </div>
        )}

        <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
          <span>{dateFmt.format(new Date(minT))}</span>
          <span>{dateFmt.format(new Date(maxT))}</span>
        </div>
      </div>
    </div>
  )
}
