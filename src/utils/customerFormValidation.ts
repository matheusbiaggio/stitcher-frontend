import { validateCPF, validateBRPhone } from '@bonistore/shared'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export interface CustomerForm {
  nome: string
  telefone: string
  cpf: string
  email: string
  dataNascimento: string
}

export interface CustomerFormErrors {
  nome?: string
  telefone?: string
  cpf?: string
  email?: string
  dataNascimento?: string
}

export function validateCustomerForm(form: CustomerForm): CustomerFormErrors {
  const errors: CustomerFormErrors = {}
  if (!form.nome.trim()) errors.nome = 'Nome é obrigatório'
  if (!form.telefone.trim()) {
    errors.telefone = 'Telefone é obrigatório'
  } else if (!validateBRPhone(form.telefone)) {
    errors.telefone = 'Telefone inválido — informe DDD + número (ex: 11999999999)'
  }
  if (form.cpf.trim()) {
    if (!validateCPF(form.cpf)) errors.cpf = 'CPF inválido'
  }
  if (form.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'E-mail inválido'
  }
  if (form.dataNascimento.trim()) {
    const d = dayjs(form.dataNascimento, 'YYYY-MM-DD', true)
    if (!d.isValid()) {
      errors.dataNascimento = 'Data inválida'
    } else if (d.isAfter(dayjs(), 'day')) {
      errors.dataNascimento = 'Data de nascimento não pode ser futura'
    } else if (d.isBefore('1900-01-01')) {
      errors.dataNascimento = 'Data de nascimento deve ser a partir de 01/01/1900'
    }
  }
  return errors
}

export function toCustomerApiBody(form: CustomerForm) {
  return {
    nome: form.nome,
    telefone: form.telefone.replace(/\D/g, ''),
    cpf: form.cpf.trim() ? form.cpf.replace(/\D/g, '') : undefined,
    email: form.email.trim() ? form.email : undefined,
    dataNascimento: form.dataNascimento.trim() ? form.dataNascimento : undefined,
  }
}
