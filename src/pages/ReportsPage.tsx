import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../lib/api'
import { pageTitle, sectionHeader, input } from '../styles/ui'

interface SaleItem {
  id: string
  quantidade: number
  precoUnitario: number
  variant: {
    id: string
    tamanho: string
    cor: string
    product: { id: string; nome: string; sku: string }
  }
}

interface SalesReportData {
  total: number
  quantidade: number
  sales: {
    id: string; total: number; formaPagamento: string; createdAt: string;
    customer: { id: string; nome: string } | null;
    user: { id: string; nome: string };
    itens: SaleItem[];
  }[]
}

interface OverviewData {
  period: { startDate: string; endDate: string }
  kpis: {
    totalReceita: number
    totalVendas: number
    ticketMedio: number
    cancelamentos: number
    receitaCancelada: number
  }
  comparison: {
    previousReceita: number
    previousVendas: number
    growthPercent: number | null
  }
  dailyRevenue: { dia: string; receita: number; vendas: number }[]
  paymentBreakdown: { formaPagamento: string; total: number; quantidade: number; percent: number }[]
  topCustomers: { id: string; nome: string; totalGasto: number; quantidadeCompras: number }[]
}

interface TopProduct {
  productName: string; sku: string;
  totalUnidades: number; totalReceita: number;
}

interface LowStockVariant {
  id: string; productName: string; tamanho: string; cor: string;
  estoque: number; estoqueMinimo: number;
}

interface CustomerSearchResult {
  id: string
  nome: string
  cpf: string | null
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

function paymentLabel(forma: string): string {
  const map: Record<string, string> = {
    PIX: 'PIX', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', CREDIARIO: 'Crediário',
  }
  return map[forma] ?? forma
}

function formatItems(itens: SaleItem[]): string {
  if (!itens || itens.length === 0) return '---'
  return itens
    .map(i => `${i.variant.product.nome} (${i.variant.tamanho}/${i.variant.cor}) ×${i.quantidade}`)
    .join(', ')
}

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

type Preset = '7d' | '30d' | '90d' | 'month' | 'custom'

function presetRange(preset: Preset): { startDate: string; endDate: string } | null {
  const end = todayISO()
  if (preset === '7d') return { startDate: daysAgoISO(6), endDate: end }
  if (preset === '30d') return { startDate: daysAgoISO(29), endDate: end }
  if (preset === '90d') return { startDate: daysAgoISO(89), endDate: end }
  if (preset === 'month') {
    const d = new Date()
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    return { startDate: first.toISOString().slice(0, 10), endDate: end }
  }
  return null
}

// Styles
const sectionTitle: React.CSSProperties = {
  ...sectionHeader,
  borderBottom: '1px solid var(--black4)',
  paddingBottom: '0.5rem',
  marginTop: '2.5rem',
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

const tableContainer: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  marginTop: '1rem',
}

const kpiCard: React.CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  flex: 1,
  minWidth: '170px',
}

const kpiLabel: React.CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  marginBottom: '0.5rem',
}

const kpiValue: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.5rem',
  color: 'var(--white)',
}

const presetButton = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 0.875rem',
  background: active ? 'var(--white)' : 'var(--black3)',
  border: `1px solid ${active ? 'var(--white)' : 'var(--black4)'}`,
  borderRadius: 'var(--radius)',
  color: active ? 'var(--black)' : 'var(--gray)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
})

