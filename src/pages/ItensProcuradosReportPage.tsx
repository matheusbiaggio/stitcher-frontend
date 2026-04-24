import {
  type UnfulfilledRequestResponse,
  listUnfulfilledRequestsResponseSchema,
} from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'

import { api } from '../lib/api'
import {
  input,
  label,
  pageTitle,
  primaryButton,
  rowActionButton,
  rowDangerButton,
  sectionHeader,
} from '../styles/ui'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function defaultFrom(): string {
  return dayjs().subtract(30, 'day').format('YYYY-MM-DD')
}

function defaultTo(): string {
  return dayjs().format('YYYY-MM-DD')
}

async function downloadPdf(from: string, to: string): Promise<void> {
  const response = await api.get<Blob>('/unfulfilled-requests/export.pdf', {
    params: { from, to },
    responseType: 'blob',
  })
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `itens-procurados-${dayjs().format('YYYY-MM-DD')}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ItensProcuradosReportPage() {
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [page, setPage] = useState(1)
  const [exportError, setExportError] = useState<string | null>(null)
  const pageSize = 20

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['unfulfilled-requests', 'report', from, to, page],
    queryFn: () =>
      api
        .get<unknown>('/unfulfilled-requests', {
          params: { from, to, page, pageSize },
        })
        .then((r) => listUnfulfilledRequestsResponseSchema.parse(r.data)),
  })

  const items: UnfulfilledRequestResponse[] = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/unfulfilled-requests/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['unfulfilled-requests'] })
    },
  })

  function handleDelete(id: string) {
    if (!confirm('Excluir este registro? Essa ação pode ser revertida apenas no banco.')) return
    deleteMutation.mutate(id)
  }

  async function handleExport() {
    setExportError(null)
    try {
      await downloadPdf(from, to)
    } catch {
      setExportError('Não foi possível gerar o PDF. Tente novamente.')
    }
  }

  return (
    <div>
      <h1 style={pageTitle}>RELATÓRIO — ITENS PROCURADOS</h1>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'end',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <label style={label}>De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            style={{ ...input, width: 'auto' }}
            max={to}
          />
        </div>
        <div>
          <label style={label}>Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            style={{ ...input, width: 'auto' }}
            min={from}
            max={dayjs().format('YYYY-MM-DD')}
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          style={{ ...primaryButton(false), width: 'auto', padding: '0.55rem 1.25rem' }}
        >
          Exportar PDF
        </button>
      </div>

      {exportError && (
        <p
          style={{
            color: 'var(--danger)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {exportError}
        </p>
      )}

      <h2 style={sectionHeader}>Registros ({total})</h2>

      {isPending && (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      )}
      {error && (
        <div>
          <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>
            Erro ao carregar registros.
          </p>
          <button
            onClick={() => {
              void refetch()
            }}
            style={rowActionButton}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!isPending && !error && items.length === 0 && (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
          Nenhum registro no período.
        </p>
      )}
      {!isPending && !error && items.length > 0 && (
        <>
          <div
            style={{
              background: 'var(--black2)',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '0.6rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gray)',
                      borderBottom: '1px solid var(--black4)',
                    }}
                  >
                    Data/Hora
                  </th>
                  <th
                    style={{
                      padding: '0.6rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gray)',
                      borderBottom: '1px solid var(--black4)',
                    }}
                  >
                    Item
                  </th>
                  <th
                    style={{
                      padding: '0.6rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gray)',
                      borderBottom: '1px solid var(--black4)',
                    }}
                  >
                    Cliente
                  </th>
                  <th
                    style={{
                      padding: '0.6rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gray)',
                      borderBottom: '1px solid var(--black4)',
                    }}
                  >
                    Registrado por
                  </th>
                  <th
                    style={{
                      padding: '0.6rem',
                      textAlign: 'right',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gray)',
                      borderBottom: '1px solid var(--black4)',
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td
                      style={{
                        padding: '0.6rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--white)',
                        borderBottom: '1px solid var(--black4)',
                      }}
                    >
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        color: 'var(--white)',
                        borderBottom: '1px solid var(--black4)',
                      }}
                    >
                      {r.itemDescricao}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--gray)',
                        borderBottom: '1px solid var(--black4)',
                      }}
                    >
                      {r.customerNome ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--gray)',
                        borderBottom: '1px solid var(--black4)',
                      }}
                    >
                      {r.registradoPorNome}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem',
                        textAlign: 'right',
                        borderBottom: '1px solid var(--black4)',
                      }}
                    >
                      <button
                        onClick={() => {
                          handleDelete(r.id)
                        }}
                        disabled={deleteMutation.isPending}
                        style={rowDangerButton}
                        type="button"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1))
                }}
                disabled={page === 1}
                style={rowActionButton}
                type="button"
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
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1))
                }}
                disabled={page === totalPages}
                style={rowActionButton}
                type="button"
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
