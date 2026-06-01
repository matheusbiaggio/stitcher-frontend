/**
 * Formata data ISO YYYY-MM-DD em formato brasileiro.
 *
 * Por que essas funções existem (M014): `new Date("2026-05-14")` é parseado
 * como UTC midnight, e `.toLocaleDateString('pt-BR')` no navegador SP TZ
 * exibe **13/05** (dia anterior) porque UTC 00:00 = SP 21:00 do dia anterior.
 * Helpers TZ-agnósticos via regex eliminam esse risco: derivam o resultado
 * SÓ da string, sem passar pelo `new Date()`.
 */

const MONTHS_PT_BR = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
] as const

function parseYMD(iso: string): { y: string; mo: string; d: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return { y: m[1], mo: m[2], d: m[3] }
}

/** YYYY-MM-DD → DD/MM/YYYY. Devolve input se não casar o formato. */
export function formatBRDate(iso: string): string {
  const p = parseYMD(iso)
  if (!p) return iso
  return `${p.d}/${p.mo}/${p.y}`
}

/** YYYY-MM-DD → DD/MM (formato curto pra eixo X de gráficos). */
export function formatBRShortDate(iso: string): string {
  const p = parseYMD(iso)
  if (!p) return iso
  return `${p.d}/${p.mo}`
}

/** YYYY-MM-DD → "14 de mai. de 2026" (formato longo pra header de período). */
export function formatBRLongDate(iso: string): string {
  const p = parseYMD(iso)
  if (!p) return iso
  const monthIdx = parseInt(p.mo, 10) - 1
  const monthLabel = MONTHS_PT_BR[monthIdx] ?? p.mo
  return `${p.d} de ${monthLabel} de ${p.y}`
}
