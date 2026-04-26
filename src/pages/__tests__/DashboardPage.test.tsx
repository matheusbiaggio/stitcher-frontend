import { type DashboardLayout } from '@bonistore/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { DashboardPage } from '../DashboardPage'

const mockGet = vi.fn()
const mockPatch = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

const mockSetDashboardLayout = vi.fn()
let userLayout: DashboardLayout | null = null
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'a@b.com',
      nome: 'Test',
      role: 'admin',
      dashboardLayout: userLayout,
    },
    loading: false,
  }),
  useAuthActions: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    setDashboardLayout: mockSetDashboardLayout,
  }),
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

function dashboardDispatcher(
  options: {
    dashboardData?: unknown
    birthdays?: unknown
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
    if (url === '/unfulfilled-requests') {
      return Promise.resolve({
        data: { requests: [], total: 0, page: 1, pageSize: 10 },
      })
    }
    return Promise.reject(new Error(`unexpected url: ${url}`))
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userLayout = null
    mockGet.mockImplementation(dashboardDispatcher())
    mockPatch.mockResolvedValue({
      data: { layout: [{ id: 'vendas-hoje', size: 'full' }] },
    })
  })

  it('renders loading state while data is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderDashboard()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders metric cards with today totals', async () => {
    renderDashboard()
    const vendasLabel = await screen.findByText('Vendas Hoje')
    expect(within(vendasLabel.parentElement!).getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Receita Hoje')).toBeInTheDocument()
  })

  it('renders recent sales table', async () => {
    renderDashboard()
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
  })

  it('renders low stock alerts section', async () => {
    renderDashboard()
    const camiseta = await screen.findByText('Camiseta')
    const row = camiseta.closest('tr')!
    expect(within(row).getByText('2')).toBeInTheDocument()
    expect(within(row).getByText('10')).toBeInTheDocument()
  })

  it('shows empty state when no low stock alerts', async () => {
    mockGet.mockImplementation(
      dashboardDispatcher({
        dashboardData: { ...mockDashboardData, lowStockAlerts: [] },
      }),
    )
    renderDashboard()
    expect(await screen.findByText(/Nenhum alerta de estoque/i)).toBeInTheDocument()
  })

  it('hides drag handles outside edit mode', async () => {
    renderDashboard()
    await screen.findByText('Maria Silva')
    expect(screen.queryByTestId('drag-handle-vendas-hoje')).not.toBeInTheDocument()
  })

  it('shows drag handles and size toggles after entering edit mode', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await screen.findByText('Maria Silva')

    await user.click(screen.getByRole('button', { name: /Editar layout/i }))
    expect(screen.getByTestId('drag-handle-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByTestId('size-half-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByTestId('size-full-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByTestId('height-thin-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByTestId('height-medium-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByTestId('height-large-vendas-hoje')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Restaurar padrão/i })).toBeInTheDocument()
  })

  it('saves layout via PATCH after a debounced height change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    try {
      renderDashboard()
      await screen.findByText('Maria Silva')

      await user.click(screen.getByRole('button', { name: /Editar layout/i }))
      await user.click(screen.getByTestId('height-large-vendas-hoje'))

      vi.advanceTimersByTime(600)

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          '/auth/me/dashboard-layout',
          expect.objectContaining({
            layout: expect.arrayContaining([
              expect.objectContaining({ id: 'vendas-hoje', height: 'large' }),
            ]),
          }),
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('saves layout via PATCH after a debounced size toggle', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    try {
      renderDashboard()
      await screen.findByText('Maria Silva')

      await user.click(screen.getByRole('button', { name: /Editar layout/i }))
      await user.click(screen.getByTestId('size-full-vendas-hoje'))

      vi.advanceTimersByTime(600)

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          '/auth/me/dashboard-layout',
          expect.objectContaining({
            layout: expect.arrayContaining([
              expect.objectContaining({ id: 'vendas-hoje', size: 'full' }),
            ]),
          }),
        )
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores default layout when "Restaurar padrão" is clicked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    try {
      renderDashboard()
      await screen.findByText('Maria Silva')

      await user.click(screen.getByRole('button', { name: /Editar layout/i }))
      await user.click(screen.getByRole('button', { name: /Restaurar padrão/i }))

      vi.advanceTimersByTime(600)

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalled()
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
