import { type ProductResponse } from '@bonistore/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import {
  type EditProductForm,
  type EditVariantForm,
  NEW_VARIANT_EMPTY,
  ProductCard,
} from '../ProductCard'

const variant = {
  id: 'v1',
  productId: 'p1',
  tamanho: 'M',
  cor: 'Preto',
  estoque: 12,
  estoqueMinimo: 2,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const product: ProductResponse = {
  id: 'p1',
  nome: 'Camiseta',
  sku: 'CAM-001',
  categoria: 'Tops',
  preco: 49.9,
  custo: 20,
  unidade: 'un',
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  variants: [variant],
}

interface RenderOpts {
  editingVariant?: { variantId: string; productId: string; form: EditVariantForm } | null
  editingProduct?: { id: string; form: EditProductForm } | null
  onEditingVariantChange?: (
    ev: { variantId: string; productId: string; form: EditVariantForm } | null,
  ) => void
  onEditVariantSubmit?: (e: React.FormEvent) => void
}

function renderCard(opts: RenderOpts = {}) {
  const onEditingVariantChange = opts.onEditingVariantChange ?? vi.fn()
  const onEditVariantSubmit = opts.onEditVariantSubmit ?? vi.fn()
  return {
    onEditingVariantChange,
    onEditVariantSubmit,
    ...render(
      <ProductCard
        product={product}
        expanded={true}
        onToggleExpand={vi.fn()}
        stockEntry={null}
        onStockEntryChange={vi.fn()}
        onStockSubmit={vi.fn()}
        stockMutation={{ isPending: false }}
        editingVariant={opts.editingVariant ?? null}
        onEditingVariantChange={onEditingVariantChange}
        onEditVariantSubmit={onEditVariantSubmit}
        editVariantMutation={{ isPending: false }}
        editingProduct={opts.editingProduct ?? null}
        onEditingProductChange={vi.fn()}
        onToggleEditProduct={vi.fn()}
        onUpdateProduct={vi.fn()}
        updateProductMutation={{ isPending: false }}
        addingVariantTo={null}
        onAddingVariantToChange={vi.fn()}
        newVariantForm={NEW_VARIANT_EMPTY}
        onNewVariantFormChange={vi.fn()}
        onAddVariantSubmit={vi.fn()}
        addVariantMutation={{ isPending: false }}
        onDeactivate={vi.fn()}
        onActivate={vi.fn()}
        deactivateMutation={{ isPending: false }}
        activateMutation={{ isPending: false }}
      />,
    ),
  }
}

describe('ProductCard variant edit form', () => {
  it('opens the edit form pre-filled with the current variant.estoque', async () => {
    const user = userEvent.setup()
    const onEditingVariantChange = vi.fn()
    renderCard({ onEditingVariantChange })

    // Botão "Editar" da variante (pode haver outros botões "Editar" do produto)
    const buttons = screen.getAllByRole('button', { name: /editar/i })
    // O último Editar visível dentro da row da variante
    await user.click(buttons[buttons.length - 1])

    expect(onEditingVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: 'v1',
        productId: 'p1',
        form: expect.objectContaining({
          tamanho: 'M',
          cor: 'Preto',
          estoque: 12,
          estoqueMinimo: 2,
        }),
      }),
    )
  })

  it('renders the "Estoque atual" input with the current value when editing', () => {
    renderCard({
      editingVariant: {
        variantId: 'v1',
        productId: 'p1',
        form: { tamanho: 'M', cor: 'Preto', estoque: 12, estoqueMinimo: 2 },
      },
    })

    const label = screen.getByText('Estoque atual')
    const input = label.parentElement?.querySelector('input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('12')
    expect(input.min).toBe('0')
    expect(input.required).toBe(true)
  })

  it('allows editing the estoque to a different positive integer and submits', () => {
    const onEditingVariantChange = vi.fn()
    const onEditVariantSubmit = vi.fn((e: React.FormEvent) => {
      e.preventDefault()
    })
    renderCard({
      editingVariant: {
        variantId: 'v1',
        productId: 'p1',
        form: { tamanho: 'M', cor: 'Preto', estoque: 12, estoqueMinimo: 2 },
      },
      onEditingVariantChange,
      onEditVariantSubmit,
    })

    const label = screen.getByText('Estoque atual')
    const input = label.parentElement?.querySelector('input') as HTMLInputElement

    // fireEvent.change emite uma única atualização — testes de inputs
    // controlados exigem isso porque o componente externo não rerenderiza
    // o prop entre keystrokes do user.type.
    fireEvent.change(input, { target: { value: '5' } })
    const lastCall = onEditingVariantChange.mock.calls.at(-1)
    expect(lastCall?.[0]?.form?.estoque).toBe(5)

    // Submit do form chama onEditVariantSubmit
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(onEditVariantSubmit).toHaveBeenCalledTimes(1)
  })

  it('accepts 0 as a valid estoque value (zera estoque)', () => {
    const onEditingVariantChange = vi.fn()
    renderCard({
      editingVariant: {
        variantId: 'v1',
        productId: 'p1',
        form: { tamanho: 'M', cor: 'Preto', estoque: 12, estoqueMinimo: 2 },
      },
      onEditingVariantChange,
    })

    const label = screen.getByText('Estoque atual')
    const input = label.parentElement?.querySelector('input') as HTMLInputElement

    fireEvent.change(input, { target: { value: '0' } })
    const lastCall = onEditingVariantChange.mock.calls.at(-1)
    expect(lastCall?.[0]?.form?.estoque).toBe(0)
  })

  it('rejects negative values via clamp and floors decimals', () => {
    const onEditingVariantChange = vi.fn()
    renderCard({
      editingVariant: {
        variantId: 'v1',
        productId: 'p1',
        form: { tamanho: 'M', cor: 'Preto', estoque: 12, estoqueMinimo: 2 },
      },
      onEditingVariantChange,
    })

    const label = screen.getByText('Estoque atual')
    const input = label.parentElement?.querySelector('input') as HTMLInputElement

    // Decimais são truncados pra inteiro pelo handler (Math.floor)
    fireEvent.change(input, { target: { value: '7.9' } })
    const decimalCall = onEditingVariantChange.mock.calls.at(-1)
    expect(Number.isInteger(decimalCall?.[0]?.form?.estoque)).toBe(true)
    expect(decimalCall?.[0]?.form?.estoque).toBe(7)

    // Negativos são clamped pra 0 pelo handler (Math.max(0, ...))
    onEditingVariantChange.mockClear()
    fireEvent.change(input, { target: { value: '-3' } })
    const negativeCall = onEditingVariantChange.mock.calls.at(-1)
    expect(negativeCall?.[0]?.form?.estoque).toBe(0)
  })

  it('keeps the empty-string state when input is cleared (handler will normalize on submit)', () => {
    const onEditingVariantChange = vi.fn()
    renderCard({
      editingVariant: {
        variantId: 'v1',
        productId: 'p1',
        form: { tamanho: 'M', cor: 'Preto', estoque: 12, estoqueMinimo: 2 },
      },
      onEditingVariantChange,
    })

    const label = screen.getByText('Estoque atual')
    const input = label.parentElement?.querySelector('input') as HTMLInputElement

    fireEvent.change(input, { target: { value: '' } })
    const lastCall = onEditingVariantChange.mock.calls.at(-1)
    expect(lastCall?.[0]?.form?.estoque).toBe('')
  })
})
