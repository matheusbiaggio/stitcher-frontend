import { describe, it, expect } from 'vitest'

import {
  addItemToCart,
  removeItemFromCart,
  updateItemQty,
  cartTotal,
  cartBreakdown,
  clearAllItemDiscounts,
  formatMoney,
  hasAnyItemDiscount,
  itemPrecoUnitario,
  setItemDiscount,
  SALE_DISCOUNT_EMPTY,
  validateCheckout,
  type CartItem,
  type Product,
  type ProductVariant,
} from '../cart'

// Fixtures
const variant1: ProductVariant = {
  id: 'v1',
  productId: 'p1',
  tamanho: 'M',
  cor: 'Preto',
  estoque: 5,
  estoqueMinimo: 2,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const variant2: ProductVariant = {
  id: 'v2',
  productId: 'p1',
  tamanho: 'G',
  cor: 'Azul',
  estoque: 3,
  estoqueMinimo: 1,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const product1: Product = {
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
  variants: [variant1, variant2],
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: 'v1',
    productNome: 'Camiseta',
    tamanho: 'M',
    cor: 'Preto',
    precoUnitarioOriginal: 49.9,
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
    const cart = [makeCartItem({ precoUnitarioOriginal: 49.9, quantidade: 2 })]
    expect(cartTotal(cart)).toBeCloseTo(99.8)
  })

  it('sums across multiple items', () => {
    const cart = [
      makeCartItem({ precoUnitarioOriginal: 49.9, quantidade: 1 }),
      makeCartItem({ variantId: 'v2', precoUnitarioOriginal: 29.9, quantidade: 3 }),
    ]
    expect(cartTotal(cart)).toBeCloseTo(49.9 + 29.9 * 3)
  })
})

describe('formatMoney', () => {
  it('formats integer value', () => {
    expect(formatMoney(100)).toMatch(/100,00/)
  })

  it('formats decimal value', () => {
    expect(formatMoney(49.9)).toMatch(/49,90/)
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
    expect(validateCheckout(cart, 'PIX', null, { subtotal: 0, desconto: 0, total: 0 })).toBeNull()
  })

  it('returns null for valid CREDIARIO with customer', () => {
    expect(validateCheckout(cart, 'CREDIARIO', 'customer-id', { subtotal: 0, desconto: 0, total: 0 })).toBeNull()
  })

  it('returns error when cart is empty', () => {
    expect(validateCheckout([], 'PIX', null, { subtotal: 0, desconto: 0, total: 0 })).toBe('Adicione produtos à sacola')
  })

  it('returns error when no payment method selected', () => {
    expect(validateCheckout(cart, null, null, { subtotal: 0, desconto: 0, total: 0 })).toBe('Selecione forma de pagamento')
  })

  it('returns error for CREDIARIO without customer', () => {
    expect(validateCheckout(cart, 'CREDIARIO', null, { subtotal: 0, desconto: 0, total: 0 })).toBe('Selecione um cliente para Crediário')
  })

  it('allows DINHEIRO without customer', () => {
    expect(validateCheckout(cart, 'DINHEIRO', null, { subtotal: 0, desconto: 0, total: 0 })).toBeNull()
  })

  it('allows CARTAO without customer', () => {
    expect(validateCheckout(cart, 'CARTAO', null, { subtotal: 0, desconto: 0, total: 0 })).toBeNull()
  })

  it('allows PIX with optional customer', () => {
    expect(validateCheckout(cart, 'PIX', 'customer-id', { subtotal: 0, desconto: 0, total: 0 })).toBeNull()
  })
})

describe('setItemDiscount', () => {
  it('assigns a percent to the matching item', () => {
    const cart = [makeCartItem({ variantId: 'v1' }), makeCartItem({ variantId: 'v2' })]
    const next = setItemDiscount(cart, 'v1', 20)
    expect(next[0].descontoPct).toBe(20)
    expect(next[1].descontoPct).toBeUndefined()
  })

  it('clears percent when set to 0 or undefined', () => {
    const cart = [makeCartItem({ variantId: 'v1', descontoPct: 10 })]
    expect(setItemDiscount(cart, 'v1', 0)[0].descontoPct).toBeUndefined()
    expect(setItemDiscount(cart, 'v1', undefined)[0].descontoPct).toBeUndefined()
  })
})

describe('clearAllItemDiscounts', () => {
  it('removes descontoPct from every item', () => {
    const cart = [
      makeCartItem({ variantId: 'v1', descontoPct: 10 }),
      makeCartItem({ variantId: 'v2', descontoPct: 25 }),
    ]
    const next = clearAllItemDiscounts(cart)
    expect(next.every((i) => i.descontoPct === undefined)).toBe(true)
  })
})

describe('itemPrecoUnitario', () => {
  it('returns precoUnitarioOriginal when no discount', () => {
    expect(itemPrecoUnitario(makeCartItem({ precoUnitarioOriginal: 100 }))).toBe(100)
  })

  it('applies percent discount', () => {
    expect(itemPrecoUnitario(makeCartItem({ precoUnitarioOriginal: 100, descontoPct: 20 }))).toBe(80)
  })
})

describe('hasAnyItemDiscount', () => {
  it('returns false when no item has discount', () => {
    expect(hasAnyItemDiscount([makeCartItem(), makeCartItem({ variantId: 'v2' })])).toBe(false)
  })

  it('returns true when at least one item has a discount', () => {
    expect(hasAnyItemDiscount([makeCartItem({ descontoPct: 10 })])).toBe(true)
  })
})

describe('cartBreakdown', () => {
  it('computes with no discount (mode=none)', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 50, quantidade: 2 })],
      'none',
      SALE_DISCOUNT_EMPTY,
    )
    expect(r.subtotal).toBe(100)
    expect(r.desconto).toBe(0)
    expect(r.total).toBe(100)
  })

  it('computes item-level discount', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 100, quantidade: 1, descontoPct: 20 })],
      'item',
      SALE_DISCOUNT_EMPTY,
    )
    expect(r.subtotal).toBe(100)
    expect(r.desconto).toBe(20)
    expect(r.total).toBe(80)
  })

  it('computes sale-level percent discount', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 100, quantidade: 2 })],
      'total',
      { tipo: 'percent', valor: 10, motivo: '' },
    )
    expect(r.subtotal).toBe(200)
    expect(r.desconto).toBe(20)
    expect(r.total).toBe(180)
  })

  it('computes sale-level BRL discount', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 100, quantidade: 2 })],
      'total',
      { tipo: 'reais', valor: 15, motivo: '' },
    )
    expect(r.desconto).toBe(15)
    expect(r.total).toBe(185)
  })

  it('caps total at 0 when discount exceeds subtotal', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 50, quantidade: 1 })],
      'total',
      { tipo: 'reais', valor: 100, motivo: '' },
    )
    expect(r.total).toBe(0)
  })

  it('ignores saleDiscount when mode=none', () => {
    const r = cartBreakdown(
      [makeCartItem({ precoUnitarioOriginal: 100, quantidade: 1 })],
      'none',
      { tipo: 'percent', valor: 50, motivo: '' },
    )
    expect(r.desconto).toBe(0)
    expect(r.total).toBe(100)
  })
})
