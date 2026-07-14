import { Document, Page, Text, View } from '@react-pdf/renderer'
import { formatMoney } from '@/lib/currencies'
import type { EntityReportData } from '../buildReportData'
import { COLORS, styles } from './theme'
import {
  MetricCard,
  Money,
  ReportFooter,
  ReportHeader,
  Section,
  TimelineChart,
} from './components'

function pct(v: number | null): string {
  return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

export function EntityReport({ data }: { data: EntityReportData }) {
  const cur = data.entity.currency
  const b = data.balance

  return (
    <Document
      title={`Informe · ${data.entity.name}`}
      author="Warren"
      subject="Informe de entidad"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          name={data.entity.name}
          subtitle={`${data.entity.typeLabel} · ${cur}${
            data.entity.deleted ? ' · Eliminado' : ''
          }`}
          color={data.entity.color}
          generatedAt={data.generatedAt}
        />

        <Section title="Resumen de balance">
          <View style={styles.cardsRow}>
            <MetricCard
              label="Balance total"
              value={formatMoney(b.total, cur)}
              hint={`Efectivo ${formatMoney(b.cash, cur)}`}
            />
            <MetricCard
              label="Invertido (estimado)"
              value={formatMoney(b.estimatedInv, cur)}
              hint={
                b.hasPrices
                  ? `Coste ${formatMoney(b.investedCost, cur)}`
                  : 'Sin precios actuales'
              }
            />
            <MetricCard
              label="Rendimiento latente"
              value={
                b.hasPrices
                  ? `${b.latentPnl >= 0 ? '+' : ''}${formatMoney(b.latentPnl, cur)}`
                  : '—'
              }
              hint={b.hasPrices ? pct(b.latentPct) : 'Ajusta precios actuales'}
              tone={
                b.hasPrices
                  ? b.latentPnl >= 0
                    ? 'positive'
                    : 'negative'
                  : undefined
              }
            />
          </View>
        </Section>

        {data.timeline.length >= 2 && (
          <Section title="Evolución del patrimonio">
            <TimelineChart points={data.timeline} currency={cur} />
          </Section>
        )}

        <Section title="Posiciones abiertas">
          {data.positionGroups.length === 0 ? (
            <Text style={styles.empty}>
              Esta entidad no tiene posiciones abiertas.
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.th, { flex: 3 }]}>Activo</Text>
                <Text style={[styles.th, styles.right, { flex: 1.6 }]}>
                  Cantidad
                </Text>
                <Text style={[styles.th, styles.right, { flex: 1.8 }]}>
                  P. medio
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Coste
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Valor
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2.4 }]}>
                  Rendimiento
                </Text>
              </View>
              {data.positionGroups.map((g) => (
                <View key={g.label}>
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  {g.rows.map((r, i) => (
                    <View
                      style={styles.tRow}
                      key={`${g.label}-${r.symbol}-${i}`}
                    >
                      <View style={[styles.td, { flex: 3 }]}>
                        <Text style={styles.tdBold}>{r.symbol}</Text>
                        {r.name ? (
                          <Text style={styles.muted}>{r.name}</Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.td,
                          styles.right,
                          styles.mono,
                          { flex: 1.6 },
                        ]}
                      >
                        {r.quantity.toLocaleString('es-ES', {
                          maximumFractionDigits: 6,
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.right,
                          styles.mono,
                          { flex: 1.8 },
                        ]}
                      >
                        {formatMoney(r.averagePrice, cur)}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.right,
                          styles.mono,
                          { flex: 2 },
                        ]}
                      >
                        {formatMoney(r.cost, cur)}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.right,
                          styles.mono,
                          { flex: 2 },
                        ]}
                      >
                        {r.hasPrice ? formatMoney(r.value, cur) : '—'}
                      </Text>
                      <View style={[styles.td, styles.right, { flex: 2.4 }]}>
                        {r.pnl == null ? (
                          <Text style={styles.muted}>—</Text>
                        ) : (
                          <Text
                            style={[
                              styles.mono,
                              r.pnl >= 0 ? styles.positive : styles.negative,
                            ]}
                          >
                            {`${r.pnl >= 0 ? '+' : ''}${formatMoney(r.pnl, cur)} (${pct(
                              r.pct,
                            )})`}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Section>

        {data.realized && data.realized.hasSells && (
          <Section title="Rentabilidad realizada (FIFO)">
            <View style={styles.kv}>
              <Text style={styles.kvKey}>Resultado realizado</Text>
              <Money value={data.realized.pnl} currency={cur} signed bold />
            </View>
            <View style={styles.kv}>
              <Text style={styles.kvKey}>Importe recibido (ventas)</Text>
              <Money value={data.realized.proceeds} currency={cur} bold />
            </View>
            <View style={styles.kv}>
              <Text style={styles.kvKey}>Coste de lo vendido</Text>
              <Money value={data.realized.costBasis} currency={cur} bold />
            </View>
            <View style={styles.kv}>
              <Text style={styles.kvKey}>Comisiones · Impuestos pagados</Text>
              <Text style={styles.kvVal}>
                {formatMoney(data.realized.fees, cur)} ·{' '}
                {formatMoney(data.realized.taxes, cur)}
              </Text>
            </View>
          </Section>
        )}

        {data.taxTotals && (
          <Section title="Análisis fiscal · plusvalías realizadas">
            {data.taxYears.length === 0 ? (
              <Text style={styles.empty}>
                No hay ventas cerradas: el impuesto se genera al realizar
                ganancias.
              </Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tHead}>
                  <Text style={[styles.th, { flex: 2 }]}>Periodo</Text>
                  <Text style={[styles.th, styles.right, { flex: 2 }]}>
                    Ganancia neta
                  </Text>
                  <Text style={[styles.th, styles.right, { flex: 2 }]}>
                    Impuesto
                  </Text>
                  <Text style={[styles.th, styles.right, { flex: 1.4 }]}>
                    Tipo ef.
                  </Text>
                </View>
                {data.taxYears.map((r) => (
                  <View style={styles.tRow} key={r.label}>
                    <Text style={[styles.td, { flex: 2 }]}>{r.label}</Text>
                    <View style={[styles.td, styles.right, { flex: 2 }]}>
                      <Money value={r.netGain} currency={cur} signed />
                    </View>
                    <Text
                      style={[
                        styles.td,
                        styles.right,
                        styles.mono,
                        { flex: 2 },
                      ]}
                    >
                      {formatMoney(r.tax, cur)}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.right,
                        styles.mono,
                        styles.muted,
                        { flex: 1.4 },
                      ]}
                    >
                      {r.effRate == null
                        ? '—'
                        : `${(r.effRate * 100).toFixed(1)}%`}
                    </Text>
                  </View>
                ))}
                <View style={styles.tFoot}>
                  <Text style={[styles.td, styles.tdBold, { flex: 2 }]}>
                    Total
                  </Text>
                  <View style={[styles.td, styles.right, { flex: 2 }]}>
                    <Money
                      value={data.taxTotals.netGain}
                      currency={cur}
                      signed
                      bold
                    />
                  </View>
                  <Text
                    style={[
                      styles.td,
                      styles.tdBold,
                      styles.right,
                      styles.mono,
                      { flex: 2 },
                    ]}
                  >
                    {formatMoney(data.taxTotals.tax, cur)}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      styles.tdBold,
                      styles.right,
                      styles.mono,
                      { flex: 1.4 },
                    ]}
                  >
                    {data.taxTotals.effRate == null
                      ? '—'
                      : `${(data.taxTotals.effRate * 100).toFixed(1)}%`}
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.note}>
              Estimación sobre ganancias realizadas (FIFO) según el régimen de{' '}
              {data.regimeLabel}. No es asesoramiento fiscal.
            </Text>
          </Section>
        )}

        {data.latent && data.latent.positions.length > 0 && (
          <Section title="Escenario si vendieras hoy">
            <View style={styles.cardsRow}>
              <MetricCard
                label="Rendimiento latente"
                value={`${data.latent.total >= 0 ? '+' : ''}${formatMoney(
                  data.latent.total,
                  cur,
                )}`}
                tone={data.latent.total >= 0 ? 'positive' : 'negative'}
              />
              <MetricCard
                label="Impuesto estimado"
                value={formatMoney(data.latent.tax, cur)}
                hint={
                  data.latent.effRate == null
                    ? undefined
                    : `Tipo ef. ${(data.latent.effRate * 100).toFixed(1)}%`
                }
              />
              <MetricCard
                label="Neto tras impuestos"
                value={`${data.latent.net >= 0 ? '+' : ''}${formatMoney(
                  data.latent.net,
                  cur,
                )}`}
                tone={data.latent.net >= 0 ? 'positive' : 'negative'}
              />
            </View>
          </Section>
        )}

        {data.objectives.length > 0 && (
          <Section title="Objetivos de inversión">
            <View style={styles.chipRow}>
              {data.objectives.map((o, i) => (
                <View
                  key={`${o.symbol}-${i}`}
                  style={[
                    styles.chip,
                    {
                      borderColor: o.met ? COLORS.positive : COLORS.border,
                      color: o.met ? COLORS.positive : COLORS.muted,
                    },
                  ]}
                >
                  <Text>
                    {o.symbol}
                    {o.targetPrice != null
                      ? ` · ${formatMoney(o.targetPrice, cur)}`
                      : ''}
                    {o.targetDate ? ` · ${o.targetDate}` : ''}
                    {o.met ? ' · cumplido' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <ReportFooter generatedAt={data.generatedAt} />
      </Page>
    </Document>
  )
}
