import {
  listBirthdayMessagesResponseSchema,
  type BirthdayMessageResponse,
} from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'
import { formatBRPhone } from '../utils/formatPhone'

const card: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
}

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  marginBottom: '1rem',
}

const primaryBtn: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  background: 'var(--white)',
  color: 'var(--black)',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 600,
  cursor: 'pointer',
}

const subtleBtn: React.CSSProperties = {
  padding: '0.3rem 0.7rem',
  background: 'transparent',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  cursor: 'pointer',
}

function buildWaMeUrl(telefone: string, text: string): string {
  const digits = telefone.replace(/\D/g, '')
  // BR: prefixo 55
  const full = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export function BirthdayMessagesPanel() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['birthday-messages', 'pending'],
    queryFn: () =>
      api
        .get<unknown>('/birthday-messages', { params: { status: 'PENDING' } })
        .then((r) => listBirthdayMessagesResponseSchema.parse(r.data).messages),
    refetchOnMount: 'always',
  })

  const markMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'SENT' | 'SKIPPED' }) =>
      api.patch(`/birthday-messages/${id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['birthday-messages'] })
    },
  })

  if (query.isPending) {
    return (
      <div style={card} data-testid="birthday-messages-panel">
        <h3 style={heading}>Mensagens de aniversário</h3>
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div style={card} data-testid="birthday-messages-panel">
        <h3 style={heading}>Mensagens de aniversário</h3>
        <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
          Erro ao carregar mensagens.
        </p>
        <button
          onClick={() => {
            void query.refetch()
          }}
          style={subtleBtn}
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const messages: BirthdayMessageResponse[] = query.data ?? []

  if (messages.length === 0) {
    return null // Oculta a seção quando não há pendentes.
  }

  function openAll() {
    let blocked = 0
    for (const m of messages) {
      const url = buildWaMeUrl(m.customerTelefone, m.messageText)
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) blocked++
    }
    if (blocked > 0) {
      alert(
        `O navegador bloqueou ${blocked} aba(s). Permita pop-ups para este site e tente novamente.`,
      )
    }
  }

  function markAllSent() {
    for (const m of messages) {
      markMutation.mutate({ id: m.id, status: 'SENT' })
    }
  }

  return (
    <div style={card} data-testid="birthday-messages-panel">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ ...heading, marginBottom: 0 }}>
          {`Mensagens de aniversário (${messages.length})`}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={openAll} style={primaryBtn} type="button">
            🎂 Enviar todas
          </button>
          <button onClick={markAllSent} style={subtleBtn} type="button">
            Marcar todas enviadas
          </button>
        </div>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          color: 'var(--gray)',
          marginBottom: '0.75rem',
        }}
      >
        Ao clicar <strong>Enviar todas</strong>, o navegador abrirá uma aba do WhatsApp Web para
        cada cliente com a mensagem pré-preenchida. Revise e envie em cada aba.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.6rem 0.8rem',
              background: 'var(--black3)',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  color: 'var(--white)',
                  fontWeight: 500,
                }}
              >
                {m.customerNome}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--gray)',
                }}
              >
                {formatBRPhone(m.customerTelefone)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <a
                href={buildWaMeUrl(m.customerTelefone, m.messageText)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...subtleBtn,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Abrir
              </a>
              <button
                onClick={() => markMutation.mutate({ id: m.id, status: 'SENT' })}
                style={subtleBtn}
                type="button"
              >
                ✓ Enviada
              </button>
              <button
                onClick={() => markMutation.mutate({ id: m.id, status: 'SKIPPED' })}
                style={subtleBtn}
                type="button"
              >
                Pular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
