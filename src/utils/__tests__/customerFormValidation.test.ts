import dayjs from 'dayjs'
import { describe, it, expect } from 'vitest'

import {
  type CustomerForm,
  toCustomerApiBody,
  validateCustomerForm,
} from '../customerFormValidation'

const baseForm: CustomerForm = {
  nome: 'Ana Silva',
  telefone: '11999990000',
  cpf: '',
  email: '',
  dataNascimento: '',
}

describe('validateCustomerForm — dataNascimento', () => {
  it('accepts empty dataNascimento', () => {
    expect(validateCustomerForm({ ...baseForm, dataNascimento: '' })).toEqual({})
  })

  it('accepts valid past date', () => {
    expect(validateCustomerForm({ ...baseForm, dataNascimento: '1990-05-15' })).toEqual({})
  })

  it("accepts today's date", () => {
    const today = dayjs().format('YYYY-MM-DD')
    expect(validateCustomerForm({ ...baseForm, dataNascimento: today })).toEqual({})
  })

  it('rejects tomorrow (future)', () => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const errors = validateCustomerForm({ ...baseForm, dataNascimento: tomorrow })
    expect(errors.dataNascimento).toContain('futura')
  })

  it('rejects date before 1900', () => {
    const errors = validateCustomerForm({ ...baseForm, dataNascimento: '1899-12-31' })
    expect(errors.dataNascimento).toContain('1900')
  })

  it('rejects invalid calendar date (2024-02-30)', () => {
    const errors = validateCustomerForm({ ...baseForm, dataNascimento: '2024-02-30' })
    expect(errors.dataNascimento).toContain('inválida')
  })

  it('rejects malformed date (15/05/1990)', () => {
    const errors = validateCustomerForm({ ...baseForm, dataNascimento: '15/05/1990' })
    expect(errors.dataNascimento).toBeDefined()
  })

  it('does not interfere with other field validations when dataNascimento is valid', () => {
    const errors = validateCustomerForm({
      ...baseForm,
      nome: '',
      telefone: '11999990000',
      dataNascimento: '1990-05-15',
    })
    expect(errors.nome).toBeDefined()
    expect(errors.dataNascimento).toBeUndefined()
  })
})

describe('toCustomerApiBody — dataNascimento', () => {
  it('includes dataNascimento when filled', () => {
    const body = toCustomerApiBody({ ...baseForm, dataNascimento: '1990-05-15' })
    expect(body.dataNascimento).toBe('1990-05-15')
  })

  it('returns undefined when empty string', () => {
    const body = toCustomerApiBody({ ...baseForm, dataNascimento: '' })
    expect(body.dataNascimento).toBeUndefined()
  })

  it('returns undefined when only whitespace', () => {
    const body = toCustomerApiBody({ ...baseForm, dataNascimento: '   ' })
    expect(body.dataNascimento).toBeUndefined()
  })
})
