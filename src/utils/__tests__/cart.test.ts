import { describe, it, expect } from 'vitest'
import {
  addItemToCart, removeItemFromCart, updateItemQty,
  cartTotal, formatMoney, validateCheckout,
  type CartItem, type Product, type ProductVariant,
} from '../cart'

// Fixtures
const variant1: ProductVariant = { id: 'v1', tamanho: 'M', cor: 'Preto', estoque: 5 }
const variant2: ProductVariant = { id: 'v2', tamanho: 'G', cor: 'Azul', estoque: 3 }
const product1: Product = { id: 'p1', nome: 'Camiseta', sku: 'CAM-001', preco: 49.90, variants: [variant1, variant2] }

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: 'v1',
    productNome: 'Camiseta',
    tamanho: 'M',
    cor: 'Preto',
    precoUnitario: 49.90,
    quantidade: 1,
    estoqueDisponivel: 5,
    ...overrides,
  }
}

describe('addItemToCart', () => {
  it('adds new item to empty cart', () => {
    const result = addItemToCart([], variant1, product1)
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe('v1')
    expect(result[0].productNome).toBe('Camiseta')
    expect(result[0].quantidade).toBe(1)
    expect(result[0].estoqueDisponivel).toBe(5)
  })

  it('increments quantity when adding existing item', () => {
    const cart = [makeCartItem({ quantidade: 1 })]
    const result = addItemToCart(cart, variant1, product1)
    expect(result).toHaveLength(1)
    expect(result[0].quantidade).toBe(2)
  })

  it('caps quantity at estoqueDisponivel', () => {
    const cart = [makeCartItem({ quantidade: 5, estoqueDisponivel: 5 })]
    const result = addItemToCart(cart, variant1, product1)
    expect(result[0].quantidade).toBe(5) // stays at max
  })

  it('adds different variant as separate cart item', () => {
    const cart = [makeCartItem()]
    const result = addItemToCart(cart, variant2, product1)
    expect(result).toHaveLength(2)
    expect(result[1].variantId).toBe('v2')
    expect(result[1].cor).toBe('Azul')
  })
})

describe('removeItemFromCart', () => {
  it('removes item by variantId', () => {
    const cart = [makeCartItem(), makeCartItem({ variantId: 'v2', cor: 'Azul' })]
    const result = removeItemFromCart(cart, 'v1')
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe('v2')
  })

  it('returns empty array when removing last item', () => {
    const cart = [makeCartItem()]
    const result = removeItemFromCart(cart, 'v1')
    expect(result).toHaveLength(0)
  })

  it('does nothing when variantId not found', () => {
    const cart = [makeCartItem()]
    const result = removeItemFromCart(cart, 'nonexistent')
    expect(result).toHaveLength(1)
  })
})

describe('updateItemQty', () => {
  it('updates quantity for matching variantId', () => {
    const cart = [makeCartItem({ quantidade: 1 })]
    const result = updateItemQty(cart, 'v1', 3)
    expect(result[0].quantidade).toBe(3)
  })

  it('caps quantity at estoqueDisponivel', () => {
    const cart = [makeCartItem({ quantidade: 1, estoqueDisponivel: 5 })]
    const result = updateItemQty(cart, 'v1', 10)
    expect(result[0].quantidade).toBe(5)
  })

  it('removes item when quantity <= 0', () => {
    const cart = [makeCartItem()]
    const result = updateItemQty(cart, 'v1', 0)
    expect(result).toHaveLength(0)
  })

  it('removes item when quantity is negative', () => {
    const cart = [makeCartItem()]
    const result = updateItemQty(cart, 'v1', -1)
    expect(result).toHaveLength(0)
  })

  it('does not affect other items', () => {
    const cart = [makeCartItem(), makeCartItem({ variantId: 'v2', quantidade: 2 })]
    const result = updateItemQty(cart, 'v1', 3)
    expect(result[0].quantidade).toBe(3)
    expect(result[1].quantidade).toBe(2)
  })
})

describe('cartTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(cartTotal([])).toBe(0)
  })

  it('calculates total for single item', () => {
    const cart = [makeCartItem({ precoUnitario: 49.90, quantidade: 2 })]
    expect(cartTotal(cart)).toBeCloseTo(99.80)
  })

  it('sums across multiple items', () => {
    const cart = [
      makeCartItem({ precoUnitario: 49.90, quantidade: 1 }),
      makeCartItem({ variantId: 'v2', precoUnitario: 29.90, quantidade: 3 }),
    ]
    expect(cartTotal(cart)).toBeCloseTo(49.90 + 29.90 * 3)
  })
})

describe('formatMoney', () => {
  it('formats integer value', () => {
    expect(formatMoney(100)).toMatch(/100,00/)
  })

  it('formats decimal value', () => {
    expect(formatMoney(49.90)).toMatch(/49,90/)
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toMatch(/0,00/)
  })

  it('includes R$ prefix', () => {
    expect(formatMoney(10)).toMatch(/^R\$/)
  })
})

describe('validateCheckout', () => {
  const cart = [makeCartItem()]

  it('returns null for valid checkout (PIX, no customer)', () => {
    expect(validateCheckout(cart, 'PIX', null)).toBeNull()
  })

  it('returns null for valid CREDIARIO with customer', () => {
    expect(validateCheckout(cart, 'CREDIARIO', 'customer-id')).toBeNull()
  })

  it('returns error when cart is empty', () => {
    expect(validateCheckout([], 'PIX', null)).toBe('Adicione produtos à sacola')
  })

  it('returns error when no payment method selected', () => {
    expect(validateCheckout(cart, null, null)).toBe('Selecione forma de pagamento')
  })

  it('returns error for CREDIARIO without customer', () => {
    expect(validateCheckout(cart, 'CREDIARIO', null)).toBe('Selecione um cliente para Crediário')
  })

  it('allows DINHEIRO without customer', () => {
    expect(validateCheckout(cart, 'DINHEIRO', null)).toBeNull()
  })

  it('allows CARTAO without customer', () => {
    expect(validateCheckout(cart, 'CARTAO', null)).toBeNull()
  })

  it('allows PIX with optional customer', () => {
    expect(validateCheckout(cart, 'PIX', 'customer-id')).toBeNull()
  })
})
