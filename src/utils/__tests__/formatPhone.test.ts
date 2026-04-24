import { describe, it, expect } from 'vitest'

import { formatBRPhone } from '../formatPhone'

describe('formatBRPhone', () => {
  it('formats 11-digit mobile number', () => {
    expect(formatBRPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formats 10-digit landline', () => {
    expect(formatBRPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('strips non-digits before formatting', () => {
    expect(formatBRPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })

  it('returns original input for unexpected length', () => {
    expect(formatBRPhone('12345')).toBe('12345')
    expect(formatBRPhone('123456789012')).toBe('123456789012')
  })

  it('returns empty string for empty input', () => {
    expect(formatBRPhone('')).toBe('')
  })
})
