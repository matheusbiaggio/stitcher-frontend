import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { CreateProductForm } from '../CreateProductForm'

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
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
  it('exposes the "+ Adicionar variante" button before any variant row', async () => {
    const user = userEvent.setup()
    renderForm()

    const addButton = screen.getByTestId('create-product-add-variant-button')
    expect(addButton).toBeInTheDocument()

    await user.click(addButton)
    // Após adicionar, ainda deve haver acesso ao botão (não fica fora de vista).
    expect(screen.getByTestId('create-product-add-variant-button')).toBeInTheDocument()
  })

  it('renders newly added variant rows first (reverse order)', async () => {
    const user = userEvent.setup()
    renderForm()

    const addButton = screen.getByTestId('create-product-add-variant-button')

    await user.click(addButton)
    // primeira linha aparece — preenche tamanho com "A"
    const firstSize = screen.getAllByPlaceholderText('M')[0]
    await user.type(firstSize, 'A')

    await user.click(addButton)
    const sizes = screen.getAllByPlaceholderText('M')
    // A nova linha tem tamanho vazio e está em posição [0] do DOM
    // (a primeira linha "A" foi empurrada pra baixo).
    expect(sizes.length).toBe(2)
    expect((sizes[0] as HTMLInputElement).value).toBe('') // recém adicionada no topo
    expect((sizes[1] as HTMLInputElement).value).toBe('A') // anterior empurrada
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
