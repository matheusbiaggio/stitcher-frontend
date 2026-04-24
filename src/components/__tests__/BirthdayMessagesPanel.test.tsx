import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { BirthdayMessagesPanel } from '../BirthdayMessagesPanel'

const mockGet = vi.fn()
const mockPatch = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

function qc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPanel() {
  return render(
    <QueryClientProvider client={qc()}>
      <BirthdayMessagesPanel />
    </QueryClientProvider>,
  )
}

function makeMsg(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    customerId: '00000000-0000-0000-0000-000000000099',
    customerNome: 'Ana Aniversariante',
    customerTelefone: '11987654321',
    messageText: 'Feliz aniversário, Ana! 🎂',
    forDate: '2026-04-24',
    status: 'PENDING',
    sentAt: null,
    createdAt: '2026-04-24T12:00:00.000Z',
    updatedAt: '2026-04-24T12:00:00.000Z',
    ...overrides,
  }
}

describe('BirthdayMessagesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no pending messages', async () => {
    mockGet.mockResolvedValue({ data: { messages: [] } })
    const { container } = renderPanel()
    await waitFor(() => {
      // Component returns null; body of render is an empty div
      expect(container.querySelector('[data-testid="birthday-messages-panel"]')).toBeNull()
    })
  })

  it('renders list with counter when there are pending messages', async () => {
    mockGet.mockResolvedValue({
      data: {
        messages: [
          makeMsg({ customerNome: 'Ana' }),
          makeMsg({ id: '00000000-0000-0000-0000-000000000002', customerNome: 'Bruno' }),
        ],
      },
    })
    renderPanel()

    // Espera o state de sucesso aparecer (items na tela)
    await screen.findByText('Ana')
    expect(screen.getByRole('heading', { name: /Mensagens de aniversário/i })).toHaveTextContent(
      /\(2\)/,
    )
    expect(screen.getByText('Bruno')).toBeInTheDocument()
  })

  it('opens wa.me URLs when clicking "Enviar todas"', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window)
    mockGet.mockResolvedValue({
      data: { messages: [makeMsg({ customerTelefone: '11987654321' })] },
    })
    renderPanel()

    await screen.findByText('Ana Aniversariante')
    await user.click(screen.getByRole('button', { name: /Enviar todas/i }))

    expect(openSpy).toHaveBeenCalledTimes(1)
    const url = openSpy.mock.calls[0][0] as string
    expect(url).toContain('https://wa.me/5511987654321')
    expect(url).toContain('text=')
  })

  it('marks a message as sent when clicking "✓ Enviada"', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ data: { messages: [makeMsg()] } })
    mockPatch.mockResolvedValue({ data: { message: makeMsg({ status: 'SENT' }) } })
    renderPanel()

    await screen.findByText('Ana Aniversariante')
    await user.click(screen.getByRole('button', { name: '✓ Enviada' }))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/birthday-messages/00000000-0000-0000-0000-000000000001',
        { status: 'SENT' },
      )
    })
  })

  it('renders error state with retry when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'))
    renderPanel()

    expect(await screen.findByText(/Erro ao carregar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })
})
