import { dashboardDataSchema, type DashboardData } from '@bonistore/shared'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { api } from '../lib/api'
import { pageTitle, sectionHeader } from '../styles/ui'

type SaleItem = DashboardData['recentSales'][number]['itens'][number]

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

function formatChartDate(dia: string): string {
  return new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const metricCard: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  flex: 1,
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

const tableHeader: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  padding: '0.75rem',
  textAlign: 'left',
  borderBottom: '1px solid var(--black3)',
}

const tableCell: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--white)',
  padding: '0.75rem',
  borderBottom: '1px solid var(--black3)',
}

export function DashboardPage() {
  const { data, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => dashboardDataSchema.parse(r.data)),
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

  return (
    <div>
      <h1 style={pageTitle}>DASHBOARD</h1>

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={metricCard}>
          <p style={metricLabel}>Vendas Hoje</p>
          <p style={metricValue}>{dashboard.today.totalVendas}</p>
        </div>
        <div style={metricCard}>
          <p style={metricLabel}>Receita Hoje</p>
          <p style={metricValue}>{formatMoney(dashboard.today.receita)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <h2 style={sectionHeader}>Receita - Ultimos 7 Dias</h2>
      <div
        style={{
          height: 250,
          background: 'var(--black2)',
          border: '1px solid var(--black4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          marginBottom: '2rem',
        }}
      >
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

      {/* Two-column layout: recent sales + stock alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Recent sales */}
        <div>
          <h2 style={sectionHeader}>Ultimas Vendas</h2>
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
                  <th style={tableHeader}>Data</th>
                  <th style={tableHeader}>Cliente</th>
                  <th style={tableHeader}>Itens</th>
                  <th style={tableHeader}>Operador</th>
                  <th style={tableHeader}>Pagamento</th>
                  <th style={{ ...tableHeader, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={tableCell}>{formatDate(sale.createdAt)}</td>
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
        </div>

        {/* Low stock alerts */}
        <div>
          <h2 style={sectionHeader}>Alertas de Estoque</h2>
          {dashboard.lowStockAlerts.length === 0 ? (
            <p
              style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}
            >
              Nenhum alerta de estoque
            </p>
          ) : (
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
                    <th style={tableHeader}>Produto</th>
                    <th style={tableHeader}>Variante</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Atual</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Min</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.lowStockAlerts.map((alert) => (
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
          )}
        </div>
      </div>
    </div>
  )
}
