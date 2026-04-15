import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  pageTitle, sectionHeader, card, badge, rowDangerButton,
} from '../styles/ui'

interface SaleCustomer {
  id: string
  nome: string
}

interface SaleUser {
  id: string
  nome: string
}

interface Sale {
  id: string
  total: number
  status: 'COMPLETED' | 'CANCELLED'
  formaPagamento: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CREDIARIO'
  createdAt: string
  customer: SaleCustomer | null
  user: SaleUser
}

function formatMoney(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function paymentLabel(forma: Sale['formaPagamento']): string {
  const map: Record<Sale['formaPagamento'], string> = {
    PIX: 'PIX',
    DINHEIRO: 'Dinheiro',
    CARTAO: 'Cartão',
    CREDIARIO: 'Crediário',
  }
  return map[forma]
}

export function SalesPage() {
  const queryClient = useQueryClient()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get<{ sales: Sale[] }>('/sales').then(r => r.data.sales),
  })
  const sales = data ?? []

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sales/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
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
        <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {cancelError}
        </p>
      )}

      {isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      ) : sales.length === 0 ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Nenhuma venda registrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 110px 1fr 1fr 80px 90px 100px', gap: '1rem', padding: '0 1rem', paddingBottom: '0.5rem' }}>
            {['Data/Hora', 'Pagamento', 'Cliente', 'Operador', 'Total', 'Status', 'Ações'].map(col => (
              <span key={col} style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--gray)', textTransform: 'uppercase' }}>
                {col}
              </span>
            ))}
          </div>

          {sales.map(sale => (
            <div key={sale.id} style={{ ...card, opacity: sale.status === 'CANCELLED' ? 0.7 : 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 110px 1fr 1fr 80px 90px 100px', gap: '1rem', alignItems: 'center' }}>
                {/* Date/time */}
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--white)' }}>
                  {formatDateTime(sale.createdAt)}
                </span>

                {/* Payment */}
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.75rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {paymentLabel(sale.formaPagamento)}
                </span>

                {/* Customer */}
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: sale.customer ? 'var(--white)' : 'var(--gray)' }}>
                  {sale.customer?.nome ?? '—'}
                </span>

                {/* Operator */}
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--gray)' }}>
                  {sale.user.nome}
                </span>

                {/* Total */}
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--white)', fontWeight: 500 }}>
                  {formatMoney(sale.total)}
                </span>

                {/* Status */}
                <span style={badge(sale.status === 'COMPLETED' ? 'success' : 'gray')}>
                  {sale.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                </span>

                {/* Actions */}
                <div>
                  {sale.status === 'COMPLETED' && (
                    confirmCancelId === sale.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => cancelMutation.mutate(sale.id)}
                          disabled={cancelMutation.isPending}
                          style={{ ...rowDangerButton, fontSize: '0.6rem', padding: '0.2rem 0.45rem' }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmCancelId(null)}
                          style={{ padding: '0.2rem 0.45rem', background: 'transparent', border: '1px solid var(--black4)', borderRadius: 'var(--radius)', color: 'var(--gray)', fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.05em', cursor: 'pointer', textTransform: 'uppercase' as const }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmCancelId(sale.id); setCancelError(null) }}
                        style={rowDangerButton}
                      >
                        Cancelar
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
