import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ItensProcuradosPage } from '../ItensProcuradosPage'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
  },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ItensProcuradosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sampleList = {
  requests: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      itemDescricao: 'Bolsa preta M',
      customerId: null,
      customerNome: null,
      registradoPorId: '00000000-0000-0000-0000-000000000099',
      registradoPorNome: 'Caixa Maria',
      createdAt: '2026-04-20T10:30:00.000Z',
      updatedAt: '2026-04-20T10:30:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      itemDescricao: 'Sapato 42 marrom',
      customerId: '00000000-0000-0000-0000-000000000010',
      customerNome: 'Ana Silva',
      registradoPorId: '00000000-0000-0000-0000-000000000099',
      registradoPorNome: 'Caixa Maria',
      createdAt: '2026-04-19T14:15:00.000Z',
      updatedAt: '2026-04-19T14:15:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

describe('ItensProcuradosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while list is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders empty state when no records exist', async () => {
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 20 } })
    renderPage()

    expect(await screen.findByText(/Nenhum registro ainda/i)).toBeInTheDocument()
  })

  it('renders the list of recent records', async () => {
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    expect(await screen.findByText('Bolsa preta M')).toBeInTheDocument()
    expect(screen.getByText('Sapato 42 marrom')).toBeInTheDocument()
    expect(screen.getByText(/Cliente: Ana Silva/)).toBeInTheDocument()
  })

  it('submits a registration without customer', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 20 } })
    mockPost.mockResolvedValue({
      data: {
        request: {
          id: '00000000-0000-0000-0000-000000000003',
          itemDescricao: 'Tênis novo',
          customerId: null,
          customerNome: null,
          registradoPorId: '00000000-0000-0000-0000-000000000099',
          registradoPorNome: 'Caixa Maria',
          createdAt: '2026-04-24T10:00:00.000Z',
          updatedAt: '2026-04-24T10:00:00.000Z',
        },
      },
    })
    renderPage()

    await screen.findByText(/Nenhum registro ainda/i)

    const textarea = screen.getByPlaceholderText(/bolsa preta/i)
    await user.type(textarea, 'Tênis novo')

    await user.click(screen.getByRole('button', { name: /Registrar/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({ itemDescricao: 'Tênis novo' }),
      )
    })
    expect(await screen.findByText(/Registro criado com sucesso/i)).toBeInTheDocument()
  })

  it('rejects empty itemDescricao inline (before hitting backend)', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 20 } })
    renderPage()

    await screen.findByText(/Nenhum registro ainda/i)

    // submit form without filling anything
    await user.click(screen.getByRole('button', { name: /Registrar/i }))

    // Zod message contains "obrigatória"
    expect(await screen.findByText(/obrigat/i)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only itemDescricao inline', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 20 } })
    renderPage()

    await screen.findByText(/Nenhum registro ainda/i)

    const textarea = screen.getByPlaceholderText(/bolsa preta/i)
    await user.type(textarea, '   ')

    await user.click(screen.getByRole('button', { name: /Registrar/i }))

    expect(await screen.findByText(/obrigat/i)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })
})
