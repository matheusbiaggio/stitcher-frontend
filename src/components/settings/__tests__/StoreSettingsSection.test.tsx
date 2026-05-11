import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { StoreSettingsSection } from '../StoreSettingsSection'

const mockGet = vi.fn()
const mockPatch = vi.fn()
vi.mock('../../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StoreSettingsSection />
    </QueryClientProvider>,
  )
}

describe('StoreSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and renders the current target value', async () => {
    mockGet.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 25_000.5 } } })
    renderSection()

    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })
    const input = screen.getByTestId('meta-receita-input') as HTMLInputElement
    expect(input.value).toBe('25.000,50')
  })

  it('shows loading state while fetching', () => {
    mockGet.mockReturnValueOnce(new Promise(() => undefined))
    renderSection()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'))
    renderSection()
    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível carregar as configurações/i),
      ).toBeInTheDocument()
    })
  })

  it('accepts only digits in the input and formats progressively', async () => {
    mockGet.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 0 } } })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('meta-receita-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc1234567' } })
    // 1234567 centavos = 12345,67
    expect(input.value).toBe('12.345,67')
  })

  it('submits the value in BRL units (centavos / 100) to PATCH /settings', async () => {
    mockGet.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 0 } } })
    mockPatch.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 50_000 } } })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('meta-receita-input')
    fireEvent.change(input, { target: { value: '5000000' } }) // R$ 50.000,00
    fireEvent.click(screen.getByTestId('store-settings-save'))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/settings', { metaReceitaMensal: 50_000 })
    })
  })

  it('shows "✓ Salvo" briefly after successful submit', async () => {
    mockGet.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 0 } } })
    mockPatch.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 100 } } })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('meta-receita-input'), { target: { value: '10000' } })
    fireEvent.click(screen.getByTestId('store-settings-save'))

    await waitFor(() => {
      expect(screen.getByTestId('store-settings-saved-flash')).toBeInTheDocument()
    })
  })

  it('shows server error on patch failure', async () => {
    mockGet.mockResolvedValueOnce({ data: { settings: { metaReceitaMensal: 0 } } })
    mockPatch.mockRejectedValueOnce({
      response: { data: { message: 'Configuração inválida' } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('meta-receita-input'), { target: { value: '10000' } })
    fireEvent.click(screen.getByTestId('store-settings-save'))

    await waitFor(() => {
      expect(screen.getByText('Configuração inválida')).toBeInTheDocument()
    })
  })
})
