import { StyleSheet } from '@react-pdf/renderer'

/** Paleta del informe (alineada con la app: verde/rojo de rendimiento). */
export const COLORS = {
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  headerBg: '#f1f5f9',
  card: '#f8fafc',
  positive: '#16a34a',
  negative: '#dc2626',
  accent: '#0f172a',
  white: '#ffffff',
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },

  // Cabecera
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
  },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', lineHeight: 1.15 },
  subtitle: { fontSize: 9, color: COLORS.muted, marginTop: 5 },
  headerRight: { alignItems: 'flex-end' },
  brandName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    lineHeight: 1.2,
  },
  metaText: { fontSize: 8, color: COLORS.muted, marginTop: 2 },

  rule: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },

  // Secciones
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: COLORS.muted,
    marginBottom: 7,
  },

  // Tarjetas de métricas destacadas
  cardsRow: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: COLORS.card,
  },
  cardLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cardValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  cardHint: { fontSize: 7.5, color: COLORS.muted, marginTop: 4 },

  // Tablas
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tHead: { flexDirection: 'row', backgroundColor: COLORS.headerBg },
  tRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tFoot: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: COLORS.faint,
    backgroundColor: COLORS.card,
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 7.5,
    color: COLORS.muted,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  td: { paddingVertical: 5, paddingHorizontal: 7, fontSize: 8.5 },
  tdBold: { fontFamily: 'Helvetica-Bold' },
  groupLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.muted,
    backgroundColor: COLORS.card,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Listas clave/valor
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kvKey: { color: COLORS.muted },
  kvVal: { fontFamily: 'Helvetica-Bold' },

  mono: { fontFamily: 'Helvetica' },
  right: { textAlign: 'right' },
  positive: { color: COLORS.positive },
  negative: { color: COLORS.negative },
  muted: { color: COLORS.muted },

  note: { fontSize: 7.5, color: COLORS.muted, marginTop: 6 },
  empty: {
    fontSize: 8.5,
    color: COLORS.muted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 10,
    textAlign: 'center',
  },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: COLORS.faint,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },

  // Chips de objetivos
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7.5,
  },
})
