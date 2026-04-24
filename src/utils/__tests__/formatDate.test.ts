import { describe, it, expect } from 'vitest'

import { formatBRDate } from '../formatDate'

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
