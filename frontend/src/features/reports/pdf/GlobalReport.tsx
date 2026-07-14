import { Document, Page, Text, View } from '@react-pdf/renderer'
import { formatMoney } from '@/lib/currencies'
import type { GlobalReportData } from '../buildReportData'
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

export function GlobalReport({ data }: { data: GlobalReportData }) {
  const b = data.base
  const t = data.totals
  const metObjectives = data.objectives.filter((o) => o.met).length

  return (
    <Document
      title={`Informe global · ${data.title}`}
      author="Warren"
      subject="Informe global de patrimonio"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          name={data.title}
          subtitle={data.description ?? `Cartera · ${b}`}
          color={null}
          generatedAt={data.generatedAt}
        />

        <Section title="Resumen patrimonial">
          <View style={styles.cardsRow}>
            <MetricCard
              label="Patrimonio total"
              value={formatMoney(t.total, b)}
              hint={`Efectivo ${formatMoney(t.cash, b)}`}
            />
            <MetricCard
              label="Invertido"
              value={formatMoney(t.invested, b)}
              hint={`Coste ${formatMoney(t.investedCost, b)}`}
            />
            <MetricCard
              label="Rendimiento"
              value={`${t.latentPnl >= 0 ? '+' : ''}${formatMoney(t.latentPnl, b)}`}
              hint={pct(t.latentPct)}
              tone={t.latentPnl >= 0 ? 'positive' : 'negative'}
            />
          </View>
          {data.missing.length > 0 && (
            <Text style={styles.note}>
              Faltan tipos de cambio para: {data.missing.join(', ')}. Esos
              importes no se incluyen en el total.
            </Text>
          )}
        </Section>

        {data.timeline.length >= 2 && (
          <Section title="Evolución del patrimonio">
            <TimelineChart points={data.timeline} currency={b} />
          </Section>
        )}

        <Section title="Distribución por entidad">
          {data.distribution.length === 0 ? (
            <Text style={styles.empty}>Sin datos de distribución.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.th, { flex: 3 }]}>Entidad</Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Valor
                </Text>
                <Text style={[styles.th, styles.right, { flex: 1.4 }]}>%</Text>
              </View>
              {data.distribution.map((d) => (
                <View style={styles.tRow} key={d.label}>
                  <Text style={[styles.td, { flex: 3 }]}>{d.label}</Text>
                  <Text
                    style={[styles.td, styles.right, styles.mono, { flex: 2 }]}
                  >
                    {formatMoney(d.value, b)}
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
                    {d.pct.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View wrap={false}>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
              Líquido vs. invertido
            </Text>
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.th, { flex: 3 }]}>Composición</Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Valor
                </Text>
                <Text style={[styles.th, styles.right, { flex: 1.4 }]}>%</Text>
              </View>
              {[
                { label: 'Líquido', value: t.cash },
                { label: 'Invertido', value: t.invested },
              ].map((r) => (
                <View style={styles.tRow} key={r.label}>
                  <Text style={[styles.td, { flex: 3 }]}>{r.label}</Text>
                  <Text
                    style={[styles.td, styles.right, styles.mono, { flex: 2 }]}
                  >
                    {formatMoney(r.value, b)}
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
                    {t.total > 0
                      ? ((r.value / t.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Section>

        {data.byType.length > 0 && (
          <Section title="Distribución por tipo de activo">
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.th, { flex: 3 }]}>Tipo</Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Valor
                </Text>
                <Text style={[styles.th, styles.right, { flex: 1.4 }]}>%</Text>
              </View>
              {data.byType.map((d) => (
                <View style={styles.tRow} key={d.label}>
                  <Text style={[styles.td, { flex: 3 }]}>{d.label}</Text>
                  <Text
                    style={[styles.td, styles.right, styles.mono, { flex: 2 }]}
                  >
                    {formatMoney(d.value, b)}
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
                    {d.pct.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section title="Resumen por entidad">
          {data.entityRows.length === 0 ? (
            <Text style={styles.empty}>No hay entidades en esta cartera.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.th, { flex: 3 }]}>Entidad</Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Efectivo
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Invertido
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Rend. latente
                </Text>
                <Text style={[styles.th, styles.right, { flex: 2 }]}>
                  Total
                </Text>
              </View>
              {data.entityRows.map((r, i) => (
                <View style={styles.tRow} key={`${r.name}-${i}`}>
                  <View style={[styles.td, { flex: 3 }]}>
                    <Text style={styles.tdBold}>{r.name}</Text>
                    <Text style={styles.muted}>{r.typeLabel}</Text>
                  </View>
                  <Text
                    style={[styles.td, styles.right, styles.mono, { flex: 2 }]}
                  >
                    {formatMoney(r.cash, b)}
                  </Text>
                  <Text
                    style={[styles.td, styles.right, styles.mono, { flex: 2 }]}
                  >
                    {formatMoney(r.invested, b)}
                  </Text>
                  <View style={[styles.td, styles.right, { flex: 2 }]}>
                    {r.pnl == null ? (
                      <Text style={styles.muted}>—</Text>
                    ) : Math.abs(r.pnl) < 0.005 ? (
                      <Text style={[styles.mono, styles.muted]}>
                        {formatMoney(0, b)}
                      </Text>
                    ) : (
                      <Money value={r.pnl} currency={b} signed />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.td,
                      styles.right,
                      styles.mono,
                      styles.tdBold,
                      { flex: 2 },
                    ]}
                  >
                    {formatMoney(r.total, b)}
                  </Text>
                </View>
              ))}
              <View style={styles.tFoot}>
                <Text style={[styles.td, styles.tdBold, { flex: 3 }]}>
                  Total
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.right,
                    styles.mono,
                    styles.tdBold,
                    { flex: 2 },
                  ]}
                >
                  {formatMoney(t.cash, b)}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.right,
                    styles.mono,
                    styles.tdBold,
                    { flex: 2 },
                  ]}
                >
                  {formatMoney(t.invested, b)}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.right,
                    styles.mono,
                    styles.tdBold,
                    { flex: 2 },
                    Math.abs(t.latentPnl) < 0.005
                      ? { color: COLORS.muted }
                      : {
                          color:
                            t.latentPnl >= 0
                              ? COLORS.positive
                              : COLORS.negative,
                        },
                  ]}
                >
                  {Math.abs(t.latentPnl) < 0.005
                    ? formatMoney(0, b)
                    : `${t.latentPnl >= 0 ? '+' : ''}${formatMoney(t.latentPnl, b)}`}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.right,
                    styles.mono,
                    styles.tdBold,
                    { flex: 2 },
                  ]}
                >
                  {formatMoney(t.total, b)}
                </Text>
              </View>
            </View>
          )}
          {data.entityRows.length > 0 && (
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Rend. latente = valor actual de las posiciones abiertas menos su
              coste (no realizado). El resultado ya materializado por ventas se
              muestra en la sección siguiente.
            </Text>
          )}
        </Section>

        <Section title="Rentabilidad e impuestos (consolidado)">
          <View style={styles.kv}>
            <Text style={styles.kvKey}>Resultado realizado (FIFO)</Text>
            {data.realized ? (
              <Money value={data.realized.pnl} currency={b} signed bold />
            ) : (
              <Text style={styles.muted}>Sin ventas cerradas</Text>
            )}
          </View>
          <View style={styles.kv}>
            <Text style={styles.kvKey}>
              Impuesto sobre plusvalías realizadas
            </Text>
            <Text style={styles.kvVal}>
              {data.taxTotals ? formatMoney(data.taxTotals.tax, b) : '—'}
            </Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.kvKey}>
              Impuesto latente (si vendieras hoy)
            </Text>
            <Text style={styles.kvVal}>
              {formatMoney(data.latentTaxTotal, b)}
            </Text>
          </View>
          <Text style={styles.note}>
            Estimación (FIFO) según el régimen de {data.regimeLabel}. El
            consolidado suma importes de cada bróker en su moneda; es
            orientativo si hay varias divisas. No es asesoramiento fiscal.
          </Text>
        </Section>

        {data.objectives.length > 0 && (
          <Section
            title={`Objetivos · ${metObjectives}/${data.objectives.length} cumplidos`}
          >
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
                    {o.entity ? ` · ${o.entity}` : ''}
                    {o.targetPrice != null
                      ? ` · ${formatMoney(o.targetPrice, o.currency)}`
                      : ''}
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
