import {
  type UnfulfilledRequestResponse,
  listUnfulfilledRequestsResponseSchema,
} from '@bonistore/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../lib/api'

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 10

function formatDateTime(iso: string): string {
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
  padding: '1.25rem',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  margin: 0,
}

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--gray)',
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

const verTodosLink: React.CSSProperties = {
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

export function LembretesWidget() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const query = useQuery({
    queryKey: ['unfulfilled-requests', 'dashboard', page, pageSize],
    queryFn: () =>
      api
        .get<unknown>('/unfulfilled-requests', { params: { page, pageSize } })
        .then((r) => listUnfulfilledRequestsResponseSchema.parse(r.data)),
    refetchOnMount: 'always',
  })

  const items: UnfulfilledRequestResponse[] = query.data?.requests ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handlePageSizeChange(next: number) {
    setPageSize(next)
    setPage(1)
  }

  return (
    <div style={card} data-testid="lembretes-widget">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={heading}>{total > 0 ? `Lembretes (${total})` : 'Lembretes'}</h3>
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
              aria-label="Lembretes por página"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Link to="/lembretes" style={verTodosLink}>
            Ver lembretes
          </Link>
        </div>
      </div>

      {query.isPending && <p style={muted}>Carregando...</p>}

      {query.isError && (
        <div>
          <p style={{ ...muted, color: 'var(--danger)' }}>Não foi possível carregar lembretes.</p>
          <button
            onClick={() => {
              void query.refetch()
            }}
            style={{ ...pagerButton, marginTop: '0.5rem' }}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {query.isSuccess && items.length === 0 && (
        <p style={muted}>Nenhum lembrete registrado.</p>
      )}

      {query.isSuccess && items.length > 0 && (
        <>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>Data/Hora</th>
                  <th style={tableHeader}>Item</th>
                  <th style={tableHeader}>Cliente</th>
                  <th style={tableHeader}>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...tableCell, whiteSpace: 'nowrap' }}>
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td style={tableCell}>{r.itemDescricao}</td>
                    <td style={{ ...tableCell, color: 'var(--gray)' }}>
                      {r.customerNome ?? '—'}
                    </td>
                    <td style={{ ...tableCell, color: 'var(--gray)' }}>{r.registradoPorNome}</td>
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
                marginTop: '1rem',
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
