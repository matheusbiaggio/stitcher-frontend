import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Customer {
  id: string
  nome: string
  telefone: string
  cpf: string | null
  email: string | null
  saldoDevedor: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

interface CustomerForm {
  nome: string
  telefone: string
  cpf: string
  email: string
}

const FORM_EMPTY: CustomerForm = {
  nome: '',
  telefone: '',
  cpf: '',
  email: '',
}

const labelStyle = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '0.375rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

function formatCurrency(value: number): string {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [createForm, setCreateForm] = useState<CustomerForm>(FORM_EMPTY)
  const [editForm, setEditForm] = useState<CustomerForm>(FORM_EMPTY)

  const { data, isPending: isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<{ customers: Customer[] }>('/customers').then(r => r.data.customers),
  })
  const customers = data ?? []

  const createMutation = useMutation({
    mutationFn: (body: CustomerForm) =>
      api.post<{ customer: Customer }>('/customers', body).then(r => r.data.customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowCreateForm(false)
      setCreateForm(FORM_EMPTY)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CustomerForm }) =>
      api.put<{ customer: Customer }>(`/customers/${id}`, body).then(r => r.data.customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditingCustomer(null)
      setEditForm(FORM_EMPTY)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/customers/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  function handleOpenEdit(customer: Customer) {
    setEditingCustomer(customer)
    setEditForm({
      nome: customer.nome,
      telefone: customer.telefone,
      cpf: customer.cpf ?? '',
      email: customer.email ?? '',
    })
  }

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(createForm)
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editingCustomer) return
    editMutation.mutate({ id: editingCustomer.id, body: editForm })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          letterSpacing: '0.05em',
          color: 'var(--white)',
        }}>
          CLIENTES
        </h1>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setEditingCustomer(null) }}
          style={{
            padding: '0.625rem 1.25rem',
            background: showCreateForm ? 'transparent' : 'var(--white)',
            color: showCreateForm ? 'var(--gray)' : 'var(--black)',
            border: showCreateForm ? '1px solid var(--black4)' : 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {showCreateForm ? 'Cancelar' : 'Novo Cliente'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div style={{
          background: 'var(--black2)',
          border: '1px solid var(--black4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: '1.25rem',
          }}>
            Novo cliente
          </h2>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input
                  type="text"
                  required
                  value={createForm.nome}
                  onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                  style={inputStyle}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label style={labelStyle}>Telefone *</label>
                <input
                  type="text"
                  required
                  value={createForm.telefone}
                  onChange={(e) => setCreateForm({ ...createForm, telefone: e.target.value })}
                  style={inputStyle}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  type="text"
                  value={createForm.cpf}
                  onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })}
                  style={inputStyle}
                  placeholder="CPF (somente números)"
                />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={inputStyle}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  padding: '0.625rem 1.5rem',
                  background: createMutation.isPending ? 'var(--gray2)' : 'var(--white)',
                  color: 'var(--black)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {createMutation.isPending ? 'Salvando...' : 'Criar cliente'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setCreateForm(FORM_EMPTY) }}
                style={{
                  padding: '0.625rem 1rem',
                  background: 'transparent',
                  color: 'var(--gray)',
                  border: '1px solid var(--black4)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer list */}
      {isLoading ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      ) : customers.length === 0 ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Nenhum cliente cadastrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {customers.map((customer) => (
            <div key={customer.id}>
              <div
                style={{
                  background: 'var(--black2)',
                  border: '1px solid var(--black4)',
                  borderRadius: 'var(--radius)',
                  padding: '0.875rem 1rem',
                  opacity: customer.ativo ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                {/* Customer info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--white)', fontWeight: 500 }}>
                      {customer.nome}
                    </p>
                    {!customer.ativo && (
                      <span style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--danger)',
                        padding: '0.2rem 0.45rem',
                        background: 'var(--black3)',
                        borderRadius: '4px',
                      }}>
                        Inativo
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                      {customer.telefone}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                      CPF: {customer.cpf ?? '—'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                      {customer.email ?? '—'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.75rem', color: customer.saldoDevedor > 0 ? 'var(--danger)' : 'var(--gray)', letterSpacing: '0.05em' }}>
                      Saldo: {formatCurrency(customer.saldoDevedor)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      if (editingCustomer?.id === customer.id) {
                        setEditingCustomer(null)
                      } else {
                        setShowCreateForm(false)
                        handleOpenEdit(customer)
                      }
                    }}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: 'transparent',
                      border: '1px solid var(--black4)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--gray)',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>
                  {customer.ativo && (
                    <button
                      onClick={() => deactivateMutation.mutate(customer.id)}
                      disabled={deactivateMutation.isPending}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--danger)',
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      Desativar
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingCustomer?.id === customer.id && (
                <div style={{
                  background: 'var(--black3)',
                  border: '1px solid var(--black4)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  marginTop: '0.25rem',
                }}>
                  <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Nome *</label>
                        <input
                          type="text"
                          required
                          value={editForm.nome}
                          onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Telefone *</label>
                        <input
                          type="text"
                          required
                          value={editForm.telefone}
                          onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>CPF</label>
                        <input
                          type="text"
                          value={editForm.cpf}
                          onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                          style={inputStyle}
                          placeholder="CPF (somente números)"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>E-mail</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        disabled={editMutation.isPending}
                        style={{
                          padding: '0.5rem 1rem',
                          background: editMutation.isPending ? 'var(--gray2)' : 'var(--white)',
                          color: 'var(--black)',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.7rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: editMutation.isPending ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {editMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingCustomer(null); setEditForm(FORM_EMPTY) }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'transparent',
                          border: '1px solid var(--black4)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--gray)',
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                        }}
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
    </div>
  )
}
