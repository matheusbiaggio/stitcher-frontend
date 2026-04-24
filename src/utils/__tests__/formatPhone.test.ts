import { describe, it, expect } from 'vitest'

import { formatBRPhone, maskBRPhone } from '../formatPhone'

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

describe('maskBRPhone (progressive input mask)', () => {
  it('returns empty for empty input', () => {
    expect(maskBRPhone('')).toBe('')
  })

  it('formats 1-2 digits as "(X" / "(XX"', () => {
    expect(maskBRPhone('1')).toBe('(1')
    expect(maskBRPhone('11')).toBe('(11')
  })

  it('starts mobile pattern as soon as the 3rd digit is 9', () => {
    expect(maskBRPhone('119')).toBe('(11) 9')
    expect(maskBRPhone('1191')).toBe('(11) 91')
    expect(maskBRPhone('119123')).toBe('(11) 9123')
    expect(maskBRPhone('1191234')).toBe('(11) 91234')
  })

  it('inserts dash after the 5th digit of the local part in mobile mode', () => {
    expect(maskBRPhone('11912345')).toBe('(11) 91234-5')
    expect(maskBRPhone('11912345678')).toBe('(11) 91234-5678')
  })

  it('uses landline pattern when 3rd digit is not 9', () => {
    expect(maskBRPhone('113')).toBe('(11) 3')
    expect(maskBRPhone('113456')).toBe('(11) 3456')
    expect(maskBRPhone('1134567')).toBe('(11) 3456-7')
    expect(maskBRPhone('1134567890')).toBe('(11) 3456-7890')
  })

  it('caps at 11 digits (extra digits ignored)', () => {
    expect(maskBRPhone('11912345678999')).toBe('(11) 91234-5678')
  })

  it('forces mobile format at 11 digits even when 3rd digit is not 9', () => {
    // 11 dígitos = celular por regra (não cabe em fixo)
    expect(maskBRPhone('11111111111')).toBe('(11) 11111-1111')
    expect(maskBRPhone('12345678901')).toBe('(12) 34567-8901')
  })

  it('keeps landline format at exactly 10 digits when 3rd digit is not 9', () => {
    expect(maskBRPhone('1111111111')).toBe('(11) 1111-1111')
  })

  it('switches from landline to mobile format as the 11th digit is typed', () => {
    expect(maskBRPhone('1111111111')).toBe('(11) 1111-1111') // 10 digits, landline
    expect(maskBRPhone('11111111111')).toBe('(11) 11111-1111') // 11 digits, mobile
  })

  it('strips non-digits during typing', () => {
    expect(maskBRPhone('(11) abc 91234')).toBe('(11) 91234')
    expect(maskBRPhone('11-9123-4567')).toBe('(11) 91234-567')
  })

  it('is idempotent when given already-formatted input', () => {
    expect(maskBRPhone('(11) 91234-5678')).toBe('(11) 91234-5678')
    expect(maskBRPhone('(11) 3456-7890')).toBe('(11) 3456-7890')
  })
})
