import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { QuickCreateCustomerForm } from '../QuickCreateCustomerForm'

const mockPost = vi.fn()
vi.mock('../../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

function renderForm(opts: {
  initialName?: string
  onCreated?: (c: { id: string; nome: string; dataNascimento: string | null }) => void
  onCancel?: () => void
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onCreated = opts.onCreated ?? vi.fn()
  const onCancel = opts.onCancel ?? vi.fn()
  return {
    onCreated,
    onCancel,
    ...render(
      <QueryClientProvider client={client}>
        <QuickCreateCustomerForm
          initialName={opts.initialName ?? ''}
          onCreated={onCreated}
          onCancel={onCancel}
        />
      </QueryClientProvider>,
    ),
  }
}

describe('QuickCreateCustomerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pre-fills the nome field with initialName', () => {
    renderForm({ initialName: 'Maria' })
    expect((screen.getByPlaceholderText('Nome do cliente') as HTMLInputElement).value).toBe('Maria')
  })

  it('rejects submit when nome is empty', async () => {
    const user = userEvent.setup()
    renderForm({ initialName: '' })

    await user.click(screen.getByTestId('quick-create-submit'))

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('rejects submit when telefone is invalid', async () => {
    const user = userEvent.setup()
    renderForm({ initialName: 'Maria' })

    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '123')
    await user.click(screen.getByTestId('quick-create-submit'))

    expect(await screen.findByText(/Telefone inválido/i)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('submits valid data and calls onCreated with the new customer', async () => {
    const user = userEvent.setup()
    mockPost.mockResolvedValueOnce({
      data: {
        customer: {
          id: '00000000-0000-0000-0000-000000000099',
          nome: 'Maria Silva',
          telefone: '11999999999',
          cpf: null,
          email: null,
          dataNascimento: null,
          saldoDevedor: 0,
          ativo: true,
          createdAt: '2026-04-27T00:00:00.000Z',
          updatedAt: '2026-04-27T00:00:00.000Z',
        },
      },
    })
    const onCreated = vi.fn()
    renderForm({ initialName: 'Maria Silva', onCreated })

    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999999999')
    await user.click(screen.getByTestId('quick-create-submit'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          nome: 'Maria Silva',
          telefone: '11999999999',
        }),
      )
    })
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        id: '00000000-0000-0000-0000-000000000099',
        nome: 'Maria Silva',
        dataNascimento: null,
      })
    })
  })

  it('strips non-digits from telefone and CPF before sending', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        customer: {
          id: '00000000-0000-0000-0000-000000000077',
          nome: 'João',
          telefone: '11988887777',
          cpf: '12345678909',
          email: null,
          dataNascimento: null,
          saldoDevedor: 0,
          ativo: true,
          createdAt: '2026-04-27T00:00:00.000Z',
          updatedAt: '2026-04-27T00:00:00.000Z',
        },
      },
    })
    renderForm({ initialName: 'João' })

    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '(11) 98888-7777' },
    })
    fireEvent.change(screen.getByPlaceholderText('00000000000'), {
      target: { value: '123.456.789-09' },
    })
    fireEvent.click(screen.getByTestId('quick-create-submit'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          telefone: '11988887777',
          cpf: '12345678909',
        }),
      )
    })
  })

  it('shows server validation errors mapped per field', async () => {
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          errors: {
            cpf: ['CPF já cadastrado'],
          },
        },
      },
    })
    renderForm({ initialName: 'Carlos' })

    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '11999999999' },
    })
    fireEvent.change(screen.getByPlaceholderText('00000000000'), {
      target: { value: '12345678909' },
    })
    fireEvent.click(screen.getByTestId('quick-create-submit'))

    expect(await screen.findByText('CPF já cadastrado')).toBeInTheDocument()
  })

  it('shows generic error when server has no errors map', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { message: 'Erro inesperado' } },
    })
    renderForm({ initialName: 'X' })

    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '11999999999' },
    })
    fireEvent.click(screen.getByTestId('quick-create-submit'))

    expect(await screen.findByText('Erro inesperado')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ onCancel })

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('applies progressive Brazilian phone mask while user types', () => {
    renderForm({ initialName: 'X' })
    const input = screen.getByPlaceholderText('(11) 99999-9999') as HTMLInputElement

    // Cada change re-mascara o valor.
    fireEvent.change(input, { target: { value: '11' } })
    expect(input.value).toBe('(11')

    fireEvent.change(input, { target: { value: '(11) 9' } })
    expect(input.value).toBe('(11) 9')

    fireEvent.change(input, { target: { value: '11912345678' } })
    expect(input.value).toBe('(11) 91234-5678')

    // Caracteres não-numéricos digitados são ignorados pela máscara.
    fireEvent.change(input, { target: { value: '(11) abcd-9999' } })
    expect(input.value).toBe('(11) 9999')
  })

  it('accepts dataNascimento and sends it ISO-formatted to the API', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        customer: {
          id: '00000000-0000-0000-0000-000000000044',
          nome: 'Ana',
          telefone: '11999999999',
          cpf: null,
          email: null,
          dataNascimento: '1990-04-26',
          saldoDevedor: 0,
          ativo: true,
          createdAt: '2026-04-27T00:00:00.000Z',
          updatedAt: '2026-04-27T00:00:00.000Z',
        },
      },
    })
    const onCreated = vi.fn()
    renderForm({ initialName: 'Ana', onCreated })

    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '11999999999' },
    })
    // Input type=date espera YYYY-MM-DD; pegamos via display:date.
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(1)
    fireEvent.change(dateInputs[0]!, { target: { value: '1990-04-26' } })

    fireEvent.click(screen.getByTestId('quick-create-submit'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          nome: 'Ana',
          telefone: '11999999999',
          dataNascimento: '1990-04-26',
        }),
      )
    })
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        id: '00000000-0000-0000-0000-000000000044',
        nome: 'Ana',
        dataNascimento: '1990-04-26',
      })
    })
  })

  it('caps the date input via max=today (browser-side via min/max on input)', () => {
    renderForm({ initialName: 'Ana' })
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).toBeTruthy()
    // O input tem max=hoje. Validação semântica (data futura via JS) é
    // coberta pelos testes de customerFormValidation — aqui só travamos
    // que o atributo HTML5 está aplicado.
    const today = new Date().toISOString().slice(0, 10)
    expect(dateInput.max).toBe(today)
  })
})
