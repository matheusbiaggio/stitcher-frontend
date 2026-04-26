import {
  type CustomerResponse,
  type UnfulfilledRequestResponse,
  createUnfulfilledRequestSchema,
  customerResponseSchema,
  listUnfulfilledRequestsResponseSchema,
} from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { api } from '../lib/api'
import {
  fieldError,
  formPanel,
  formPanelTitle,
  input,
  label,
  listFormLayout,
  pageTitle,
  primaryButton,
  rowActionButton,
  rowDangerButton,
  sectionHeader,
} from '../styles/ui'

interface FormState {
  itemDescricao: string
  customerId?: string
  customerLabel: string
}

const FORM_EMPTY: FormState = { itemDescricao: '', customerLabel: '' }
const PAGE_SIZE = 50

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(value)
    }, delay)
    return () => {
      clearTimeout(t)
    }
  }, [value, delay])
  return debounced
}

function CustomerAutocomplete({
  label: labelText,
  value,
  onSelect,
}: {
  label: string
  value: string
  onSelect: (customer: CustomerResponse | null, displayLabel: string) => void
}) {
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(value, 250)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['customers', 'search', debouncedQuery],
    queryFn: () =>
      api
        .get<{ customers: unknown[] }>('/customers/search', {
          params: { q: debouncedQuery },
        })
        .then((r) => r.data.customers.map((c) => customerResponseSchema.parse(c))),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [])

  const items = data ?? []

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={label}>
        {labelText}{' '}
        <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onSelect(null, e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
        }}
        style={input}
        placeholder="Digite o nome, telefone ou CPF"
      />
      {open && debouncedQuery.trim().length >= 2 && items.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--black2)',
            border: '1px solid var(--black4)',
            borderRadius: 'var(--radius)',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 10,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {items.map((c) => (
            <li
              key={c.id}
              onClick={() => {
                onSelect(c, c.nome)
                setOpen(false)
              }}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--black4)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'var(--white)',
              }}
            >
              {c.nome}{' '}
              <span style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>
                · {c.telefone}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function extractApiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
  )
}

