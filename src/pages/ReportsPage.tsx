import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { pageTitle, sectionHeader, input, primaryButton } from '../styles/ui'

interface SalesReportData {
  total: number
  quantidade: number
  sales: {
    id: string; total: number; formaPagamento: string; createdAt: string;
    customer: { id: string; nome: string } | null;
    user: { id: string; nome: string };
  }[]
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

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

export function ReportsPage() {
  const navigate = useNavigate()

  // Sales by period
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [submitted, setSubmitted] = useState(false)

  const salesQuery = useQuery<SalesReportData>({
    queryKey: ['reports-sales', startDate, endDate],
    queryFn: () => api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
    enabled: !!startDate && !!endDate && submitted,
  })

  // Top products
  const topProductsQuery = useQuery<TopProduct[]>({
    queryKey: ['reports-top-products'],
    queryFn: () => api.get('/reports/top-products').then(r => r.data),
  })

  // Low stock
  const lowStockQuery = useQuery<LowStockVariant[]>({
    queryKey: ['reports-low-stock'],
    queryFn: () => api.get('/reports/low-stock').then(r => r.data),
  })

  // Customer search with debounce
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(customerSearch)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [customerSearch])

  const customersQuery = useQuery<{ customers: CustomerSearchResult[] }>({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => api.get(`/customers?search=${encodeURIComponent(debouncedSearch)}`).then(r => r.data),
    enabled: debouncedSearch.length >= 2,
  })

  return (
    <div>
      <h1 style={pageTitle}>RELATORIOS</h1>

      {/* Sales by period */}
      <h2 style={sectionTitle}>Vendas por Periodo</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
        <div>
          <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.375rem' }}>
            Data Inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setSubmitted(false) }}
            style={{ ...input, width: '160px' }}
          />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.375rem' }}>
            Data Fim
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setSubmitted(false) }}
            style={{ ...input, width: '160px' }}
          />
        </div>
        <button
          onClick={() => setSubmitted(true)}
          style={{ ...primaryButton(false), width: 'auto', padding: '0.625rem 1.5rem' }}
        >
          Filtrar
        </button>
      </div>

      {submitted && salesQuery.isPending && (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      )}

      {submitted && salesQuery.data && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--white)', fontSize: '0.9rem' }}>
              Quantidade: <strong>{salesQuery.data.quantidade}</strong>
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--white)', fontSize: '0.9rem' }}>
              Total: <strong>{formatMoney(salesQuery.data.total)}</strong>
            </p>
          </div>
          {salesQuery.data.sales.length > 0 && (
            <div style={tableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeader}>Data</th>
                    <th style={tableHeader}>Cliente</th>
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
          )}
        </div>
      )}

      {/* Top products */}
      <h2 style={sectionTitle}>Produtos Mais Vendidos</h2>
      {topProductsQuery.isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      ) : topProductsQuery.data && topProductsQuery.data.length > 0 ? (
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableHeader, width: '40px' }}>#</th>
                <th style={tableHeader}>Produto</th>
                <th style={tableHeader}>SKU</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Unidades</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {topProductsQuery.data.map((product, index) => (
                <tr key={product.sku}>
                  <td style={{ ...tableCell, color: 'var(--gray)' }}>{index + 1}</td>
                  <td style={tableCell}>{product.productName}</td>
                  <td style={{ ...tableCell, color: 'var(--gray)' }}>{product.sku}</td>
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
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Nenhum produto vendido.</p>
      )}

      {/* Low stock */}
      <h2 style={sectionTitle}>Estoque Critico</h2>
      {lowStockQuery.isPending ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', marginTop: '1rem' }}>Carregando...</p>
      ) : lowStockQuery.data && lowStockQuery.data.length > 0 ? (
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeader}>Produto</th>
                <th style={tableHeader}>Variante</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Estoque Atual</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Minimo</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Deficit</th>
              </tr>
            </thead>
            <tbody>
              {lowStockQuery.data.map(variant => (
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
      <h2 style={sectionTitle}>Historico de Cliente</h2>
      <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Buscar cliente por nome ou CPF..."
          value={customerSearch}
          onChange={e => setCustomerSearch(e.target.value)}
          style={input}
        />
        {debouncedSearch.length >= 2 && customersQuery.data && (
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
