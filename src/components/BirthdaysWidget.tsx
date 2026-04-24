import {
  birthdaysResponseSchema,
  composeBirthdayMessage,
  endOfWeekSunday,
  startOfWeekMonday,
  type BirthdayItem,
} from '@bonistore/shared'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { api } from '../lib/api'
import { formatBRPhone } from '../utils/formatPhone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'America/Sao_Paulo'

function todayInBR(): string {
  return dayjs().tz(TZ).format('YYYY-MM-DD')
}

const DAY_LABELS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Gera array de 7 datas YYYY-MM-DD da segunda ao domingo dada a segunda. */
function weekDates(mondayISO: string): string[] {
  const monday = dayjs(mondayISO)
  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day').format('YYYY-MM-DD'))
}

function formatShort(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

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

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--gray)',
}

const retryBtn: React.CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.35rem 0.9rem',
  background: 'transparent',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
}

async function fetchBirthdaysRange(from: string, to: string): Promise<BirthdayItem[]> {
  const r = await api.get<unknown>('/customers/birthdays', { params: { from, to } })
  return birthdaysResponseSchema.parse(r.data).birthdays
}

function buildWaMeUrl(telefone: string, text: string): string {
  const d = telefone.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

const sendBtn: React.CSSProperties = {
  padding: '0.2rem 0.5rem',
  background: 'var(--success, #4ade80)',
  border: 'none',
  borderRadius: 'var(--radius)',
  color: 'var(--black)',
  cursor: 'pointer',
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '0.3rem',
}

interface DayCellProps {
  iso: string
  label: string
  isToday: boolean
  isPast: boolean
  items: BirthdayItem[]
}

function DayCell({ iso, label, isToday, isPast, items }: DayCellProps) {
  return (
    <div
      style={{
        background: isToday ? 'var(--black3)' : 'var(--black2)',
        border: `1px solid ${isToday ? 'var(--success, #4ade80)' : 'var(--black4)'}`,
        borderRadius: 'var(--radius)',
        padding: '0.75rem',
        minHeight: '110px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        opacity: isPast && !isToday ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.25rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isToday ? 'var(--success, #4ade80)' : 'var(--gray)',
            fontWeight: isToday ? 700 : 400,
          }}
        >
          {isToday ? `🎂 ${label}` : label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: 'var(--gray)',
          }}
        >
          {formatShort(iso)}
        </span>
      </div>

      {items.length === 0 ? (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: 'var(--gray)',
            fontStyle: 'italic',
            opacity: 0.6,
          }}
        >
          Nenhum aniversariante
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {items.map((b) => {
            const hasPhone = b.telefone && b.telefone.replace(/\D/g, '').length >= 10
            return (
              <div key={b.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--white)',
                    fontWeight: 500,
                  }}
                >
                  {b.nome}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    color: 'var(--gray)',
                    lineHeight: 1.2,
                  }}
                >
                  {formatBRPhone(b.telefone)} · Faz {b.idadeCompletando}
                </span>
                {isToday && hasPhone && (
                  <a
                    href={buildWaMeUrl(b.telefone, composeBirthdayMessage(b.nome))}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={sendBtn}
                    title="Abrir WhatsApp com a mensagem de aniversário pré-preenchida"
                  >
                    📤 Enviar parabéns
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BirthdaysWidget() {
  const today = todayInBR()
  const from = startOfWeekMonday(today)
  const to = endOfWeekSunday(today)

  const query = useQuery({
    queryKey: ['birthdays', 'week', from, to],
    queryFn: () => fetchBirthdaysRange(from, to),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const dates = weekDates(from)
  const grouped = new Map<string, BirthdayItem[]>()
  for (const d of dates) grouped.set(d, [])
  if (query.isSuccess) {
    for (const b of query.data) {
      const list = grouped.get(b.matchedDate)
      if (list) list.push(b)
    }
  }

  return (
    <div style={card} data-testid="birthdays-widget">
      <h3 style={heading}>Aniversariantes da semana</h3>

      {query.isPending && <p style={muted}>Carregando...</p>}

      {query.isError && (
        <div>
          <p style={{ ...muted, color: 'var(--danger)' }}>
            Não foi possível carregar os aniversariantes.
          </p>
          <button
            onClick={() => {
              void query.refetch()
            }}
            style={retryBtn}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {query.isSuccess && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.5rem',
          }}
        >
          {dates.map((iso, idx) => (
            <DayCell
              key={iso}
              iso={iso}
              label={DAY_LABELS_PT[idx]}
              isToday={iso === today}
              isPast={iso < today}
              items={grouped.get(iso) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
