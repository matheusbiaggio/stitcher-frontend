import {
  type CustomerResponse,
  type UnfulfilledRequestResponse,
  createUnfulfilledRequestSchema,
  customerResponseSchema,
  listUnfulfilledRequestsResponseSchema,
} from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { api } from '../lib/api'
import {
  card,
  fieldError,
  formPanel,
  formPanelTitle,
  input,
  label,
  listFormLayout,
  pageTitle,
  primaryButton,
  sectionHeader,
} from '../styles/ui'
import { formatBRDate } from '../utils/formatDate'

interface FormState {
  itemDescricao: string
  customerId?: string
  customerLabel: string
}

const FORM_EMPTY: FormState = { itemDescricao: '', customerLabel: '' }

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

export function ItensProcuradosPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(FORM_EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data, isPending, error: listError, refetch } = useQuery({
    queryKey: ['unfulfilled-requests', 'recent'],
    queryFn: () =>
      api
        .get<unknown>('/unfulfilled-requests', { params: { page: 1, pageSize: 20 } })
        .then((r) => listUnfulfilledRequestsResponseSchema.parse(r.data)),
  })
  const items: UnfulfilledRequestResponse[] = data?.requests ?? []

  const createMutation = useMutation({
    mutationFn: (body: { itemDescricao: string; customerId?: string }) =>
      api
        .post<{ request: UnfulfilledRequestResponse }>('/unfulfilled-requests', body)
        .then((r) => r.data.request),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const result = createUnfulfilledRequestSchema.safeParse({
      itemDescricao: form.itemDescricao,
      customerId: form.customerId ?? '',
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    createMutation.mutate(result.data, {
      onSuccess: () => {
        setForm(FORM_EMPTY)
        setSuccess(true)
        void queryClient.invalidateQueries({ queryKey: ['unfulfilled-requests'] })
      },
      onError: (err) => {
        const msg =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Falha ao registrar. Tente novamente.'
        setError(msg)
      },
    })
  }

  return (
    <div>
      <h1 style={pageTitle}>ITENS PROCURADOS</h1>

      <div style={listFormLayout}>
        {/* Lista recente */}
        <section>
          <h2 style={sectionHeader}>Últimos 20 registros</h2>
          {isPending && (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          )}
          {listError && (
            <div>
              <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>
                Não foi possível carregar os registros.
              </p>
              <button
                onClick={() => {
                  void refetch()
                }}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.35rem 0.9rem',
                  background: 'transparent',
                  border: '1px solid var(--black4)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                }}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!isPending && !listError && items.length === 0 && (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum registro ainda. Use o formulário ao lado para cadastrar o primeiro.
            </p>
          )}
          {!isPending && !listError && items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((r) => (
                <div key={r.id} style={card}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      color: 'var(--white)',
                      fontWeight: 500,
                    }}
                  >
                    {r.itemDescricao}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1.25rem',
                      marginTop: '0.3rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        color: 'var(--gray)',
                      }}
                    >
                      {formatDateTime(r.createdAt)}
                    </span>
                    {r.customerNome && (
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.75rem',
                          color: 'var(--gray)',
                        }}
                      >
                        Cliente: {r.customerNome}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        color: 'var(--gray)',
                      }}
                    >
                      Por: {r.registradoPorNome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Form de registro */}
        <section style={formPanel}>
          <h2 style={formPanelTitle}>Novo registro</h2>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--gray)',
              fontFamily: 'var(--font-body)',
              marginBottom: '1rem',
            }}
          >
            Cadastre um item que um cliente procurou e a loja não tinha.
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
                  setError(null)
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
                setError(null)
              }}
            />

            {error && <p style={fieldError}>{error}</p>}
            {success && (
              <p
                style={{
                  color: 'var(--success, #4ade80)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                }}
              >
                Registro criado com sucesso.
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

          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: 'var(--gray)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Data atual: {formatBRDate(new Date().toISOString().slice(0, 10))}
          </p>
        </section>
      </div>
    </div>
  )
}
