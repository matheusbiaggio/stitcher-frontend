import { PAYMENT_METHODS, type PaymentMethod, roundCents } from '@bonistore/shared'

export interface CartItem {
  variantId: string
  productNome: string
  tamanho: string
  cor: string
  precoUnitarioOriginal: number
  quantidade: number
  estoqueDisponivel: number
  /** Percentual de desconto por item (0-100). undefined ou 0 = sem desconto. */
  descontoPct?: number
}

import { type ProductVariantResponse, type ProductResponse } from '@bonistore/shared'

export type ProductVariant = ProductVariantResponse
export type Product = ProductResponse

export type DiscountMode = 'none' | 'item' | 'total'

export interface SaleLevelDiscountState {
  tipo: 'percent' | 'reais'
  valor: number
  motivo: string
}

export const SALE_DISCOUNT_EMPTY: SaleLevelDiscountState = {
  tipo: 'percent',
  valor: 0,
  motivo: '',
}

export function addItemToCart(
  cart: CartItem[],
  variant: ProductVariant,
  product: Product,
): CartItem[] {
  const existing = cart.find((i) => i.variantId === variant.id)
  if (existing) {
    return cart.map((i) =>
      i.variantId === variant.id
        ? { ...i, quantidade: Math.min(i.quantidade + 1, i.estoqueDisponivel) }
        : i,
    )
  }
  return [
    ...cart,
    {
      variantId: variant.id,
      productNome: product.nome,
      tamanho: variant.tamanho,
      cor: variant.cor,
      precoUnitarioOriginal: product.preco,
      quantidade: 1,
      estoqueDisponivel: variant.estoque,
    },
  ]
}

export function removeItemFromCart(cart: CartItem[], variantId: string): CartItem[] {
  return cart.filter((i) => i.variantId !== variantId)
}

export function updateItemQty(cart: CartItem[], variantId: string, quantidade: number): CartItem[] {
  if (quantidade <= 0) {
    return removeItemFromCart(cart, variantId)
  }
  return cart.map((i) =>
    i.variantId === variantId ? { ...i, quantidade: Math.min(quantidade, i.estoqueDisponivel) } : i,
  )
}

export function setItemDiscount(
  cart: CartItem[],
  variantId: string,
  pct: number | undefined,
): CartItem[] {
  return cart.map((i) =>
    i.variantId === variantId ? { ...i, descontoPct: pct && pct > 0 ? pct : undefined } : i,
  )
}

export function clearAllItemDiscounts(cart: CartItem[]): CartItem[] {
  return cart.map((i) => ({ ...i, descontoPct: undefined }))
}

/** Preço cobrado por unidade depois do desconto por item (se houver). */
export function itemPrecoUnitario(item: CartItem): number {
  if (!item.descontoPct) return item.precoUnitarioOriginal
  return roundCents(item.precoUnitarioOriginal * (1 - item.descontoPct / 100))
}

export function hasAnyItemDiscount(cart: CartItem[]): boolean {
  return cart.some((i) => (i.descontoPct ?? 0) > 0)
}

export interface CartBreakdown {
  subtotal: number
  desconto: number
  total: number
}

/**
 * Computa subtotal/desconto/total do carrinho dada a configuração de desconto.
 * subtotal é sempre baseado no preço original (sem desconto).
 */
export function cartBreakdown(
  cart: CartItem[],
  mode: DiscountMode,
  saleDiscount: SaleLevelDiscountState,
): CartBreakdown {
  const subtotal = roundCents(
    cart.reduce((acc, i) => acc + i.precoUnitarioOriginal * i.quantidade, 0),
  )

  let desconto = 0
  if (mode === 'item') {
    desconto = roundCents(
      cart.reduce(
        (acc, i) => acc + (i.precoUnitarioOriginal - itemPrecoUnitario(i)) * i.quantidade,
        0,
      ),
    )
  } else if (mode === 'total' && saleDiscount.valor > 0) {
    desconto =
      saleDiscount.tipo === 'percent'
        ? roundCents((subtotal * saleDiscount.valor) / 100)
        : roundCents(saleDiscount.valor)
  }

  const total = Math.max(0, roundCents(subtotal - desconto))
  return { subtotal, desconto, total }
}

/** Mantido para compat (renderização rápida do total sem breakdown). */
export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + itemPrecoUnitario(i) * i.quantidade, 0)
}

export function formatMoney(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type FormaPagamento = PaymentMethod

const CREDIARIO = PAYMENT_METHODS[3]

export function validateCheckout(
  cart: CartItem[],
  formaPagamento: FormaPagamento | null,
  selectedCustomerId: string | null,
  breakdown: CartBreakdown,
): string | null {
  if (cart.length === 0) return 'Adicione produtos à sacola'
  if (!formaPagamento) return 'Selecione forma de pagamento'
  if (formaPagamento === CREDIARIO && !selectedCustomerId)
    return 'Selecione um cliente para Crediário'
  if (breakdown.total < 0) return 'Desconto excede o subtotal'
  return null
}
