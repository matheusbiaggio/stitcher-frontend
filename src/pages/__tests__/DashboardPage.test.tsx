import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { DashboardPage } from '../DashboardPage'

// Mock api module
const mockGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderDashboard() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const mockDashboardData = {
  today: { totalVendas: 5, receita: 250.0 },
  dailyRevenue: [
    { dia: '2026-04-13', receita: 100 },
    { dia: '2026-04-14', receita: 200 },
  ],
  recentSales: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      subtotal: 150,
      desconto: 0,
      descontoMotivo: null,
      total: 150,
      formaPagamento: 'PIX',
      status: 'COMPLETED',
      createdAt: '2026-04-14T10:00:00Z',
      customer: { id: '00000000-0000-0000-0000-000000000002', nome: 'Maria Silva' },
      user: { id: '00000000-0000-0000-0000-000000000003', nome: 'Admin' },
      itens: [],
    },
  ],
  lowStockAlerts: [
    {
      id: '00000000-0000-0000-0000-000000000004',
      productName: 'Camiseta',
      tamanho: 'M',
      cor: 'Azul',
      estoque: 2,
      estoqueMinimo: 10,
    },
  ],
}

// Helper: returns a dispatcher that routes requests by URL so
// secondary queries (birthday widget + messages panel) don't break.
function dashboardDispatcher(
  options: {
    dashboardData?: unknown
    birthdays?: unknown
    messages?: unknown
  } = {},
) {
  return (url: string) => {
    if (url === '/dashboard') {
      return Promise.resolve({
        data: options.dashboardData ?? mockDashboardData,
      })
    }
    if (url === '/customers/birthdays') {
      return Promise.resolve({ data: { birthdays: options.birthdays ?? [] } })
    }
    if (url === '/birthday-messages') {
      return Promise.resolve({ data: { messages: options.messages ?? [] } })
    }
    return Promise.reject(new Error(`unexpected url: ${url}`))
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation(dashboardDispatcher())
  })

  it('renders loading state while data is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined)) // never resolves
    renderDashboard()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders metric cards with today totals', async () => {
    renderDashboard()
    expect(await screen.findByText('Vendas Hoje')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Receita Hoje')).toBeInTheDocument()
  })

  it('renders recent sales table', async () => {
    renderDashboard()
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
  })

  it('renders low stock alerts section', async () => {
    renderDashboard()
    expect(await screen.findByText('Camiseta')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows empty state when no low stock alerts', async () => {
    mockGet.mockImplementation(
      dashboardDispatcher({
        dashboardData: { ...mockDashboardData, lowStockAlerts: [] },
      }),
    )
    renderDashboard()
    expect(await screen.findByText('Nenhum alerta de estoque')).toBeInTheDocument()
  })
})
