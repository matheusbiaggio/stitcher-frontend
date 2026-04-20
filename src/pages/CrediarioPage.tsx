import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, FormEvent } from 'react'

import { api } from '../lib/api'
import {
  pageTitle,
  sectionHeader,
  listFormLayout,
  formPanel,
  formPanelTitle,
  card,
  label,
  input,
  primaryButton,
  fieldError,
  badge,
} from '../styles/ui'

interface CrediarioSale {
  id: string
  total: number
  createdAt: string
}

interface Devedor {
  id: string
  nome: string
  saldoDevedor: number
  telefone: string
  crediarioSales?: CrediarioSale[]
}

function formatMoney(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function CrediarioPage() {
  const queryClient = useQueryClient()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [valor, setValor] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['devedores'],
    queryFn: () =>
      api.get<{ customers: Devedor[] }>('/customers?devedores=true').then((r) => r.data.customers),
  })
  const devedores = data ?? []

  const selectedDevedor = devedores.find((d) => d.id === selectedCustomerId) ?? null

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterOrder, setFilterOrder] = useState<'nome' | 'saldo_desc' | 'saldo_asc'>('nome')

  const filteredDevedores = devedores
    .filter((d) => {
      if (!filterSearch.trim()) return true
      const q = filterSearch.trim().toLowerCase()
      return d.nome.toLowerCase().includes(q) || d.telefone.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (filterOrder === 'saldo_desc') return b.saldoDevedor - a.saldoDevedor
      if (filterOrder === 'saldo_asc') return a.saldoDevedor - b.saldoDevedor
      return a.nome.localeCompare(b.nome)
    })

  const paymentMutation = useMutation({
    mutationFn: (body: { customerId: string; valor: number }) =>
      api.post('/sales/crediario-payments', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devedores'] })
      setValor('')
      setErrorMsg(null)
      setSuccessMsg('Pagamento registrado com sucesso!')
      // If customer no longer a debtor, clear selection
      // (will auto-clear since devedores list refreshes)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setErrorMsg(e.response?.data?.message ?? 'Erro ao registrar pagamento')
      setSuccessMsg(null)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!selectedCustomerId) {
      setErrorMsg('Selecione um cliente')
      return
    }
    const parsedValor = parseFloat(valor.replace(',', '.'))
    if (isNaN(parsedValor) || parsedValor <= 0) {
      setErrorMsg('Informe um valor válido')
      return
    }
    if (selectedDevedor && parsedValor > selectedDevedor.saldoDevedor) {
      setErrorMsg(`Valor excede o saldo devedor de ${formatMoney(selectedDevedor.saldoDevedor)}`)
      return
    }

    paymentMutation.mutate({ customerId: selectedCustomerId, valor: parsedValor })
  }

  return (
    <div>
      <h1 style={pageTitle}>CREDIÁRIO</h1>

      <div style={listFormLayout}>
        {/* Debtors list */}
        <section>
          <h2 style={sectionHeader}>Clientes devedores</h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => {
                setFilterSearch(e.target.value)
              }}
              placeholder="Buscar por nome ou telefone..."
              style={{ ...input, flex: '1 1 240px', minWidth: '200px' }}
            />
            <select
              value={filterOrder}
              onChange={(e) => {
                setFilterOrder(e.target.value as 'nome' | 'saldo_desc' | 'saldo_asc')
              }}
              style={{ ...input, flex: '0 0 180px', cursor: 'pointer' }}
            >
              <option value="nome">Ordenar por nome</option>
              <option value="saldo_desc">Maior saldo devedor</option>
              <option value="saldo_asc">Menor saldo devedor</option>
            </select>
          </div>

          {isPending ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : devedores.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum cliente com saldo devedor.
            </p>
          ) : filteredDevedores.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum devedor corresponde aos filtros.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredDevedores.map((devedor) => (
                <button
                  key={devedor.id}
                  onClick={() => {
                    setSelectedCustomerId(devedor.id)
                    setValor('')
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                  style={{
                    ...card,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background:
                      selectedCustomerId === devedor.id ? 'var(--black3)' : 'var(--black2)',
                    border: `1px solid ${selectedCustomerId === devedor.id ? 'var(--gray)' : 'var(--black4)'}`,
                    width: '100%',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.9rem',
                        color: 'var(--white)',
                        fontWeight: 500,
                        marginBottom: '0.2rem',
                      }}
                    >
                      {devedor.nome}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--gray)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {devedor.telefone}
                    </p>
                    {devedor.crediarioSales && devedor.crediarioSales.length > 0 && (
                      <p
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.7rem',
                          color: 'var(--gray)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Compras:{' '}
                        {devedor.crediarioSales.map((s) => formatDate(s.createdAt)).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={badge('danger')}>{formatMoney(devedor.saldoDevedor)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Payment form */}
        <section style={formPanel}>
          <h2 style={formPanelTitle}>Registrar pagamento</h2>

          {!selectedCustomerId ? (
            <p
              style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
            >
              Selecione um cliente da lista para registrar um pagamento.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label style={label}>Cliente selecionado</label>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    color: 'var(--white)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {selectedDevedor?.nome}
                </div>
                {selectedDevedor && (
                  <div
                    style={{
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.75rem',
                      color: 'var(--danger)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Saldo devedor: {formatMoney(selectedDevedor.saldoDevedor)}
                  </div>
                )}
              </div>

              {selectedDevedor?.crediarioSales && selectedDevedor.crediarioSales.length > 0 && (
                <div>
                  <label style={label}>Compras no crediário</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {selectedDevedor.crediarioSales.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.45rem 0.65rem',
                          background: 'var(--black3)',
                          border: '1px solid var(--black4)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            color: 'var(--white)',
                          }}
                        >
                          {formatDate(s.createdAt)}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            color: 'var(--gray)',
                          }}
                        >
                          {formatMoney(s.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={label}>Valor do pagamento (R$)</label>
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => {
                    setValor(e.target.value)
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                  style={input}
                  placeholder="0,00"
                />
              </div>

              {selectedDevedor && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setValor(String(selectedDevedor.saldoDevedor))
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: 'transparent',
                      border: '1px solid var(--black4)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--gray)',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Pagar tudo ({formatMoney(selectedDevedor.saldoDevedor)})
                  </button>
                </div>
              )}

              {errorMsg && <p style={fieldError}>{errorMsg}</p>}
              {successMsg && (
                <p
                  style={{
                    color: 'var(--success)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={paymentMutation.isPending}
                style={primaryButton(paymentMutation.isPending)}
              >
                {paymentMutation.isPending ? 'Registrando...' : 'Registrar pagamento'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
