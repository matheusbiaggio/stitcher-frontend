import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CustomersPage } from '../CustomersPage'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
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
        <CustomersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function getDateInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
}

const anaNoBirthday = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Ana Existente',
  telefone: '11999990001',
  cpf: null,
  email: null,
  dataNascimento: null,
  saldoDevedor: 0,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const brunoWithBirthday = {
  id: '00000000-0000-0000-0000-000000000002',
  nome: 'Bruno Nascido',
  telefone: '11999990002',
  cpf: null,
  email: null,
  dataNascimento: '1990-05-15',
  saldoDevedor: 0,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('CustomersPage — dataNascimento integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: { customers: [anaNoBirthday, brunoWithBirthday] } })
  })

  it('submits dataNascimento in POST payload when filled in create form', async () => {
    const user = userEvent.setup()
    mockPost.mockResolvedValue({
      data: { customer: { ...anaNoBirthday, dataNascimento: '1990-05-15' } },
    })
    renderPage()

    await screen.findByText('Ana Existente')

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Novo Cliente')
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11988887777')
    const [createBirthdayInput] = getDateInputs()
    await user.type(createBirthdayInput, '1990-05-15')

    await user.click(screen.getByRole('button', { name: /Criar cliente/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ dataNascimento: '1990-05-15' }),
      )
    })
  })

  it('submits dataNascimento as undefined when create form date is empty', async () => {
    const user = userEvent.setup()
    mockPost.mockResolvedValue({ data: { customer: anaNoBirthday } })
    renderPage()

    await screen.findByText('Ana Existente')

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Sem Data')
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11988887777')

    await user.click(screen.getByRole('button', { name: /Criar cliente/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ dataNascimento: undefined }),
      )
    })
  })

  it('pre-fills dataNascimento in edit form for customer with birthday', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Bruno Nascido')

    const editButtons = screen.getAllByRole('button', { name: /Editar/i })
    await user.click(editButtons[1]) // Bruno

    await waitFor(() => {
      const inputs = getDateInputs()
      expect(inputs.length).toBe(2)
      expect(inputs.some((el) => el.value === '1990-05-15')).toBe(true)
    })
  })

  it('leaves dataNascimento empty in edit form for customer without birthday', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Ana Existente')

    const editButtons = screen.getAllByRole('button', { name: /Editar/i })
    await user.click(editButtons[0]) // Ana

    await waitFor(() => {
      const inputs = getDateInputs()
      expect(inputs.length).toBe(2)
      expect(inputs.every((el) => el.value === '')).toBe(true)
    })
  })
})
