import { birthdaysResponseSchema, type BirthdayItem } from '@bonistore/shared'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { api } from '../lib/api'
import { formatBRPhone } from '../utils/formatPhone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'America/Sao_Paulo'
const STALE_FIVE_MIN = 5 * 60 * 1000

function todayInBR(): string {
  return dayjs().tz(TZ).format('YYYY-MM-DD')
}

const card: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
}

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  marginBottom: '1rem',
}

const itemRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.5rem 0',
  borderBottom: '1px solid var(--black4)',
  gap: '0.75rem',
}

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--white)',
  fontWeight: 500,
}

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--gray)',
}

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
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

async function fetchBirthdays(date: string): Promise<BirthdayItem[]> {
  const r = await api.get<unknown>('/customers/birthdays', { params: { date } })
  return birthdaysResponseSchema.parse(r.data).birthdays
}

export function BirthdaysWidget() {
  const today = todayInBR()
  const query = useQuery({
    queryKey: ['birthdays', today],
    queryFn: () => fetchBirthdays(today),
    staleTime: STALE_FIVE_MIN,
    refetchOnWindowFocus: true,
  })

  return (
    <div style={card} data-testid="birthdays-widget">
      <h3 style={heading}>Aniversariantes de hoje</h3>

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

      {query.isSuccess && query.data.length === 0 && (
        <p style={muted}>Nenhum aniversariante hoje</p>
      )}

      {query.isSuccess && query.data.length > 0 && (
        <div>
          {query.data.map((b) => (
            <div key={b.id} style={itemRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={nameStyle}>{b.nome}</p>
                <p style={metaStyle}>{formatBRPhone(b.telefone)}</p>
              </div>
              <span style={metaStyle}>Faz {b.idadeCompletando} anos</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
