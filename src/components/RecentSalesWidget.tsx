import { type DashboardData } from '@bonistore/shared'
import { useState } from 'react'
import { Link } from 'react-router-dom'

type Sale = DashboardData['recentSales'][number]
type SaleItem = Sale['itens'][number]

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 10

function formatItems(itens: SaleItem[]): string {
  if (!itens || itens.length === 0) return '---'
  return itens
    .map(
      (i) => `${i.variant.product.nome} (${i.variant.tamanho}/${i.variant.cor}) ×${i.quantidade}`,
    )
    .join(', ')
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const card: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  height: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  margin: 0,
}

const headerBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '1.25rem 1.25rem 0.75rem',
  flexWrap: 'wrap',
}

const tableHeader: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  padding: '0.6rem 0.75rem',
  textAlign: 'left',
  borderBottom: '1px solid var(--black3)',
}

const tableCell: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--white)',
  padding: '0.6rem 0.75rem',
  borderBottom: '1px solid var(--black3)',
}

const pagerButton: React.CSSProperties = {
  padding: '0.3rem 0.7rem',
  background: 'transparent',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--gray)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const pageSizeSelect: React.CSSProperties = {
  padding: '0.3rem 0.5rem',
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  cursor: 'pointer',
}

const linkButton: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  textDecoration: 'none',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  padding: '0.3rem 0.7rem',
}

interface RecentSalesWidgetProps {
  sales: Sale[]
}

export function RecentSalesWidget({ sales }: RecentSalesWidgetProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const total = sales.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const items = sales.slice(start, start + pageSize)

  function handlePageSizeChange(next: number) {
    setPageSize(next)
    setPage(1)
  }

  return (
    <div style={card} data-testid="recent-sales-widget">
      <div style={headerBar}>
        <h3 style={heading}>{total > 0 ? `Últimas Vendas (${total})` : 'Últimas Vendas'}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Por página
            <select
              value={pageSize}
              onChange={(e) => {
                handlePageSizeChange(Number(e.target.value))
              }}
              style={pageSizeSelect}
              aria-label="Vendas por página"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Link to="/vendas" style={linkButton}>
            Ver vendas
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            color: 'var(--gray)',
            padding: '0 1.25rem 1.25rem',
            margin: 0,
          }}
        >
          Nenhuma venda recente.
        </p>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>Data</th>
                  <th style={tableHeader}>Cliente</th>
                  <th style={tableHeader}>Itens</th>
                  <th style={tableHeader}>Operador</th>
                  <th style={tableHeader}>Pagamento</th>
                  <th style={{ ...tableHeader, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ ...tableCell, whiteSpace: 'nowrap' }}>
                      {formatDate(sale.createdAt)}
                    </td>
                    <td
                      style={{
                        ...tableCell,
                        color: sale.customer ? 'var(--white)' : 'var(--gray)',
                      }}
                    >
                      {sale.customer?.nome ?? '---'}
                    </td>
                    <td style={{ ...tableCell, color: 'var(--gray)', fontSize: '0.75rem' }}>
                      {formatItems(sale.itens)}
                    </td>
                    <td style={{ ...tableCell, color: 'var(--gray)' }}>{sale.user.nome}</td>
                    <td style={tableCell}>{sale.formaPagamento}</td>
                    <td style={{ ...tableCell, textAlign: 'right', fontWeight: 500 }}>
                      {formatMoney(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem 1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1))
                }}
                disabled={page === 1}
                style={pagerButton}
              >
                Anterior
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--gray)',
                }}
              >
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1))
                }}
                disabled={page === totalPages}
                style={pagerButton}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
