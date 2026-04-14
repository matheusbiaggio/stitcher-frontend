import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  pageTitle, sectionHeader, listFormLayout, formPanel, formPanelTitle,
  card, inlineForm, label, input, fieldError,
  primaryButton, secondaryButton, rowActionButton, rowDangerButton, badge,
} from '../styles/ui'

interface Customer {
  id: string
  nome: string
  telefone: string
  cpf: string | null
  email: string | null
  saldoDevedor: number
  ativo: boolean
  createdAt: string
}

interface CustomerForm {
  nome: string
  telefone: string
  cpf: string
  email: string
}

interface FormErrors {
  nome?: string
  telefone?: string
  cpf?: string
  email?: string
}

const FORM_EMPTY: CustomerForm = { nome: '', telefone: '', cpf: '', email: '' }

function formatCurrency(value: number): string {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

/** Full Brazilian CPF check-digit validation */
function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // all same digit
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let rem = sum % 11
  const d10 = rem < 2 ? 0 : 11 - rem
  if (parseInt(d[9]) !== d10) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  rem = sum % 11
  const d11 = rem < 2 ? 0 : 11 - rem
  return parseInt(d[10]) === d11
}

/** Brazilian phone: 10 digits (landline DDD+8) or 11 digits (mobile DDD+9XXXXXXXX) */
function validateBRPhone(phone: string): boolean {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return true
  if (d.length === 11 && d[2] === '9') return true
  return false
}

function validateForm(form: CustomerForm): FormErrors {
  const errors: FormErrors = {}
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
  return errors
}

function extractApiErrors(err: unknown): FormErrors {
  const data = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data
  if (!data?.errors) return {}
  const e = data.errors
  const map: FormErrors = {}
  if (e.nome?.length) map.nome = e.nome[0]
  if (e.telefone?.length) map.telefone = e.telefone[0]
  if (e.cpf?.length) map.cpf = e.cpf[0]
  if (e.email?.length) map.email = e.email[0]
  return map
}

/** Strip empty optional strings to undefined so Zod .optional() accepts them */
function toApiBody(form: CustomerForm) {
  return {
    nome: form.nome,
    telefone: form.telefone.replace(/\D/g, ''),
    cpf: form.cpf.trim() ? form.cpf.replace(/\D/g, '') : undefined,
    email: form.email.trim() ? form.email : undefined,
  }
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CustomerForm>(FORM_EMPTY)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [editForm, setEditForm] = useState<CustomerForm>(FORM_EMPTY)

  const { data, isPending } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<{ customers: Customer[] }>('/customers').then(r => r.data.customers),
  })
  const customers = data ?? []

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof toApiBody>) =>
      api.post<{ customer: Customer }>('/customers', body).then(r => r.data.customer),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnType<typeof toApiBody> }) =>
      api.put<{ customer: Customer }>(`/customers/${id}`, body).then(r => r.data.customer),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/customers/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    const errors = validateForm(createForm)
    if (Object.keys(errors).length) { setCreateErrors(errors); return }
    setCreateErrors({})
    createMutation.mutate(toApiBody(createForm), {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        setCreateForm(FORM_EMPTY)
        setCreateErrors({})
      },
      onError: (err) => setCreateErrors(extractApiErrors(err)),
    })
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    editMutation.mutate({ id: editingId, body: toApiBody(editForm) }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        setEditingId(null)
        setEditForm(FORM_EMPTY)
      },
    })
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id)
    setEditForm({ nome: customer.nome, telefone: customer.telefone, cpf: customer.cpf ?? '', email: customer.email ?? '' })
  }

  return (
    <div>
      <h1 style={pageTitle}>CLIENTES</h1>

      <div style={listFormLayout}>
        {/* ── Customer list ── */}
        <section>
          <h2 style={sectionHeader}>Cadastro de clientes</h2>

          {isPending ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Nenhum cliente cadastrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {customers.map((customer) => (
                <div key={customer.id}>
                  {/* Customer card */}
                  <div style={{ ...card, opacity: customer.ativo ? 1 : 0.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--white)', fontWeight: 500 }}>
                          {customer.nome}
                        </p>
                        {!customer.ativo && <span style={badge('danger')}>Inativo</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                          {customer.telefone}
                        </span>
                        {customer.cpf && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                            CPF: {customer.cpf}
                          </span>
                        )}
                        {customer.email && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)' }}>
                            {customer.email}
                          </span>
                        )}
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.75rem', letterSpacing: '0.05em', color: customer.saldoDevedor > 0 ? 'var(--danger)' : 'var(--gray)' }}>
                          Saldo: {formatCurrency(customer.saldoDevedor)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => editingId === customer.id ? setEditingId(null) : openEdit(customer)}
                        style={rowActionButton}
                      >
                        {editingId === customer.id ? 'Fechar' : 'Editar'}
                      </button>
                      {customer.ativo && (
                        <button
                          onClick={() => deactivateMutation.mutate(customer.id)}
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
                      <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={label}>Nome *</label>
                            <input type="text" required value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} style={input} />
                          </div>
                          <div>
                            <label style={label}>Telefone *</label>
                            <input type="text" required value={editForm.telefone} onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} style={input} placeholder="11999999999" />
                          </div>
                          <div>
                            <label style={label}>CPF <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
                            <input type="text" value={editForm.cpf} onChange={e => setEditForm({ ...editForm, cpf: e.target.value })} style={input} placeholder="Somente números" />
                          </div>
                          <div>
                            <label style={label}>E-mail <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
                            <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={input} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="submit" disabled={editMutation.isPending} style={{ ...primaryButton(editMutation.isPending), width: 'auto', padding: '0.5rem 1.25rem' }}>
                            {editMutation.isPending ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button type="button" onClick={() => { setEditingId(null); setEditForm(FORM_EMPTY) }} style={secondaryButton}>
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

          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={label}>Nome *</label>
              <input
                type="text"
                value={createForm.nome}
                onChange={e => { setCreateForm({ ...createForm, nome: e.target.value }); setCreateErrors(ce => ({ ...ce, nome: undefined })) }}
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
                onChange={e => { setCreateForm({ ...createForm, telefone: e.target.value }); setCreateErrors(ce => ({ ...ce, telefone: undefined })) }}
                style={{ ...input, borderColor: createErrors.telefone ? 'var(--danger)' : undefined }}
                placeholder="(11) 99999-9999"
              />
              {createErrors.telefone && <p style={fieldError}>{createErrors.telefone}</p>}
            </div>

            <div>
              <label style={label}>CPF <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="text"
                value={createForm.cpf}
                onChange={e => { setCreateForm({ ...createForm, cpf: e.target.value }); setCreateErrors(ce => ({ ...ce, cpf: undefined })) }}
                style={{ ...input, borderColor: createErrors.cpf ? 'var(--danger)' : undefined }}
                placeholder="Somente números"
              />
              {createErrors.cpf && <p style={fieldError}>{createErrors.cpf}</p>}
            </div>

            <div>
              <label style={label}>E-mail <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => { setCreateForm({ ...createForm, email: e.target.value }); setCreateErrors(ce => ({ ...ce, email: undefined })) }}
                style={{ ...input, borderColor: createErrors.email ? 'var(--danger)' : undefined }}
                placeholder="email@exemplo.com"
              />
              {createErrors.email && <p style={fieldError}>{createErrors.email}</p>}
            </div>

            <button type="submit" disabled={createMutation.isPending} style={primaryButton(createMutation.isPending)}>
              {createMutation.isPending ? 'Criando...' : 'Criar cliente'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