async function downloadPdf(): Promise<void> {
  const response = await api.get<Blob>('/unfulfilled-requests/export.pdf', {
    responseType: 'blob',
  })
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lembretes-${dayjs().format('YYYY-MM-DD')}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const CONFIRM_TOKEN = 'EXCLUIR'

function DeleteAllModal({
  total,
  onConfirm,
  onClose,
  isPending,
  errorMessage,
}: {
  total: number
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
  errorMessage: string | null
}) {
  const [typed, setTyped] = useState('')
  const matches = typed.trim().toUpperCase() === CONFIRM_TOKEN

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar exclusão de todos os lembretes"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        style={{
          background: 'var(--black2)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          maxWidth: '440px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.85rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--danger)',
            margin: 0,
          }}
        >
          Excluir todos os lembretes
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: 'var(--white)',
            margin: 0,
          }}
        >
          Você está prestes a excluir <strong>{total}</strong>{' '}
          {total === 1 ? 'lembrete' : 'lembretes'}. Essa ação só pode ser revertida diretamente no
          banco de dados.
        </p>
        <div>
          <label style={label}>
            Para confirmar, digite{' '}
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{CONFIRM_TOKEN}</span>
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
            }}
            style={input}
            autoFocus
            disabled={isPending}
            placeholder={CONFIRM_TOKEN}
          />
        </div>
        {errorMessage && <p style={fieldError}>{errorMessage}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{ ...rowActionButton, padding: '0.55rem 1rem', fontSize: '0.75rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || isPending}
            style={{
              ...rowDangerButton,
              padding: '0.55rem 1rem',
              fontSize: '0.75rem',
              opacity: matches && !isPending ? 1 : 0.5,
              cursor: matches && !isPending ? 'pointer' : 'not-allowed',
              background: matches ? 'var(--danger)' : 'transparent',
              color: matches ? 'var(--black)' : 'var(--danger)',
              fontWeight: 600,
            }}
          >
            {isPending ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function LembretesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(FORM_EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [page, setPage] = useState(1)
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null)

  const { data, isPending, error: listError, refetch } = useQuery({
    queryKey: ['unfulfilled-requests', 'list', page],
    queryFn: () =>
      api
        .get<unknown>('/unfulfilled-requests', { params: { page, pageSize: PAGE_SIZE } })
        .then((r) => listUnfulfilledRequestsResponseSchema.parse(r.data)),
  })
  const items: UnfulfilledRequestResponse[] = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const createMutation = useMutation({
    mutationFn: (body: { itemDescricao: string; customerId?: string }) =>
      api
        .post<{ request: UnfulfilledRequestResponse }>('/unfulfilled-requests', body)
        .then((r) => r.data.request),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/unfulfilled-requests/${id}`),
    onSuccess: () => {
      setDeleteError(null)
      void queryClient.invalidateQueries({ queryKey: ['unfulfilled-requests'] })
    },
    onError: (err) => {
      setDeleteError(extractApiError(err, 'Falha ao excluir lembrete.'))
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete('/unfulfilled-requests'),
    onSuccess: () => {
      setDeleteAllError(null)
      setDeleteAllOpen(false)
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ['unfulfilled-requests'] })
    },
    onError: (err) => {
      setDeleteAllError(extractApiError(err, 'Falha ao excluir lembretes.'))
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccess(false)
    const result = createUnfulfilledRequestSchema.safeParse({
      itemDescricao: form.itemDescricao,
      customerId: form.customerId ?? '',
    })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    createMutation.mutate(result.data, {
      onSuccess: () => {
        setForm(FORM_EMPTY)
        setSuccess(true)
        void queryClient.invalidateQueries({ queryKey: ['unfulfilled-requests'] })
      },
      onError: (err) => {
        setFormError(extractApiError(err, 'Falha ao registrar. Tente novamente.'))
      },
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este lembrete? Essa ação pode ser revertida apenas no banco.')) return
    setDeleteError(null)
    deleteMutation.mutate(id)
  }

  async function handleExport() {
    setExportError(null)
    try {
      await downloadPdf()
    } catch (err) {
      setExportError(extractApiError(err, 'Não foi possível gerar o PDF. Tente novamente.'))
    }
  }

  function openDeleteAll() {
    setDeleteAllError(null)
    setDeleteAllOpen(true)
  }

  return (
    <div>
      <h1 style={pageTitle}>LEMBRETES</h1>

      <div style={listFormLayout}>
        {/* Lista paginada */}
        <section>
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
            <h2 style={{ ...sectionHeader, marginBottom: 0 }}>
              {total > 0 ? `Lembretes (${total})` : 'Lembretes'}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleExport}
                style={rowActionButton}
                disabled={items.length === 0}
              >
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={openDeleteAll}
                style={rowDangerButton}
                disabled={items.length === 0 || deleteAllMutation.isPending}
              >
                Excluir todos
              </button>
            </div>
          </div>

          {exportError && (
            <p
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              {exportError}
            </p>
          )}
          {deleteError && (
            <p
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              {deleteError}
            </p>
          )}

          {isPending && (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          )}
          {listError && (
            <div>
              <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>
                Não foi possível carregar os lembretes.
              </p>
              <button
                onClick={() => {
                  void refetch()
                }}
                style={{ ...rowActionButton, marginTop: '0.5rem' }}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!isPending && !listError && items.length === 0 && (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum lembrete registrado. Use o formulário ao lado para cadastrar o primeiro.
            </p>
          )}
          {!isPending && !listError && items.length > 0 && (
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
                      {['Data/Hora', 'Item', 'Cliente', 'Registrado por'].map((h) => (
                        <th
                          key={h}
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
                          {h}
                        </th>
                      ))}
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
                            whiteSpace: 'nowrap',
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
        </section>

        {/* Form de registro */}
        <section style={formPanel}>
          <h2 style={formPanelTitle}>Novo lembrete</h2>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--gray)',
              fontFamily: 'var(--font-body)',
              marginBottom: '1rem',
            }}
          >
            Registre um item para comprar depois ou que um cliente pediu e a loja não tinha.
          </p>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label style={label}>Descrição do item *</label>
              <textarea
                value={form.itemDescricao}
                onChange={(e) => {
                  setForm({ ...form, itemDescricao: e.target.value })
                  setFormError(null)
                  setSuccess(false)
                }}
                style={{
                  ...input,
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'var(--font-body)',
                }}
                placeholder="Ex: bolsa preta tamanho M, tênis 42, vestido longo..."
                maxLength={500}
              />
            </div>

            <CustomerAutocomplete
              label="Cliente"
              value={form.customerLabel}
              onSelect={(customer, labelText) => {
                setForm({
                  ...form,
                  customerId: customer?.id,
                  customerLabel: labelText,
                })
                setFormError(null)
              }}
            />

            {formError && <p style={fieldError}>{formError}</p>}
            {success && (
              <p
                style={{
                  color: 'var(--success, #4ade80)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                }}
              >
                Lembrete criado com sucesso.
              </p>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending}
              style={primaryButton(createMutation.isPending)}
            >
              {createMutation.isPending ? 'Salvando...' : 'Registrar'}
            </button>
          </form>
        </section>
      </div>

      {deleteAllOpen && (
        <DeleteAllModal
          total={total}
          isPending={deleteAllMutation.isPending}
          errorMessage={deleteAllError}
          onClose={() => {
            if (!deleteAllMutation.isPending) {
              setDeleteAllOpen(false)
              setDeleteAllError(null)
            }
          }}
          onConfirm={() => {
            deleteAllMutation.mutate()
          }}
        />
      )}
    </div>
  )
}
