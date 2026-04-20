import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ReportsPage } from '../ReportsPage'

// Mock api module
const mockGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockTopProducts = [
  { productName: 'Camiseta Polo', sku: 'POL-001', totalUnidades: 50, totalReceita: 2500 },
  { productName: 'Calca Jeans', sku: 'JEA-001', totalUnidades: 30, totalReceita: 4500 },
]

const mockLowStock = [
  {
    id: 'v1',
    productName: 'Blusa Manga',
    tamanho: 'P',
    cor: 'Branca',
    estoque: 1,
    estoqueMinimo: 5,
  },
]

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderReports() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mocks for the auto-fetched queries
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/reports/top-products')) {
        return Promise.resolve({ data: mockTopProducts })
      }
      if (url.includes('/reports/low-stock')) {
        return Promise.resolve({ data: mockLowStock })
      }
      if (url.includes('/reports/sales')) {
        return Promise.resolve({ data: { total: 0, quantidade: 0, sales: [] } })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it('renders page title and section headings', () => {
    renderReports()
    expect(screen.getByText('RELATORIOS')).toBeInTheDocument()
    expect(screen.getByText('Vendas por Periodo')).toBeInTheDocument()
    expect(screen.getByText('Produtos Mais Vendidos')).toBeInTheDocument()
    expect(screen.getByText('Estoque Critico')).toBeInTheDocument()
    expect(screen.getByText('Historico de Cliente')).toBeInTheDocument()
  })

  it('renders date filter inputs and button', () => {
    renderReports()
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs).toHaveLength(2)
    expect(screen.getByText('Filtrar')).toBeInTheDocument()
  })

  it('renders top products table when data loads', async () => {
    renderReports()
    expect(await screen.findByText('Camiseta Polo')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('Calca Jeans')).toBeInTheDocument()
  })

  it('renders low stock table when data loads', async () => {
    renderReports()
    expect(await screen.findByText('Blusa Manga')).toBeInTheDocument()
    // Deficit = estoqueMinimo - estoque = 5 - 1 = 4
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
