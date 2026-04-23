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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while data is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined)) // never resolves
    renderDashboard()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders metric cards with today totals', async () => {
    mockGet.mockResolvedValue({ data: mockDashboardData })
    renderDashboard()
    expect(await screen.findByText('Vendas Hoje')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Receita Hoje')).toBeInTheDocument()
  })

  it('renders recent sales table', async () => {
    mockGet.mockResolvedValue({ data: mockDashboardData })
    renderDashboard()
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
  })

  it('renders low stock alerts section', async () => {
    mockGet.mockResolvedValue({ data: mockDashboardData })
    renderDashboard()
    expect(await screen.findByText('Camiseta')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows empty state when no low stock alerts', async () => {
    mockGet.mockResolvedValue({
      data: { ...mockDashboardData, lowStockAlerts: [] },
    })
    renderDashboard()
    expect(await screen.findByText('Nenhum alerta de estoque')).toBeInTheDocument()
  })
})