export function ReportsPage() {
  const navigate = useNavigate()

  // Period selection — default to last 30 days
  const [preset, setPreset] = useState<Preset>('30d')
  const [startDate, setStartDate] = useState(daysAgoISO(29))
  const [endDate, setEndDate] = useState(todayISO())

  function applyPreset(p: Preset) {
    setPreset(p)
    const range = presetRange(p)
    if (range) {
      setStartDate(range.startDate)
      setEndDate(range.endDate)
    }
  }

  function onCustomDate(field: 'start' | 'end', value: string) {
    setPreset('custom')
    if (field === 'start') setStartDate(value)
    else setEndDate(value)
  }

  // Queries — all driven by startDate/endDate
  const overviewQuery = useQuery<OverviewData>({
    queryKey: ['reports-overview', startDate, endDate],
    queryFn: () => api.get(`/reports/overview?startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
    enabled: !!startDate && !!endDate,
  })

  const salesQuery = useQuery<SalesReportData>({
    queryKey: ['reports-sales', startDate, endDate],
    queryFn: () => api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
    enabled: !!startDate && !!endDate,
  })

  const topProductsQuery = useQuery<{ topProducts: TopProduct[] }>({
    queryKey: ['reports-top-products', startDate, endDate],
    queryFn: () => api.get(`/reports/top-products?startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
    enabled: !!startDate && !!endDate,
  })

  const lowStockQuery = useQuery<{ lowStock: LowStockVariant[] }>({
    queryKey: ['reports-low-stock'],
    queryFn: () => api.get('/reports/low-stock').then(r => r.data),
  })

  // Customer search (unchanged)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedSearch(customerSearch), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [customerSearch])

  const customersQuery = useQuery<{ customers: CustomerSearchResult[] }>({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => api.get(`/customers/search?q=${encodeURIComponent(debouncedSearch)}`).then(r => r.data),
    enabled: debouncedSearch.length >= 1,
  })

  const periodLabel = useMemo(() => {
    const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${fmt(startDate)} → ${fmt(endDate)}`
  }, [startDate, endDate])

  const overview = overviewQuery.data

  return (
    <div>
      <h1 style={pageTitle}>RELATÓRIOS</h1>

      {/* Period selector */}
      <div style={{
        background: 'var(--black2)',
        border: '1px solid var(--black4)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--gray)', textTransform: 'uppercase', marginRight: '0.5rem' }}>
            Período
          </span>
          <button onClick={() => applyPreset('7d')} style={presetButton(preset === '7d')}>7 dias</button>
          <button onClick={() => applyPreset('30d')} style={presetButton(preset === '30d')}>30 dias</button>
          <button onClick={() => applyPreset('90d')} style={presetButton(preset === '90d')}>90 dias</button>
          <button onClick={() => applyPreset('month')} style={presetButton(preset === 'month')}>Mês atual</button>
          <div style={{ width: '1px', height: '24px', background: 'var(--black4)', margin: '0 0.5rem' }} />
          <input
            type="date"
            value={startDate}
            onChange={e => onCustomDate('start', e.target.value)}
            style={{ ...input, width: '150px' }}
          />
          <span style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => onCustomDate('end', e.target.value)}
            style={{ ...input, width: '150px' }}
          />
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--gray)', letterSpacing: '0.05em' }}>
            {periodLabel}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={kpiCard}>
          <p style={kpiLabel}>Receita</p>
          <p style={kpiValue}>{overview ? formatMoney(overview.kpis.totalReceita) : '—'}</p>
          {overview?.comparison.growthPercent != null && (
            <p style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.7rem',
              marginTop: '0.25rem',
              color: overview.comparison.growthPercent >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {formatPercent(overview.comparison.growthPercent)} vs período anterior
            </p>
          )}
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Vendas</p>
          <p style={kpiValue}>{overview?.kpis.totalVendas ?? '—'}</p>
          {overview && (
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--gray)', marginTop: '0.25rem' }}>
              Anterior: {overview.comparison.previousVendas}
            </p>
          )}
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Ticket Médio</p>
          <p style={kpiValue}>{overview ? formatMoney(overview.kpis.ticketMedio) : '—'}</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Cancelamentos</p>
          <p style={kpiValue}>{overview?.kpis.cancelamentos ?? '—'}</p>
          {overview && overview.kpis.receitaCancelada > 0 && (
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
              {formatMoney(overview.kpis.receitaCancelada)} perdidos
            </p>
          )}
        </div>
      </div>

      {/* Revenue chart */}
      <h2 style={sectionTitle}>Receita por Dia</h2>
      <div style={{
        height: 280,
        background: 'var(--black2)',
        border: '1px solid var(--black4)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginTop: '1rem',
      }}>
        {overviewQuery.isPending ? (
          <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
        ) : overview && overview.dailyRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="dia"
                tickFormatter={formatShortDate}
                stroke="#888888"
                tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }}
              />
              <YAxis
                tickFormatter={(v: number) => `R$${v}`}
                stroke="#888888"
                tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }}
              />
              <Tooltip
                contentStyle={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 4, color: '#f5f5f5' }}
                formatter={(value: unknown, name: unknown) => {
                  if (name === 'receita') return [formatMoney(Number(value)), 'Receita']
                  return [String(value), 'Vendas']
                }}
                labelFormatter={(label: unknown) => formatShortDate(String(label))}
              />
              <Bar dataKey="receita" fill="#f5f5f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Sem dados no período.</p>
        )}
      </div>

      {/* Two-column: payment breakdown + top customers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Payment breakdown */}
        <div>
          <h2 style={sectionTitle}>Formas de Pagamento</h2>
          {overview && overview.paymentBreakdown.length > 0 ? (
            <div style={tableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeader}>Método</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Vendas</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Receita</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.paymentBreakdown.map(p => (
                    <tr key={p.formaPagamento}>
                      <td style={tableCell}>{paymentLabel(p.formaPagamento)}</td>
                      <td style={{ ...tableCell, textAlign: 'right', color: 'var(--gray)' }}>{p.quantidade}</td>
                      <td style={{ ...tableCell, textAlign: 'right' }}>{formatMoney(p.total)}</td>
                      <td style={{ ...tableCell, textAlign: 'right', color: 'var(--gray)' }}>{p.percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Sem vendas no período.</p>
          )}
        </div>

        {/* Top customers */}
        <div>
          <h2 style={sectionTitle}>Top 10 Clientes</h2>
          {overview && overview.topCustomers.length > 0 ? (
            <div style={tableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeader, width: '40px' }}>#</th>
                    <th style={tableHeader}>Cliente</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Compras</th>
                    <th style={{ ...tableHeader, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topCustomers.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}/historico`)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--black3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tableCell, color: 'var(--gray)' }}>{i + 1}</td>
                      <td style={tableCell}>{c.nome}</td>
                      <td style={{ ...tableCell, textAlign: 'right', color: 'var(--gray)' }}>{c.quantidadeCompras}</td>
                      <td style={{ ...tableCell, textAlign: 'right', fontWeight: 500 }}>{formatMoney(c.totalGasto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Sem clientes no período.</p>
          )}
        </div>
      </div>

      {/* Top products */}
      <h2 style={sectionTitle}>Top 10 Produtos</h2>
      {topProductsQuery.isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      ) : topProductsQuery.data?.topProducts && topProductsQuery.data.topProducts.length > 0 ? (
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableHeader, width: '40px' }}>#</th>
                <th style={tableHeader}>Produto</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Unidades</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {topProductsQuery.data.topProducts.map((product, index) => (
                <tr key={`${product.productName}-${index}`}>
                  <td style={{ ...tableCell, color: 'var(--gray)' }}>{index + 1}</td>
                  <td style={tableCell}>{product.productName}</td>
                  <td style={{ ...tableCell, textAlign: 'right' }}>{product.totalUnidades}</td>
                  <td style={{ ...tableCell, textAlign: 'right', fontWeight: 500 }}>
                    {formatMoney(product.totalReceita)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Nenhum produto vendido no período.</p>
      )}

      {/* Detailed sales list */}
      <h2 style={sectionTitle}>Vendas Detalhadas</h2>
      {salesQuery.isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      ) : salesQuery.data && salesQuery.data.sales.length > 0 ? (
        <div style={tableContainer}>
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
              {salesQuery.data.sales.map(sale => (
                <tr key={sale.id}>
                  <td style={tableCell}>{formatDate(sale.createdAt)}</td>
                  <td style={{ ...tableCell, color: sale.customer ? 'var(--white)' : 'var(--gray)' }}>
                    {sale.customer?.nome ?? '---'}
                  </td>
                  <td style={{ ...tableCell, color: 'var(--gray)', fontSize: '0.75rem' }}>
                    {formatItems(sale.itens)}
                  </td>
                  <td style={{ ...tableCell, color: 'var(--gray)' }}>{sale.user.nome}</td>
                  <td style={tableCell}>{paymentLabel(sale.formaPagamento)}</td>
                  <td style={{ ...tableCell, textAlign: 'right', fontWeight: 500 }}>
                    {formatMoney(sale.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Nenhuma venda no período.</p>
      )}

      {/* Low stock */}
      <h2 style={sectionTitle}>Estoque Crítico</h2>
      {lowStockQuery.isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      ) : lowStockQuery.data?.lowStock && lowStockQuery.data.lowStock.length > 0 ? (
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeader}>Produto</th>
                <th style={tableHeader}>Variante</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Estoque</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Mínimo</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Déficit</th>
              </tr>
            </thead>
            <tbody>
              {lowStockQuery.data.lowStock.map(variant => (
                <tr key={variant.id}>
                  <td style={tableCell}>{variant.productName}</td>
                  <td style={{ ...tableCell, color: 'var(--gray)' }}>
                    {variant.tamanho} / {variant.cor}
                  </td>
                  <td style={{ ...tableCell, textAlign: 'right', color: '#ff6b6b', fontWeight: 500 }}>
                    {variant.estoque}
                  </td>
                  <td style={{ ...tableCell, textAlign: 'right', color: 'var(--gray)' }}>
                    {variant.estoqueMinimo}
                  </td>
                  <td style={{ ...tableCell, textAlign: 'right', color: '#ff6b6b', fontWeight: 500 }}>
                    {variant.estoqueMinimo - variant.estoque}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Nenhum alerta de estoque.</p>
      )}

      {/* Customer history link */}
      <h2 style={sectionTitle}>Histórico de Cliente</h2>
      <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Buscar cliente por nome ou CPF..."
          value={customerSearch}
          onChange={e => setCustomerSearch(e.target.value)}
          style={input}
        />
        {debouncedSearch.length >= 1 && customersQuery.data && (
          <div style={{
            background: 'var(--black2)',
            border: '1px solid var(--black4)',
            borderRadius: 'var(--radius)',
            marginTop: '0.5rem',
          }}>
            {customersQuery.data.customers.length === 0 ? (
              <p style={{ padding: '0.75rem', color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                Nenhum cliente encontrado.
              </p>
            ) : (
              customersQuery.data.customers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/clientes/${customer.id}/historico`)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--black3)',
                    transition: 'background var(--transition)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--black3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--white)' }}>
                    {customer.nome}
                  </p>
                  {customer.cpf && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--gray)', marginTop: '0.125rem' }}>
                      CPF: {customer.cpf}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
