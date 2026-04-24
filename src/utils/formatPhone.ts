/**
 * Formata telefone brasileiro para exibição.
 * Aceita 10 ou 11 dígitos (só números). Se o formato não for reconhecido, devolve o input.
 * - 11 dígitos: (11) 99999-9999
 * - 10 dígitos: (11) 9999-9999
 */
export function formatBRPhone(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return digits
}
