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

/**
 * Máscara progressiva de telefone brasileiro para uso em inputs.
 * Remove não-dígitos, limita a 11, e aplica máscara conforme o usuário digita:
 *   - '' → ''
 *   - '1' → '(1'
 *   - '11' → '(11'
 *   - '119' → '(11) 9'
 *   - '1191' → '(11) 91'
 *   - '119123' → '(11) 9123' (modo celular — 3º dígito é 9)
 *   - '1191234567' → '(11) 91234-567' (modo celular parcial)
 *   - '11912345678' → '(11) 91234-5678' (celular completo)
 *   - '1134567' → '(11) 3456-7' (modo fixo — 3º dígito não é 9)
 *   - '1134567890' → '(11) 3456-7890' (fixo completo)
 *
 * Detecta modo celular quando o 3º dígito é '9' (após o DDD);
 * caso contrário assume fixo (10 dígitos no total).
 */
export function maskBRPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  // Celular é 11 dígitos totais; fixo é 10. Detectamos celular quando
  // o 1º dígito após o DDD é 9 (regra pós-2016) OU quando o usuário já
  // digitou 11 dígitos no total (passa de fixo).
  const isMobile = rest[0] === '9' || digits.length === 11

  if (isMobile) {
    // (XX) XXXXX-XXXX — 5+4
    const a = rest.slice(0, 5)
    const b = rest.slice(5)
    return b.length ? `(${ddd}) ${a}-${b}` : `(${ddd}) ${a}`
  }
  // (XX) XXXX-XXXX — 4+4
  const a = rest.slice(0, 4)
  const b = rest.slice(4)
  return b.length ? `(${ddd}) ${a}-${b}` : `(${ddd}) ${a}`
}
