/**
 * Converte data ISO YYYY-MM-DD em formato brasileiro DD/MM/YYYY.
 * Se o input não for reconhecido, devolve o próprio input.
 */
export function formatBRDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return `${d}/${mo}/${y}`
}
