import { customerResponseSchema } from '@bonistore/shared'
import { useMutation } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

import { api } from '../../lib/api'
import {
  type CustomerForm,
  type CustomerFormErrors,
  toCustomerApiBody,
  validateCustomerForm,
} from '../../utils/customerFormValidation'

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '0.2rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.625rem',
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorTextStyle: React.CSSProperties = {
  color: 'var(--danger)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.7rem',
  marginTop: '0.2rem',
}

interface CreatedCustomer {
  id: string
  nome: string
  dataNascimento: string | null
}

interface QuickCreateCustomerFormProps {
  /** Pré-preenche o nome com o que estiver no campo de busca. */
  initialName?: string
  /** Disparado após criação bem-sucedida — chamador seleciona o cliente
   * recém-criado na venda em andamento. */
  onCreated: (customer: CreatedCustomer) => void
  onCancel: () => void
}

/**
 * Form compacto pra criar cliente sem abandonar o fluxo do PDV.
 * Campos mínimos: nome (obrigatório, geralmente já vem do search) +
 * telefone (obrigatório). CPF é opcional. Os outros campos do cadastro
 * completo (email, data de nascimento) são preenchidos depois em /clientes.
 */
export function QuickCreateCustomerForm({
  initialName = '',
  onCreated,
  onCancel,
}: QuickCreateCustomerFormProps) {
  const [form, setForm] = useState<CustomerForm>({
    nome: initialName,
    telefone: '',
    cpf: '',
    email: '',
    dataNascimento: '',
  })
  const [errors, setErrors] = useState<CustomerFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (body: ReturnType<typeof toCustomerApiBody>) => {
      const res = await api.post<{ customer: unknown }>('/customers', body)
      return customerResponseSchema.parse(res.data.customer)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const clientErrors = validateCustomerForm(form)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setErrors({})
    mutation.mutate(toCustomerApiBody(form), {
      onSuccess: (customer) => {
        onCreated({
          id: customer.id,
          nome: customer.nome,
          dataNascimento: customer.dataNascimento,
        })
      },
      onError: (err) => {
        const data = (
          err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
        ).response?.data
        if (data?.errors) {
          const next: CustomerFormErrors = {}
          if (data.errors.nome?.[0]) next.nome = data.errors.nome[0]
          if (data.errors.telefone?.[0]) next.telefone = data.errors.telefone[0]
          if (data.errors.cpf?.[0]) next.cpf = data.errors.cpf[0]
          setErrors(next)
        } else {
          setServerError(data?.message ?? 'Não foi possível criar o cliente.')
        }
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="quick-create-customer-form"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        background: 'var(--black3)',
        border: '1px solid var(--black4)',
        borderRadius: 'var(--radius)',
        marginTop: '0.4rem',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--white)',
          fontWeight: 600,
        }}
      >
        Novo cliente
      </div>

      <div>
        <label style={labelStyle}>Nome *</label>
        <input
          type="text"
          autoFocus
          value={form.nome}
          onChange={(e) => {
            setForm({ ...form, nome: e.target.value })
            setErrors((er) => ({ ...er, nome: undefined }))
          }}
          style={{ ...inputStyle, borderColor: errors.nome ? 'var(--danger)' : 'var(--black4)' }}
          placeholder="Nome do cliente"
        />
        {errors.nome && <p style={errorTextStyle}>{errors.nome}</p>}
      </div>

      <div>
        <label style={labelStyle}>Telefone *</label>
        <input
          type="tel"
          inputMode="numeric"
          value={form.telefone}
          onChange={(e) => {
            setForm({ ...form, telefone: e.target.value })
            setErrors((er) => ({ ...er, telefone: undefined }))
          }}
          style={{
            ...inputStyle,
            borderColor: errors.telefone ? 'var(--danger)' : 'var(--black4)',
          }}
          placeholder="11999999999"
        />
        {errors.telefone && <p style={errorTextStyle}>{errors.telefone}</p>}
      </div>

      <div>
        <label style={labelStyle}>CPF (opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          value={form.cpf}
          onChange={(e) => {
            setForm({ ...form, cpf: e.target.value })
            setErrors((er) => ({ ...er, cpf: undefined }))
          }}
          style={{ ...inputStyle, borderColor: errors.cpf ? 'var(--danger)' : 'var(--black4)' }}
          placeholder="00000000000"
        />
        {errors.cpf && <p style={errorTextStyle}>{errors.cpf}</p>}
      </div>

      {serverError && <p style={errorTextStyle}>{serverError}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button
          type="submit"
          data-testid="quick-create-submit"
          disabled={mutation.isPending}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            background: mutation.isPending ? 'var(--gray2)' : 'var(--white)',
            color: 'var(--black)',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {mutation.isPending ? 'Criando...' : 'Criar e selecionar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'transparent',
            border: '1px solid var(--black4)',
            borderRadius: 'var(--radius)',
            color: 'var(--gray)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
