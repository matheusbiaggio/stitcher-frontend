import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface CustomerHistoryResponse {
  customer: {
    id: string
    nome: string
  }
  compras: unknown[]
  totalGasto: number
}

function formatCurrency(value: number): string {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

export function CustomerHistoryPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isPending } = useQuery({
    queryKey: ['customer-history', id],
    queryFn: () => api.get<CustomerHistoryResponse>(`/customers/${id}/compras`).then(r => r.data),
    enabled: !!id,
  })

  return (
    <div>
      {/* Back link */}
      <Link
        to="/clientes"
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--gray)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          marginBottom: '1.5rem',
        }}
      >
        ← Voltar para clientes
      </Link>

      {/* Header */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        letterSpacing: '0.05em',
        color: 'var(--white)',
        marginBottom: '0.5rem',
      }}>
        HISTÓRICO DE COMPRAS
      </h1>

      {isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      ) : data ? (
        <>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'var(--gray)',
            marginBottom: '1.5rem',
          }}>
            {data.customer.nome}
          </p>

          <div style={{
            background: 'var(--black2)',
            border: '1px solid var(--black4)',
            borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem',
            display: 'inline-block',
            marginBottom: '2rem',
          }}>
            <p style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
              marginBottom: '0.25rem',
            }}>
              Total Gasto
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              color: 'var(--white)',
            }}>
              {formatCurrency(data.totalGasto)}
            </p>
          </div>

          {data.compras.length === 0 ? (
            <div style={{
              background: 'var(--black2)',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius)',
              padding: '2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
                Nenhuma compra registrada.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Cliente não encontrado.</p>
      )}
    </div>
  )
}
