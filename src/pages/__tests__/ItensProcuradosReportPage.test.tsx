import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ItensProcuradosReportPage } from '../ItensProcuradosReportPage'

const mockGet = vi.fn()
const mockDelete = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
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
        <ItensProcuradosReportPage />
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
  ],
  total: 1,
  page: 1,
  pageSize: 20,
}

describe('ItensProcuradosReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Stub URL.createObjectURL/revokeObjectURL for downloadPdf
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      writable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
    })
  })

  it('renders loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders list of records with total count', async () => {
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    expect(await screen.findByText('Bolsa preta M')).toBeInTheDocument()
    expect(screen.getByText(/Registros \(1\)/)).toBeInTheDocument()
  })

  it('renders empty state when no records in period', async () => {
    mockGet.mockResolvedValue({ data: { requests: [], total: 0, page: 1, pageSize: 20 } })
    renderPage()

    expect(await screen.findByText(/Nenhum registro no período/i)).toBeInTheDocument()
  })

  it('sends date filters in request', async () => {
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/unfulfilled-requests',
        expect.objectContaining({
          params: expect.objectContaining({
            from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            page: 1,
            pageSize: 20,
          }),
        }),
      )
    })
  })

  it('exports PDF when Exportar PDF is clicked', async () => {
    const user = userEvent.setup()
    mockGet.mockImplementation((url: string) => {
      if (url === '/unfulfilled-requests') {
        return Promise.resolve({ data: sampleList })
      }
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

  it('shows error and keeps list when export fails', async () => {
    const user = userEvent.setup()
    mockGet.mockImplementation((url: string) => {
      if (url === '/unfulfilled-requests') return Promise.resolve({ data: sampleList })
      if (url === '/unfulfilled-requests/export.pdf') return Promise.reject(new Error('network'))
      return Promise.reject(new Error('unexpected'))
    })
    renderPage()

    await screen.findByText('Bolsa preta M')
    await user.click(screen.getByRole('button', { name: /Exportar PDF/i }))

    expect(await screen.findByText(/Não foi possível gerar o PDF/i)).toBeInTheDocument()
    expect(screen.getByText('Bolsa preta M')).toBeInTheDocument()
  })

  it('deletes a record after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockGet.mockResolvedValue({ data: sampleList })
    mockDelete.mockResolvedValue({ data: { ok: true } })
    renderPage()

    await screen.findByText('Bolsa preta M')
    await user.click(screen.getByRole('button', { name: /Excluir/i }))

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        '/unfulfilled-requests/00000000-0000-0000-0000-000000000001',
      )
    })
  })

  it('does not delete when confirmation is canceled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockGet.mockResolvedValue({ data: sampleList })
    renderPage()

    await screen.findByText('Bolsa preta M')
    await user.click(screen.getByRole('button', { name: /Excluir/i }))

    expect(mockDelete).not.toHaveBeenCalled()
  })
})
