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

  it('loads and renders both meta and skuPrefix from settings', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 25_000.5, skuPrefix: 'BS' } },
    })
    renderSection()

    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })
    expect((screen.getByTestId('meta-receita-input') as HTMLInputElement).value).toBe('25.000,50')
    expect((screen.getByTestId('sku-prefix-input') as HTMLInputElement).value).toBe('BS')
  })

  it('renders empty skuPrefix when null', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('sku-prefix-input')).toBeInTheDocument()
    })
    expect((screen.getByTestId('sku-prefix-input') as HTMLInputElement).value).toBe('')
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

  it('accepts only digits in meta input and formats progressively', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('meta-receita-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc1234567' } })
    expect(input.value).toBe('12.345,67')
  })

  it('forces skuPrefix input to uppercase alphanumeric only', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('sku-prefix-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('sku-prefix-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'bs-2024!' } })
    // Letras minúsculas → maiúsculas; special chars removidos
    expect(input.value).toBe('BS2024')
  })

  it('limits skuPrefix to 10 characters', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('sku-prefix-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('sku-prefix-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ABCDEFGHIJKLMNOP' } })
    expect(input.value).toBe('ABCDEFGHIJ') // 10 chars
  })

  it('submits both meta and skuPrefix on save', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    mockPatch.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 50_000, skuPrefix: 'BS' } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('meta-receita-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('meta-receita-input'), { target: { value: '5000000' } })
    fireEvent.change(screen.getByTestId('sku-prefix-input'), { target: { value: 'BS' } })
    fireEvent.click(screen.getByTestId('store-settings-save'))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/settings', {
        metaReceitaMensal: 50_000,
        skuPrefix: 'BS',
      })
    })
  })

  it('sends empty skuPrefix as "" (backend normalizes to null)', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 1000, skuPrefix: 'BS' } },
    })
    mockPatch.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 1000, skuPrefix: null } },
    })
    renderSection()
    await waitFor(() => {
      expect(screen.getByTestId('sku-prefix-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('sku-prefix-input'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('store-settings-save'))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/settings', {
        metaReceitaMensal: 1000,
        skuPrefix: '',
      })
    })
  })

  it('shows "✓ Salvo" briefly after successful submit', async () => {
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
    mockPatch.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 100, skuPrefix: null } },
    })
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
    mockGet.mockResolvedValueOnce({
      data: { settings: { metaReceitaMensal: 0, skuPrefix: null } },
    })
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
