import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { BirthdaysWidget } from '../BirthdaysWidget'

const mockGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
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
      <BirthdaysWidget />
    </QueryClientProvider>,
  )
}

const aBirthday = {
  id: '00000000-0000-0000-0000-000000000010',
  nome: 'Ana Aniversariante',
  telefone: '11987654321',
  dataNascimento: '1990-05-15',
  idadeCompletando: 36,
}

const bBirthday = {
  id: '00000000-0000-0000-0000-000000000011',
  nome: 'Bruno Bissexto',
  telefone: '11987654322',
  dataNascimento: '1988-02-29',
  idadeCompletando: 38,
}

describe('BirthdaysWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while query is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderWidget()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders a list of birthdays when the endpoint returns data', async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [aBirthday, bBirthday] } })
    renderWidget()

    expect(await screen.findByText('Ana Aniversariante')).toBeInTheDocument()
    expect(screen.getByText('Bruno Bissexto')).toBeInTheDocument()
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument()
    expect(screen.getByText('(11) 98765-4322')).toBeInTheDocument()
    expect(screen.getByText('Faz 36 anos')).toBeInTheDocument()
    expect(screen.getByText('Faz 38 anos')).toBeInTheDocument()
  })

  it('renders empty state when no birthdays today', async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [] } })
    renderWidget()

    expect(await screen.findByText('Nenhum aniversariante hoje')).toBeInTheDocument()
  })

  it('renders error state with retry button when query fails', async () => {
    mockGet.mockRejectedValue(new Error('network error'))
    renderWidget()

    expect(await screen.findByText(/Não foi possível carregar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })

  it('retry button triggers a refetch', async () => {
    const user = userEvent.setup()
    mockGet.mockRejectedValueOnce(new Error('network error'))
    renderWidget()

    await screen.findByRole('button', { name: /Tentar novamente/i })
    expect(mockGet).toHaveBeenCalledTimes(1)

    mockGet.mockResolvedValueOnce({ data: { birthdays: [aBirthday] } })
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }))

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    expect(await screen.findByText('Ana Aniversariante')).toBeInTheDocument()
  })

  it('sends date query param in YYYY-MM-DD format to the endpoint', async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [] } })
    renderWidget()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/customers/birthdays',
        expect.objectContaining({
          params: expect.objectContaining({
            date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      )
    })
  })
})
