import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'

import { CreateProductForm } from '../CreateProductForm'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CreateProductForm />
    </QueryClientProvider>,
  )
}

describe('CreateProductForm variant rows (M008 polish)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: nenhuma sugestão de SKU. Cada teste pode sobrescrever.
    mockGet.mockResolvedValue({ data: { sku: null } })
  })

  it('exposes the "+ Adicionar variante" button before any variant row', async () => {
    const user = userEvent.setup()
    renderForm()

    const addButton = screen.getByTestId('create-product-add-variant-button')
    expect(addButton).toBeInTheDocument()

    await user.click(addButton)
    expect(screen.getByTestId('create-product-add-variant-button')).toBeInTheDocument()
  })

  it('renders newly added variant rows first (reverse order)', async () => {
    const user = userEvent.setup()
    renderForm()

    const addButton = screen.getByTestId('create-product-add-variant-button')

    await user.click(addButton)
    const firstSize = screen.getAllByPlaceholderText('M')[0]
    await user.type(firstSize, 'A')

    await user.click(addButton)
    const sizes = screen.getAllByPlaceholderText('M')
    expect(sizes.length).toBe(2)
    expect((sizes[0] as HTMLInputElement).value).toBe('')
    expect((sizes[1] as HTMLInputElement).value).toBe('A')
  })

  it('shows variant counter in the label after adding rows', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByText('Variantes')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-product-add-variant-button'))
    expect(screen.getByText('Variantes (1)')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-product-add-variant-button'))
    expect(screen.getByText('Variantes (2)')).toBeInTheDocument()
  })
})

describe('CreateProductForm SKU auto-fill (M012)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the next-sku suggestion on mount', async () => {
    mockGet.mockResolvedValueOnce({ data: { sku: 'BS073' } })
    renderForm()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/products/next-sku')
    })
  })

  it('pre-fills the SKU input with the server suggestion', async () => {
    mockGet.mockResolvedValueOnce({ data: { sku: 'BS073' } })
    renderForm()

    await waitFor(() => {
      const skuInput = screen.getByPlaceholderText('CAM-001') as HTMLInputElement
      expect(skuInput.value).toBe('BS073')
    })
  })

  it('leaves the SKU input empty when the server returns null (no prefix configured)', async () => {
    mockGet.mockResolvedValueOnce({ data: { sku: null } })
    renderForm()

    // Espera o fetch completar
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
    const skuInput = screen.getByPlaceholderText('CAM-001') as HTMLInputElement
    expect(skuInput.value).toBe('')
  })

  it('does NOT overwrite a manually typed SKU when suggestion arrives late', async () => {
    // Suggestion resolve depois do user digitar
    let resolveSuggestion: (v: { data: { sku: string } }) => void = () => undefined
    mockGet.mockReturnValueOnce(
      new Promise<{ data: { sku: string } }>((resolve) => {
        resolveSuggestion = resolve
      }),
    )

    const user = userEvent.setup()
    renderForm()

    const skuInput = screen.getByPlaceholderText('CAM-001') as HTMLInputElement
    await user.type(skuInput, 'MEU-SKU')
    expect(skuInput.value).toBe('MEU-SKU')

    // Sugestão chega tarde — não deve sobrescrever
    resolveSuggestion({ data: { sku: 'BS073' } })
    await waitFor(() => {
      // Espera o React processar o update da query
      expect(mockGet).toHaveBeenCalled()
    })
    expect(skuInput.value).toBe('MEU-SKU')
  })
})
