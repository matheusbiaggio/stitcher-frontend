import { afterAll, beforeAll, describe, it, expect } from 'vitest'

import { formatBRDate, formatBRShortDate, formatBRLongDate } from '../formatDate'

// M014: Forçamos TZ=UTC nos testes pra reproduzir o ambiente do navegador
// em qualquer fuso. As funções devem ser TZ-agnósticas — derivam o resultado
// só da string ISO via regex, nunca passando pelo new Date(). Sem isso,
// `new Date("2026-05-14")` parseia como UTC midnight e em SP TZ vira 13/05.
let originalTz: string | undefined
beforeAll(() => {
  originalTz = process.env.TZ
  process.env.TZ = 'UTC'
})
afterAll(() => {
  process.env.TZ = originalTz
})

describe('formatBRDate', () => {
  it('formats YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatBRDate('1990-05-15')).toBe('15/05/1990')
    expect(formatBRDate('2026-01-01')).toBe('01/01/2026')
    expect(formatBRDate('1985-12-31')).toBe('31/12/1985')
  })

  it('returns input untouched when not YYYY-MM-DD', () => {
    expect(formatBRDate('')).toBe('')
    expect(formatBRDate('15/05/1990')).toBe('15/05/1990')
    expect(formatBRDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatBRShortDate', () => {
  it('formats YYYY-MM-DD to DD/MM (short form for charts)', () => {
    expect(formatBRShortDate('2026-05-14')).toBe('14/05')
    expect(formatBRShortDate('2026-01-01')).toBe('01/01')
    expect(formatBRShortDate('2026-12-31')).toBe('31/12')
  })

  it('does NOT shift date when running in UTC TZ (regression vs new Date(str))', () => {
    // Esse é o caso que pegou o usuário: backend retornou "2026-05-14",
    // chart no navegador em qualquer fuso deve mostrar "14/05" — não "13/05".
    expect(formatBRShortDate('2026-05-14')).toBe('14/05')
    expect(formatBRShortDate('2026-05-01')).toBe('01/05')
  })

  it('returns input untouched when not YYYY-MM-DD', () => {
    expect(formatBRShortDate('')).toBe('')
    expect(formatBRShortDate('xyz')).toBe('xyz')
  })
})

describe('formatBRLongDate', () => {
  it('formats YYYY-MM-DD to DD de mês de YYYY', () => {
    expect(formatBRLongDate('2026-05-14')).toBe('14 de mai. de 2026')
    expect(formatBRLongDate('2026-01-01')).toBe('01 de jan. de 2026')
    expect(formatBRLongDate('2026-12-31')).toBe('31 de dez. de 2026')
  })

  it('does NOT shift date when running in UTC TZ', () => {
    // Backend devolveu o dia "1" do mês — não pode virar "31" do mês anterior.
    expect(formatBRLongDate('2026-05-01')).toBe('01 de mai. de 2026')
    expect(formatBRLongDate('2026-01-01')).toBe('01 de jan. de 2026')
  })

  it('returns input untouched when not YYYY-MM-DD', () => {
    expect(formatBRLongDate('')).toBe('')
    expect(formatBRLongDate('not-a-date')).toBe('not-a-date')
  })
})
