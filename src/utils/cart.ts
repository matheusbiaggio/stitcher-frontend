export interface CartItem {
  variantId: string
  productNome: string
  tamanho: string
  cor: string
  precoUnitario: number
  quantidade: number
  estoqueDisponivel: number
}

export interface ProductVariant {
  id: string
  tamanho: string
  cor: string
  estoque: number
}

export interface Product {
  id: string
  nome: string
  sku: string
  preco: number
  variants: ProductVariant[]
}

export function addItemToCart(cart: CartItem[], variant: ProductVariant, product: Product): CartItem[] {
  const existing = cart.find(i => i.variantId === variant.id)
  if (existing) {
    return cart.map(i =>
      i.variantId === variant.id
        ? { ...i, quantidade: Math.min(i.quantidade + 1, i.estoqueDisponivel) }
        : i
    )
  }
  return [...cart, {
    variantId: variant.id,
    productNome: product.nome,
    tamanho: variant.tamanho,
    cor: variant.cor,
    precoUnitario: product.preco,
    quantidade: 1,
    estoqueDisponivel: variant.estoque,
  }]
}

export function removeItemFromCart(cart: CartItem[], variantId: string): CartItem[] {
  return cart.filter(i => i.variantId !== variantId)
}

export function updateItemQty(cart: CartItem[], variantId: string, quantidade: number): CartItem[] {
  if (quantidade <= 0) {
    return removeItemFromCart(cart, variantId)
  }
  return cart.map(i =>
    i.variantId === variantId
      ? { ...i, quantidade: Math.min(quantidade, i.estoqueDisponivel) }
      : i
  )
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.precoUnitario * i.quantidade, 0)
}

export function formatMoney(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type FormaPagamento = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CREDIARIO'

export function validateCheckout(
  cart: CartItem[],
  formaPagamento: FormaPagamento | null,
  selectedCustomerId: string | null,
): string | null {
  if (cart.length === 0) return 'Adicione produtos à sacola'
  if (!formaPagamento) return 'Selecione forma de pagamento'
  if (formaPagamento === 'CREDIARIO' && !selectedCustomerId) return 'Selecione um cliente para Crediário'
  return null
}
