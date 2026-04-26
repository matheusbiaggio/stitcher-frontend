import { type DashboardData } from '@bonistore/shared'
import { useState } from 'react'
import { Link } from 'react-router-dom'

type Alert = DashboardData['lowStockAlerts'][number]

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 10

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

interface LowStockWidgetProps {
  alerts: Alert[]
}

export function LowStockWidget({ alerts }: LowStockWidgetProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const total = alerts.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const items = alerts.slice(start, start + pageSize)

  function handlePageSizeChange(next: number) {
    setPageSize(next)
    setPage(1)
  }

  return (
    <div style={card} data-testid="low-stock-widget">
      <div style={headerBar}>
        <h3 style={heading}>{total > 0 ? `Alertas de Estoque (${total})` : 'Alertas de Estoque'}</h3>
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
              aria-label="Alertas por página"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Link to="/produtos" style={linkButton}>
            Ver produtos
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
          Nenhum alerta de estoque.
        </p>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>Produto</th>
                  <th style={tableHeader}>Variante</th>
                  <th style={{ ...tableHeader, textAlign: 'right' }}>Atual</th>
                  <th style={{ ...tableHeader, textAlign: 'right' }}>Min</th>
                </tr>
              </thead>
              <tbody>
                {items.map((alert) => (
                  <tr key={alert.id}>
                    <td style={tableCell}>{alert.productName}</td>
                    <td style={{ ...tableCell, color: 'var(--gray)' }}>
                      {alert.tamanho} / {alert.cor}
                    </td>
                    <td
                      style={{
                        ...tableCell,
                        textAlign: 'right',
                        color: '#ff6b6b',
                        fontWeight: 500,
                      }}
                    >
                      {alert.estoque}
                    </td>
                    <td style={{ ...tableCell, textAlign: 'right', color: 'var(--gray)' }}>
                      {alert.estoqueMinimo}
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
