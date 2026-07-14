import { Text, View, Svg, Polyline, Line, Path } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { formatMoney } from '@/lib/currencies'
import type { TimelinePoint } from '@/features/portfolios/patrimonio'
import { COLORS, styles } from './theme'

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(ms: number): string {
  return dateFmt.format(new Date(ms))
}

export function formatDateTime(ms: number): string {
  return dateTimeFmt.format(new Date(ms))
}

/** Inicial de marca para el badge (misma lógica que BrandIcon). */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function ReportHeader({
  name,
  subtitle,
  color,
  generatedAt,
}: {
  name: string
  subtitle: string
  color: string | null
  generatedAt: number
}) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.badge, { backgroundColor: color ?? COLORS.accent }]}
          >
            <Text style={styles.badgeText}>{initial(name)}</Text>
          </View>
          <View>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.brandName}>Warren</Text>
          <Text style={styles.metaText}>
            Informe · {formatDate(generatedAt)}
          </Text>
        </View>
      </View>
      <View style={styles.rule} />
    </>
  )
}

export function ReportFooter({ generatedAt }: { generatedAt: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Warren · Generado el {formatDateTime(generatedAt)}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

export function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export function Money({
  value,
  currency,
  signed = false,
  bold = false,
  muted = false,
}: {
  value: number
  currency: string
  signed?: boolean
  bold?: boolean
  muted?: boolean
}) {
  const style: Style[] = [styles.mono]
  if (bold) style.push(styles.tdBold)
  if (muted) style.push(styles.muted)
  else if (signed) style.push(value >= 0 ? styles.positive : styles.negative)
  const prefix = signed && value >= 0 ? '+' : ''
  return <Text style={style}>{`${prefix}${formatMoney(value, currency)}`}</Text>
}

/** Tarjeta métrica destacada. `tone`: colorea el valor. */
export function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'positive' | 'negative'
}) {
  const valStyle: Style[] = [styles.cardValue]
  if (tone === 'positive') valStyle.push(styles.positive)
  if (tone === 'negative') valStyle.push(styles.negative)
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={valStyle}>{value}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    </View>
  )
}

/** Importe compacto para el eje (p. ej. "12,3 mil €", "1,2 M €"). */
function formatCompact(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return String(Math.round(value))
  }
}

/**
 * Gráfica de línea vectorial de la evolución del patrimonio, dibujada con las
 * primitivas SVG de react-pdf (nítida, sin capturar el DOM).
 */
export function TimelineChart({
  points,
  currency,
}: {
  points: TimelinePoint[]
  currency: string
}) {
  const width = 507
  const height = 150
  const gutter = 52
  const chartW = width - gutter
  const padL = 4
  const padR = 6
  const padT = 10
  const padB = 18

  if (points.length < 2) {
    return <Text style={styles.empty}>Aún no hay histórico suficiente.</Text>
  }

  // Prolonga la serie hasta hoy (línea plana al último valor conocido) para que
  // la gráfica llegue siempre a la fecha actual, no al último dato registrado.
  const now = Date.now()
  const lastPoint = points[points.length - 1]
  const pts =
    now > lastPoint.t ? [...points, { t: now, value: lastPoint.value }] : points

  const ts = pts.map((p) => p.t)
  const vs = pts.map((p) => p.value)
  const tMin = Math.min(...ts)
  const tMax = Math.max(...ts)
  const vMin = Math.min(...vs, 0)
  const vMax = Math.max(...vs)
  const tSpan = tMax - tMin || 1
  const vSpan = vMax - vMin || 1

  const x = (t: number) => padL + ((t - tMin) / tSpan) * (chartW - padL - padR)
  const y = (v: number) =>
    padT + (1 - (v - vMin) / vSpan) * (height - padT - padB)

  const coords = pts.map((p) => `${x(p.t)},${y(p.value)}`).join(' ')
  const areaPath =
    `M ${x(pts[0].t)},${y(0)} ` +
    pts.map((p) => `L ${x(p.t)},${y(p.value)}`).join(' ') +
    ` L ${x(pts[pts.length - 1].t)},${y(0)} Z`

  const first = pts[0].value
  const last = pts[pts.length - 1].value
  const up = last >= first
  const stroke = up ? COLORS.positive : COLORS.negative

  // Marcas del eje Y (de arriba a abajo): valor máximo, intermedios y mínimo.
  const tickCount = 4
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const value = vMax - (i * vSpan) / (tickCount - 1)
    return { value, yPos: y(value) }
  })

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: gutter, height, position: 'relative' }}>
          {ticks.map((tk, i) => (
            <Text
              key={i}
              style={{
                position: 'absolute',
                top: tk.yPos - 4,
                right: 6,
                width: gutter - 6,
                textAlign: 'right',
                fontSize: 6.5,
                color: COLORS.faint,
              }}
            >
              {formatCompact(tk.value, currency)}
            </Text>
          ))}
        </View>
        <Svg width={chartW} height={height}>
          {ticks.map((tk, i) => (
            <Line
              key={i}
              x1={padL}
              y1={tk.yPos}
              x2={chartW - padR}
              y2={tk.yPos}
              strokeWidth={0.5}
              stroke={tk.value === 0 ? COLORS.border : '#eef2f6'}
            />
          ))}
          <Path d={areaPath} fill={stroke} fillOpacity={0.12} />
          <Polyline
            points={coords}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
          />
        </Svg>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 2,
          marginLeft: gutter,
        }}
      >
        <Text style={styles.metaText}>
          {formatDate(tMin)} · {formatMoney(first, currency)}
        </Text>
        <Text style={styles.metaText}>
          {formatDate(tMax)} · {formatMoney(last, currency)}
        </Text>
      </View>
    </View>
  )
}
