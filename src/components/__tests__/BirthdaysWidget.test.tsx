import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { BirthdaysWidget } from '../BirthdaysWidget'

dayjs.extend(utc)
dayjs.extend(timezone)

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

function todayISO() {
  return dayjs().tz('America/Sao_Paulo').format('YYYY-MM-DD')
}

function mondayOfThisWeek(): string {
  const t = dayjs().tz('America/Sao_Paulo')
  const dow = t.day() // 0=Sun, 1=Mon...
  const offsetFromMonday = dow === 0 ? 6 : dow - 1
  return t.subtract(offsetFromMonday, 'day').format('YYYY-MM-DD')
}

function makeBirthday(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    nome: 'Ana Aniversariante',
    telefone: '11987654321',
    dataNascimento: '1990-05-15',
    idadeCompletando: 36,
    matchedDate: todayISO(),
    ...overrides,
  }
}

describe('BirthdaysWidget (weekly)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while query is pending', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))
    renderWidget()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('sends a range (from/to) query param to the endpoint', async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [] } })
    renderWidget()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/customers/birthdays',
        expect.objectContaining({
          params: expect.objectContaining({
            from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      )
    })
  })

  it("renders the seven day labels (Mon..Sun) even when the week has no birthdays", async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [] } })
    renderWidget()

    // All seven day labels render regardless. Today's label is prefixed with 🎂
    // (which still contains the substring). Use substring match.
    for (const label of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
      const nodes = await screen.findAllByText(new RegExp(label))
      expect(nodes.length).toBeGreaterThan(0)
    }

    // All 7 cells show the empty placeholder
    const empties = screen.getAllByText('Nenhum aniversariante')
    expect(empties).toHaveLength(7)
  })

  it("highlights today's cell with the 🎂 emoji", async () => {
    mockGet.mockResolvedValue({ data: { birthdays: [] } })
    renderWidget()

    expect(await screen.findByText(/🎂/)).toBeInTheDocument()
  })

  it('groups a birthday into the cell matching matchedDate', async () => {
    const birthday = makeBirthday({ matchedDate: todayISO() })
    mockGet.mockResolvedValue({ data: { birthdays: [birthday] } })
    renderWidget()

    expect(await screen.findByText('Ana Aniversariante')).toBeInTheDocument()
    expect(screen.getByText(/\(11\) 98765-4321.*Faz 36/)).toBeInTheDocument()
  })

  it('places a birthday on the correct weekday (Monday of current week)', async () => {
    const birthday = makeBirthday({
      id: '00000000-0000-0000-0000-000000000020',
      nome: 'Seg Aniversariante',
      matchedDate: mondayOfThisWeek(),
    })
    mockGet.mockResolvedValue({ data: { birthdays: [birthday] } })
    renderWidget()

    expect(await screen.findByText('Seg Aniversariante')).toBeInTheDocument()
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

    mockGet.mockResolvedValueOnce({
      data: { birthdays: [makeBirthday({ matchedDate: todayISO() })] },
    })
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }))

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    expect(await screen.findByText('Ana Aniversariante')).toBeInTheDocument()
  })
})
