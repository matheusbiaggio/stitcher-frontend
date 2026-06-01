import {
  dashboardDataSchema,
  type DashboardCardId,
  type DashboardLayout,
} from '@bonistore/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts'

import { BirthdaysWidget } from '../components/BirthdaysWidget'
import { LembretesWidget } from '../components/LembretesWidget'
import { LowStockWidget } from '../components/LowStockWidget'
import { RecentSalesWidget } from '../components/RecentSalesWidget'
import { useAuth, useAuthActions } from '../contexts/AuthContext'
import { DashboardGrid } from '../dashboard/DashboardGrid'
import {
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
  saveDashboardLayout,
} from '../dashboard/dashboardLayout'
import { api } from '../lib/api'
import { pageTitle } from '../styles/ui'
import { formatBRShortDate } from '../utils/formatDate'

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// M014: usa helper TZ-agnóstico. `new Date(dia)` parseava como UTC midnight,
// e no navegador SP TZ exibia o dia anterior (1 dia inteiro a menos).
function formatChartDate(dia: string): string {
  return formatBRShortDate(dia)
}

function formatMonthLabel(yyyyMm: string): string {
  // 'YYYY-MM' → 'Jan/26'
  const [y, m] = yyyyMm.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`
}

const cardBase: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

const metricCardBase: React.CSSProperties = {
  ...cardBase,
  // Centra verticalmente o valor numérico em cards de métrica — sem isso o
  // número fica colado no topo e sobra muito espaço vazio embaixo na altura fixa.
  justifyContent: 'center',
}

const cardHeading: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  margin: 0,
  marginBottom: '1rem',
}

const metricLabel: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  marginBottom: '0.5rem',
}

const metricValue: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '2rem',
  color: 'var(--white)',
}

const editToggleButton = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  background: active ? 'var(--white)' : 'transparent',
  color: active ? 'var(--black)' : 'var(--gray)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
})

const SAVE_DEBOUNCE_MS = 500

export function DashboardPage() {
  const { user } = useAuth()
  const { setDashboardLayout } = useAuthActions()
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const initialLayout = useMemo(
    () => normalizeDashboardLayout(user?.dashboardLayout ?? null),
    // Re-normalize só na primeira vez que o usuário carrega — depois disso
    // o estado local é a fonte da verdade pra evitar piscar enquanto salva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  )
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout)

  // Debounced save: cada mudança agenda um save em 500ms; mudanças subsequentes
  // cancelam o save anterior. Persiste no contexto de auth pra refletir no resto da app.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaveError(null)
      saveDashboardLayout(layout)
        .then((saved) => {
          setDashboardLayout(saved)
        })
        .catch(() => {
          setSaveError('Não foi possível salvar o layout. Tente novamente.')
        })
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [layout, setDashboardLayout])

  const { data, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => dashboardDataSchema.parse(r.data)),
    refetchOnMount: 'always',
  })

  if (isPending) {
    return (
      <div>
        <h1 style={pageTitle}>DASHBOARD</h1>
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
      </div>
    )
  }

  const dashboard = data!

  // M010 — meta e progresso. `monthly` é opcional pra back-compat com
  // backends antigos que ainda não retornavam o campo; quando ausente,
  // os cards mostram "—" e o gráfico não desenha a linha de meta.
  const monthlyReceita = dashboard.monthly?.receita ?? 0
  const monthlyMeta = dashboard.monthly?.meta ?? 0
  const progressPercent = monthlyMeta > 0 ? Math.min(100, (monthlyReceita / monthlyMeta) * 100) : 0
  const hitTarget = monthlyMeta > 0 && monthlyReceita >= monthlyMeta
  const monthlyRevenue = dashboard.monthlyRevenue ?? []

  const cards: Record<DashboardCardId, React.ReactNode> = {
    'vendas-hoje': (
      <div style={metricCardBase}>
        <p style={metricLabel}>Vendas Hoje</p>
        <p style={metricValue}>{dashboard.today.totalVendas}</p>
      </div>
    ),
    'receita-hoje': (
      <div style={metricCardBase}>
        <p style={metricLabel}>Receita Hoje</p>
        <p style={metricValue}>{formatMoney(dashboard.today.receita)}</p>
      </div>
    ),
    'receita-mes': (
      <div style={metricCardBase}>
        <p style={metricLabel}>Receita do mês</p>
        <p style={metricValue}>
          {dashboard.monthly ? formatMoney(monthlyReceita) : '—'}
        </p>
        {dashboard.monthly && monthlyMeta > 0 && (
          <p style={{ ...metricLabel, color: 'var(--gray)', marginTop: '0.5rem' }}>
            {progressPercent.toFixed(0)}% da meta
          </p>
        )}
      </div>
    ),
    'meta-mensal': (
      <div style={metricCardBase}>
        <p style={metricLabel}>Meta mensal</p>
        <p style={metricValue}>
          {dashboard.monthly && monthlyMeta > 0 ? formatMoney(monthlyMeta) : '—'}
        </p>
        {dashboard.monthly && monthlyMeta > 0 && (
          <div style={{ marginTop: '0.6rem' }}>
            <div
              style={{
                height: 6,
                background: 'var(--black3)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                data-testid="meta-progress-bar"
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: hitTarget ? 'var(--success)' : 'var(--white)',
                  transition: 'width var(--transition)',
                }}
              />
            </div>
            <p
              style={{
                ...metricLabel,
                marginTop: '0.4rem',
                color: hitTarget ? 'var(--success)' : 'var(--gray)',
              }}
            >
              {hitTarget
                ? `+${formatMoney(monthlyReceita - monthlyMeta)} acima da meta`
                : `Faltam ${formatMoney(monthlyMeta - monthlyReceita)}`}
            </p>
          </div>
        )}
        {dashboard.monthly && monthlyMeta === 0 && (
          <p style={{ ...metricLabel, color: 'var(--gray)', marginTop: '0.5rem' }}>
            Configure em /configuracoes
          </p>
        )}
      </div>
    ),
    birthdays: <BirthdaysWidget />,
    'daily-revenue-chart': (
      <div style={cardBase}>
        <h3 style={cardHeading}>Receita - Últimos 7 Dias</h3>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.dailyRevenue}>
              <XAxis
                dataKey="dia"
                tickFormatter={formatChartDate}
                stroke="#888888"
                tick={{ fontSize: 12, fontFamily: 'var(--font-body)' }}
              />
              <YAxis
                tickFormatter={(v: number) => `R$${v}`}
                stroke="#888888"
                tick={{ fontSize: 12, fontFamily: 'var(--font-body)' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#111111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  color: '#f5f5f5',
                }}
                formatter={(value: unknown) => [formatMoney(Number(value)), 'Receita']}
                labelFormatter={(label: unknown) => formatChartDate(String(label))}
              />
              <Bar dataKey="receita" fill="#f5f5f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    'monthly-revenue-chart': (
      <div style={cardBase}>
        <h3 style={cardHeading}>Receita Mensal - Últimos 6 Meses</h3>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue}>
              <XAxis
                dataKey="mes"
                tickFormatter={formatMonthLabel}
                stroke="#888888"
                tick={{ fontSize: 12, fontFamily: 'var(--font-body)' }}
              />
              <YAxis
                tickFormatter={(v: number) => `R$${v}`}
                stroke="#888888"
                tick={{ fontSize: 12, fontFamily: 'var(--font-body)' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#111111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  color: '#f5f5f5',
                }}
                formatter={(value: unknown) => [formatMoney(Number(value)), 'Receita']}
                labelFormatter={(label: unknown) => formatMonthLabel(String(label))}
              />
              <Bar dataKey="receita" fill="#f5f5f5" radius={[4, 4, 0, 0]} />
              {monthlyMeta > 0 && (
                <ReferenceLine
                  y={monthlyMeta}
                  stroke="var(--success)"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                >
                  <Label
                    value={`Meta ${formatMoney(monthlyMeta)}`}
                    position="insideTopRight"
                    fill="var(--success)"
                    fontSize={11}
                    fontFamily="var(--font-label)"
                  />
                </ReferenceLine>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    'recent-sales': <RecentSalesWidget sales={dashboard.recentSales} />,
    'low-stock': <LowStockWidget alerts={dashboard.lowStockAlerts} />,
    lembretes: <LembretesWidget />,
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={pageTitle}>DASHBOARD</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setLayout(DEFAULT_DASHBOARD_LAYOUT)
              }}
              style={editToggleButton(false)}
            >
              Restaurar padrão
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing((e) => !e)
            }}
            style={editToggleButton(editing)}
          >
            {editing ? 'Concluir' : 'Editar layout'}
          </button>
        </div>
      </div>

      {saveError && (
        <p
          style={{
            color: 'var(--danger)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {saveError}
        </p>
      )}

      <DashboardGrid layout={layout} editing={editing} cards={cards} onLayoutChange={setLayout} />
    </div>
  )
}
