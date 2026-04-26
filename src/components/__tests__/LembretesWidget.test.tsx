import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LembretesWidget } from '../LembretesWidget'

const mockGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderWidget() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LembretesWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sampleRow = (idSuffix: string, descricao: string) => ({
  id: `00000000-0000-0000-0000-00000000000${idSuffix}`,
  itemDescricao: descricao,
  customerId: null,
  customerNome: null,
  registradoPorId: '00000000-0000-0000-0000-000000000099',
  registradoPorNome: 'Caixa Maria',
  createdAt: '2026-04-20T10:30:00.000Z',
  updatedAt: '2026-04-20T10:30:00.000Z',
})

describe('LembretesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches with default page size of 10', async () => {
    mockGet.mockResolvedValue({
      data: { requests: [], total: 0, page: 1, pageSize: 10 },
    })
    renderWidget()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({ params: { page: 1, pageSize: 10 } }),
      )
    })
  })

  it('renders empty state when no records exist', async () => {
    mockGet.mockResolvedValue({
      data: { requests: [], total: 0, page: 1, pageSize: 10 },
    })
    renderWidget()
    expect(await screen.findByText(/Nenhum lembrete registrado/i)).toBeInTheDocument()
  })

  it('renders rows and total when there are records', async () => {
    mockGet.mockResolvedValue({
      data: {
        requests: [sampleRow('1', 'Bolsa preta'), sampleRow('2', 'Sapato 42')],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    })
    renderWidget()
    expect(await screen.findByText('Bolsa preta')).toBeInTheDocument()
    expect(screen.getByText('Sapato 42')).toBeInTheDocument()
    expect(screen.getByText(/Lembretes \(2\)/)).toBeInTheDocument()
  })

  it('changes page size and resets page to 1', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({
      data: {
        requests: [sampleRow('1', 'Bolsa preta')],
        total: 30,
        page: 1,
        pageSize: 10,
      },
    })
    renderWidget()

    await screen.findByText('Bolsa preta')
    mockGet.mockClear()

    const select = screen.getByLabelText(/Lembretes por página/i)
    await user.selectOptions(select, '25')

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({ params: { page: 1, pageSize: 25 } }),
      )
    })
  })

  it('paginates next/previous when total exceeds page size', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({
      data: {
        requests: [sampleRow('1', 'Item 1')],
        total: 30,
        page: 1,
        pageSize: 10,
      },
    })
    renderWidget()

    await screen.findByText('Item 1')
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument()

    mockGet.mockClear()
    await user.click(screen.getByRole('button', { name: /Próxima/i }))

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({ params: { page: 2, pageSize: 10 } }),
      )
    })
  })

  it('exposes a "Ver lembretes" link to /lembretes', async () => {
    mockGet.mockResolvedValue({
      data: { requests: [], total: 0, page: 1, pageSize: 10 },
    })
    renderWidget()
    const link = await screen.findByRole('link', { name: /Ver lembretes/i })
    expect(link).toHaveAttribute('href', '/lembretes')
  })
})
