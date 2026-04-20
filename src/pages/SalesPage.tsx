import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { type PaymentMethod } from '@bonistore/shared'

import { api } from '../lib/api'
import { pageTitle, sectionHeader, card, badge, rowDangerButton, input } from '../styles/ui'

interface SaleCustomer {
  id: string
  nome: string
}

interface SaleUser {
  id: string
  nome: string
}

interface SaleItem {
  id: string
  quantidade: number
  precoUnitario: number
  variant: {
    id: string
    tamanho: string
    cor: string
    product: { id: string; nome: string; sku: string }
  }
}

interface Sale {
  id: string
  total: number
  status: 'COMPLETED' | 'CANCELLED'
  formaPagamento: PaymentMethod
  createdAt: string
  customer: SaleCustomer | null
  user: SaleUser
  itens: SaleItem[]
}

function formatItems(itens: SaleItem[]): string {
  if (!itens || itens.length === 0) return '---'
  return itens
    .map(
      (i) => `${i.variant.product.nome} (${i.variant.tamanho}/${i.variant.cor}) ×${i.quantidade}`,
    )
    .join(', ')
}

function formatMoney(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const paymentLabels: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  CREDIARIO: 'Crediário',
}

function paymentLabel(forma: Sale['formaPagamento']): string {
  return paymentLabels[forma]
}

export function SalesPage() {
  const queryClient = useQueryClient()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get<{ sales: Sale[] }>('/sales').then((r) => r.data.sales),
  })
  const sales = data ?? []

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'COMPLETED' | 'CANCELLED'>('all')
  const [filterPagamento, setFilterPagamento] = useState<'all' | Sale['formaPagamento']>('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const filteredSales = sales.filter((sale) => {
    if (filterStatus !== 'all' && sale.status !== filterStatus) return false
    if (filterPagamento !== 'all' && sale.formaPagamento !== filterPagamento) return false
    if (filterStartDate) {
      if (new Date(sale.createdAt) < new Date(`${filterStartDate}T00:00:00`)) return false
    }
    if (filterEndDate) {
      if (new Date(sale.createdAt) > new Date(`${filterEndDate}T23:59:59.999`)) return false
    }
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase()
      const match =
        (sale.customer?.nome.toLowerCase().includes(q) ?? false) ||
        sale.user.nome.toLowerCase().includes(q) ||
        sale.itens.some(
          (i) =>
            i.variant.product.nome.toLowerCase().includes(q) ||
            i.variant.product.sku.toLowerCase().includes(q),
        )
      if (!match) return false
    }
    return true
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sales/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['pdv-catalog'] })
      setConfirmCancelId(null)
      setCancelError(null)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setCancelError(e.response?.data?.message ?? 'Erro ao cancelar venda')
      setConfirmCancelId(null)
    },
  })

  return (
    <div>
      <h1 style={pageTitle}>VENDAS</h1>

      <h2 style={sectionHeader}>Histórico de vendas</h2>

      {cancelError && (
        <p
          style={{
            color: 'var(--danger)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {cancelError}
        </p>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => {
            setFilterSearch(e.target.value)
          }}
          placeholder="Buscar por cliente, operador, produto ou SKU..."
          style={{ ...input, flex: '1 1 240px', minWidth: '200px' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as 'all' | 'COMPLETED' | 'CANCELLED')
          }}
          style={{ ...input, flex: '0 0 140px', cursor: 'pointer' }}
        >
          <option value="all">Todos status</option>
          <option value="COMPLETED">Concluída</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <select
          value={filterPagamento}
          onChange={(e) => {
            setFilterPagamento(e.target.value as 'all' | Sale['formaPagamento'])
          }}
          style={{ ...input, flex: '0 0 150px', cursor: 'pointer' }}
        >
          <option value="all">Todos pagamentos</option>
          <option value="PIX">PIX</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="CARTAO">Cartão</option>
          <option value="CREDIARIO">Crediário</option>
        </select>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => {
            setFilterStartDate(e.target.value)
          }}
          style={{ ...input, flex: '0 0 150px' }}
        />
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => {
            setFilterEndDate(e.target.value)
          }}
          style={{ ...input, flex: '0 0 150px' }}
        />
      </div>

      {isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      ) : sales.length === 0 ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
          Nenhuma venda registrada.
        </p>
      ) : filteredSales.length === 0 ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
          Nenhuma venda corresponde aos filtros.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 100px 1fr 2fr 130px 80px 90px 100px',
              gap: '1rem',
              padding: '0 1rem',
              paddingBottom: '0.5rem',
            }}
          >
            {[
              'Data/Hora',
              'Pagamento',
              'Cliente',
              'Itens',
              'Operador',
              'Total',
              'Status',
              'Ações',
            ].map((col) => (
              <span
                key={col}
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--gray)',
                  textTransform: 'uppercase',
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {filteredSales.map((sale) => (
            <div key={sale.id} style={{ ...card, opacity: sale.status === 'CANCELLED' ? 0.7 : 1 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '150px 100px 1fr 2fr 130px 80px 90px 100px',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                {/* Date/time */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    color: 'var(--white)',
                  }}
                >
                  {formatDateTime(sale.createdAt)}
                </span>

                {/* Payment */}
                <span
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '0.75rem',
                    color: 'var(--gray)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {paymentLabel(sale.formaPagamento)}
                </span>

                {/* Customer */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: sale.customer ? 'var(--white)' : 'var(--gray)',
                  }}
                >
                  {sale.customer?.nome ?? '—'}
                </span>

                {/* Items */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--gray)',
                    lineHeight: 1.3,
                  }}
                >
                  {formatItems(sale.itens)}
                </span>

                {/* Operator */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--gray)',
                  }}
                >
                  {sale.user.nome}
                </span>

                {/* Total */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--white)',
                    fontWeight: 500,
                  }}
                >
                  {formatMoney(sale.total)}
                </span>

                {/* Status */}
                <span style={badge(sale.status === 'COMPLETED' ? 'success' : 'gray')}>
                  {sale.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                </span>

                {/* Actions */}
                <div>
                  {sale.status === 'COMPLETED' &&
                    (confirmCancelId === sale.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => {
                            cancelMutation.mutate(sale.id)
                          }}
                          disabled={cancelMutation.isPending}
                          style={{
                            ...rowDangerButton,
                            fontSize: '0.6rem',
                            padding: '0.2rem 0.45rem',
                          }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => {
                            setConfirmCancelId(null)
                          }}
                          style={{
                            padding: '0.2rem 0.45rem',
                            background: 'transparent',
                            border: '1px solid var(--black4)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--gray)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.6rem',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            textTransform: 'uppercase' as const,
                          }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmCancelId(sale.id)
                          setCancelError(null)
                        }}
                        style={rowDangerButton}
                      >
                        Cancelar
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
