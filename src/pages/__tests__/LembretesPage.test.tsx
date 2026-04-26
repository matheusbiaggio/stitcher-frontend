import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LembretesPage } from '../LembretesPage'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
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
        <LembretesPage />
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
  pageSize: 50,
}

describe('LembretesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      writable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
    })
  })

  it('renders page title as LEMBRETES', async () => {
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 50 } })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'LEMBRETES' })).toBeInTheDocument()
  })

  it('renders loading state while list is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders empty state when no records exist', async () => {
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 50 } })
    renderPage()
    expect(await screen.findByText(/Nenhum lembrete registrado/i)).toBeInTheDocument()
  })

  it('renders list of records with total count', async () => {
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    expect(await screen.findByText('Bolsa preta M')).toBeInTheDocument()
    expect(screen.getByText('Sapato 42 marrom')).toBeInTheDocument()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText(/Lembretes \(2\)/)).toBeInTheDocument()
  })

  it('requests page 1 with pageSize 50 (no date filters)', async () => {
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({
          params: { page: 1, pageSize: 50 },
        }),
      )
    })
  })

  it('submits a new lembrete without customer', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 50 } })
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

    await screen.findByText(/Nenhum lembrete registrado/i)

    const textarea = screen.getByPlaceholderText(/bolsa preta/i)
    await user.type(textarea, 'Tênis novo')

    await user.click(screen.getByRole('button', { name: /Registrar/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({ itemDescricao: 'Tênis novo' }),
      )
    })
    expect(await screen.findByText(/Lembrete criado com sucesso/i)).toBeInTheDocument()
  })

  it('rejects empty itemDescricao inline', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 50 } })
    renderPage()

    await screen.findByText(/Nenhum lembrete registrado/i)
    await user.click(screen.getByRole('button', { name: /Registrar/i }))

    expect(await screen.findByText(/obrigat/i)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('deletes a single lembrete after native confirm', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockGet.mockResolvedValue({ data: sampleList })
    mockDelete.mockResolvedValue({ data: { ok: true } })
    renderPage()

    await screen.findByText('Bolsa preta M')
    const deleteButtons = await screen.findAllByRole('button', { name: 'Excluir' })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        '/unfulfilled-requests/00000000-0000-0000-0000-000000000001',
      )
    })
  })

  it('does not delete a single lembrete when confirm is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    await screen.findByText('Bolsa preta M')
    const deleteButtons = await screen.findAllByRole('button', { name: 'Excluir' })
    await user.click(deleteButtons[0])

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('exports PDF when Exportar PDF is clicked', async () => {
    const user = userEvent.setup()
    mockGet.mockImplementation((url: string) => {
      if (url === '/unfulfilled-requests') return Promise.resolve({ data: sampleList })
      if (url === '/unfulfilled-requests/export.pdf') {
        return Promise.resolve({ data: new Blob(['%PDF-fake'], { type: 'application/pdf' }) })
      }
      return Promise.reject(new Error('unexpected url'))
    })
    renderPage()

    await screen.findByText('Bolsa preta M')
    await user.click(screen.getByRole('button', { name: /Exportar PDF/i }))

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests/export.pdf',
        expect.objectContaining({ responseType: 'blob' }),
      )
    })
  })

  it('opens delete-all modal and requires typing EXCLUIR to confirm', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: sampleList })
    mockDelete.mockResolvedValue({ data: { ok: true, count: 2 } })
    renderPage()

    await screen.findByText('Bolsa preta M')

    await user.click(screen.getByRole('button', { name: /Excluir todos/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /Confirmar exclusão/i })
    expect(confirmButton).toBeDisabled()

    const tokenInput = screen.getByPlaceholderText('EXCLUIR')
    await user.type(tokenInput, 'EXCLUIR')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/unfulfilled-requests')
    })
  })

  it('does not call delete-all when typed token does not match', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    await screen.findByText('Bolsa preta M')

    await user.click(screen.getByRole('button', { name: /Excluir todos/i }))
    await screen.findByRole('dialog')

    const tokenInput = screen.getByPlaceholderText('EXCLUIR')
    await user.type(tokenInput, 'errado')

    const confirmButton = screen.getByRole('button', { name: /Confirmar exclusão/i })
    expect(confirmButton).toBeDisabled()

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('disables Excluir todos when list is empty', async () => {
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 50 } })
    renderPage()

    await screen.findByText(/Nenhum lembrete registrado/i)
    expect(screen.getByRole('button', { name: /Excluir todos/i })).toBeDisabled()
  })
})
