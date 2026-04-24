import { type CustomerResponse, customerResponseSchema } from '@bonistore/shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState, FormEvent } from 'react'

import { api } from '../lib/api'
import {
  pageTitle,
  sectionHeader,
  listFormLayout,
  formPanel,
  formPanelTitle,
  card,
  inlineForm,
  label,
  input,
  fieldError,
  primaryButton,
  secondaryButton,
  rowActionButton,
  rowDangerButton,
  badge,
} from '../styles/ui'
import {
  type CustomerForm,
  type CustomerFormErrors,
  toCustomerApiBody,
  validateCustomerForm,
} from '../utils/customerFormValidation'

type Customer = CustomerResponse
type FormErrors = CustomerFormErrors

const FORM_EMPTY: CustomerForm = {
  nome: '',
  telefone: '',
  cpf: '',
  email: '',
  dataNascimento: '',
}

function formatCurrency(value: number): string {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

function extractApiErrors(err: unknown): FormErrors {
  const data = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response
    ?.data
  if (!data?.errors) return {}
  const e = data.errors
  const map: FormErrors = {}
  if (e.nome?.length) map.nome = e.nome[0]
  if (e.telefone?.length) map.telefone = e.telefone[0]
  if (e.cpf?.length) map.cpf = e.cpf[0]
  if (e.email?.length) map.email = e.email[0]
  if (e.dataNascimento?.length) map.dataNascimento = e.dataNascimento[0]
  return map
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CustomerForm>(FORM_EMPTY)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [editForm, setEditForm] = useState<CustomerForm>(FORM_EMPTY)

  const { data, isPending } = useQuery({
    queryKey: ['customers'],
    queryFn: () =>
      api.get<{ customers: unknown[] }>('/customers').then((r) => r.data.customers.map((c) => customerResponseSchema.parse(c))),
  })
  const customers = data ?? []

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all')
  const [filterDevedor, setFilterDevedor] = useState<'all' | 'devedores' | 'em_dia'>('all')

  const filteredCustomers = customers.filter((c) => {
    if (filterStatus === 'ativo' && !c.ativo) return false
    if (filterStatus === 'inativo' && c.ativo) return false
    if (filterDevedor === 'devedores' && c.saldoDevedor <= 0) return false
    if (filterDevedor === 'em_dia' && c.saldoDevedor > 0) return false
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase()
      const match =
        c.nome.toLowerCase().includes(q) ||
        c.telefone.toLowerCase().includes(q) ||
        (c.cpf?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      if (!match) return false
    }
    return true
  })

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof toCustomerApiBody>) =>
      api.post<{ customer: Customer }>('/customers', body).then((r) => r.data.customer),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnType<typeof toCustomerApiBody> }) =>
      api.put<{ customer: Customer }>(`/customers/${id}`, body).then((r) => r.data.customer),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/customers/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    const errors = validateCustomerForm(createForm)
    if (Object.keys(errors).length) {
      setCreateErrors(errors)
      return
    }
    setCreateErrors({})
    createMutation.mutate(toCustomerApiBody(createForm), {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        setCreateForm(FORM_EMPTY)
        setCreateErrors({})
      },
      onError: (err) => {
        setCreateErrors(extractApiErrors(err))
      },
    })
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    editMutation.mutate(
      { id: editingId, body: toCustomerApiBody(editForm) },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          setEditingId(null)
          setEditForm(FORM_EMPTY)
        },
      },
    )
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id)
    setEditForm({
      nome: customer.nome,
      telefone: customer.telefone,
      cpf: customer.cpf ?? '',
      email: customer.email ?? '',
      dataNascimento: customer.dataNascimento ?? '',
    })
  }

  return (
    <div>
      <h1 style={pageTitle}>CLIENTES</h1>

      <div style={listFormLayout}>
        {/* ── Customer list ── */}
        <section>
          <h2 style={sectionHeader}>Cadastro de clientes</h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => {
                setFilterSearch(e.target.value)
              }}
              placeholder="Buscar por nome, telefone, CPF ou email..."
              style={{ ...input, flex: '1 1 240px', minWidth: '200px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as 'all' | 'ativo' | 'inativo')
              }}
              style={{ ...input, flex: '0 0 130px', cursor: 'pointer' }}
            >
              <option value="all">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <select
              value={filterDevedor}
              onChange={(e) => {
                setFilterDevedor(e.target.value as 'all' | 'devedores' | 'em_dia')
              }}
              style={{ ...input, flex: '0 0 150px', cursor: 'pointer' }}
            >
              <option value="all">Todos saldos</option>
              <option value="devedores">Com débito</option>
              <option value="em_dia">Em dia</option>
            </select>
          </div>

          {isPending ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum cliente cadastrado.
            </p>
          ) : filteredCustomers.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum cliente corresponde aos filtros.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredCustomers.map((customer) => (
                <div key={customer.id}>
                  {/* Customer card */}
                  <div
                    style={{
                      ...card,
                      opacity: customer.ativo ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.9rem',
                            color: 'var(--white)',
                            fontWeight: 500,
                          }}
                        >
                          {customer.nome}
                        </p>
                        {!customer.ativo && <span style={badge('danger')}>Inativo</span>}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '1.25rem',
                          marginTop: '0.3rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            color: 'var(--gray)',
                          }}
                        >
                          {customer.telefone}
                        </span>
                        {customer.cpf && (
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.8rem',
                              color: 'var(--gray)',
                            }}
                          >
                            CPF: {customer.cpf}
                          </span>
                        )}
                        {customer.email && (
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.8rem',
                              color: 'var(--gray)',
                            }}
                          >
                            {customer.email}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.75rem',
                            letterSpacing: '0.05em',
                            color: customer.saldoDevedor > 0 ? 'var(--danger)' : 'var(--gray)',
                          }}
                        >
                          Saldo: {formatCurrency(customer.saldoDevedor)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          editingId === customer.id ? setEditingId(null) : openEdit(customer)
                        }}
                        style={rowActionButton}
                      >
                        {editingId === customer.id ? 'Fechar' : 'Editar'}
                      </button>
                      {customer.ativo && (
                        <button
                          onClick={() => {
                            deactivateMutation.mutate(customer.id)
                          }}
                          disabled={deactivateMutation.isPending}
                          style={rowDangerButton}
                        >
                          Desativar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingId === customer.id && (
                    <div style={inlineForm}>
                      <form
                        onSubmit={handleEditSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <label style={label}>Nome *</label>
                            <input
                              type="text"
                              required
                              value={editForm.nome}
                              onChange={(e) => {
                                setEditForm({ ...editForm, nome: e.target.value })
                              }}
                              style={input}
                            />
                          </div>
                          <div>
                            <label style={label}>Telefone *</label>
                            <input
                              type="text"
                              required
                              value={editForm.telefone}
                              onChange={(e) => {
                                setEditForm({ ...editForm, telefone: e.target.value })
                              }}
                              style={input}
                              placeholder="11999999999"
                            />
                          </div>
                          <div>
                            <label style={label}>
                              CPF{' '}
                              <span style={{ color: 'var(--gray)', fontWeight: 400 }}>
                                (opcional)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={editForm.cpf}
                              onChange={(e) => {
                                setEditForm({ ...editForm, cpf: e.target.value })
                              }}
                              style={input}
                              placeholder="Somente números"
                            />
                          </div>
                          <div>
                            <label style={label}>
                              E-mail{' '}
                              <span style={{ color: 'var(--gray)', fontWeight: 400 }}>
                                (opcional)
                              </span>
                            </label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => {
                                setEditForm({ ...editForm, email: e.target.value })
                              }}
                              style={input}
                            />
                          </div>
                          <div>
                            <label style={label}>
                              Data de nascimento{' '}
                              <span style={{ color: 'var(--gray)', fontWeight: 400 }}>
                                (opcional)
                              </span>
                            </label>
                            <input
                              type="date"
                              value={editForm.dataNascimento}
                              onChange={(e) => {
                                setEditForm({ ...editForm, dataNascimento: e.target.value })
                              }}
                              style={input}
                              max={dayjs().format('YYYY-MM-DD')}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="submit"
                            disabled={editMutation.isPending}
                            style={{
                              ...primaryButton(editMutation.isPending),
                              width: 'auto',
                              padding: '0.5rem 1.25rem',
                            }}
                          >
                            {editMutation.isPending ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null)
                              setEditForm(FORM_EMPTY)
                            }}
                            style={secondaryButton}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Create form panel ── */}
        <section style={formPanel}>
          <h2 style={formPanelTitle}>Novo cliente</h2>

          <form
            onSubmit={handleCreateSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label style={label}>Nome *</label>
              <input
                type="text"
                value={createForm.nome}
                onChange={(e) => {
                  setCreateForm({ ...createForm, nome: e.target.value })
                  setCreateErrors((ce) => ({ ...ce, nome: undefined }))
                }}
                style={{ ...input, borderColor: createErrors.nome ? 'var(--danger)' : undefined }}
                placeholder="Nome completo"
              />
              {createErrors.nome && <p style={fieldError}>{createErrors.nome}</p>}
            </div>

            <div>
              <label style={label}>Telefone *</label>
              <input
                type="text"
                value={createForm.telefone}
                onChange={(e) => {
                  setCreateForm({ ...createForm, telefone: e.target.value })
                  setCreateErrors((ce) => ({ ...ce, telefone: undefined }))
                }}
                style={{
                  ...input,
                  borderColor: createErrors.telefone ? 'var(--danger)' : undefined,
                }}
                placeholder="(11) 99999-9999"
              />
              {createErrors.telefone && <p style={fieldError}>{createErrors.telefone}</p>}
            </div>

            <div>
              <label style={label}>
                CPF <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={createForm.cpf}
                onChange={(e) => {
                  setCreateForm({ ...createForm, cpf: e.target.value })
                  setCreateErrors((ce) => ({ ...ce, cpf: undefined }))
                }}
                style={{ ...input, borderColor: createErrors.cpf ? 'var(--danger)' : undefined }}
                placeholder="Somente números"
              />
              {createErrors.cpf && <p style={fieldError}>{createErrors.cpf}</p>}
            </div>

            <div>
              <label style={label}>
                E-mail <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => {
                  setCreateForm({ ...createForm, email: e.target.value })
                  setCreateErrors((ce) => ({ ...ce, email: undefined }))
                }}
                style={{ ...input, borderColor: createErrors.email ? 'var(--danger)' : undefined }}
                placeholder="email@exemplo.com"
              />
              {createErrors.email && <p style={fieldError}>{createErrors.email}</p>}
            </div>

            <div>
              <label style={label}>
                Data de nascimento{' '}
                <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="date"
                value={createForm.dataNascimento}
                onChange={(e) => {
                  setCreateForm({ ...createForm, dataNascimento: e.target.value })
                  setCreateErrors((ce) => ({ ...ce, dataNascimento: undefined }))
                }}
                style={{
                  ...input,
                  borderColor: createErrors.dataNascimento ? 'var(--danger)' : undefined,
                }}
                max={dayjs().format('YYYY-MM-DD')}
              />
              {createErrors.dataNascimento && (
                <p style={fieldError}>{createErrors.dataNascimento}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              style={primaryButton(createMutation.isPending)}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar cliente'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
