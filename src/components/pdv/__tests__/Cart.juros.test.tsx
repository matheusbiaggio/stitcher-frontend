import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { SALE_DISCOUNT_EMPTY, type CartItem } from '../../../utils/cart'
import { Cart } from '../Cart'

const sampleItem: CartItem = {
  variantId: 'v1',
  productNome: 'Camiseta',
  tamanho: 'M',
  cor: 'Preto',
  precoUnitarioOriginal: 100,
  quantidade: 1,
  estoqueDisponivel: 5,
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    cart: [sampleItem],
    formaPagamento: null,
    selectedCustomer: null,
    customerSearch: '',
    customerResults: [],
    discountMode: 'none' as const,
    saleDiscount: SALE_DISCOUNT_EMPTY,
    isBirthdayCustomer: false,
    crediarioJurosPercent: 0,
    aplicarJurosCrediario: false,
    errorMsg: null,
    successMsg: null,
    isPending: false,
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
    onItemDiscountChange: vi.fn(),
    onDiscountModeChange: vi.fn(),
    onSaleDiscountChange: vi.fn(),
    onSelectPayment: vi.fn(),
    onAplicarJurosCrediarioChange: vi.fn(),
    onCustomerSearchChange: vi.fn(),
    onSelectCustomer: vi.fn(),
    onClearCustomer: vi.fn(),
    onCheckout: vi.fn(),
    ...overrides,
  }
}

describe('Cart — juros do crediário (M013)', () => {
  it('NÃO mostra checkbox quando crediarioJurosPercent=0', () => {
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'CREDIARIO',
          crediarioJurosPercent: 0,
        })}
      />,
    )
    expect(screen.queryByTestId('aplicar-juros-checkbox')).toBeNull()
  })

  it('NÃO mostra checkbox quando formaPagamento ≠ CREDIARIO', () => {
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'PIX',
          crediarioJurosPercent: 10,
        })}
      />,
    )
    expect(screen.queryByTestId('aplicar-juros-checkbox')).toBeNull()
  })

  it('mostra checkbox quando CREDIARIO + jurosPercent > 0', () => {
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'CREDIARIO',
          crediarioJurosPercent: 5,
        })}
      />,
    )
    const checkbox = screen.getByTestId('aplicar-juros-checkbox') as HTMLInputElement
    expect(checkbox).toBeInTheDocument()
    expect(checkbox.checked).toBe(false) // default desmarcado
  })

  it('NÃO aplica juros no breakdown enquanto checkbox desmarcado', () => {
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'CREDIARIO',
          crediarioJurosPercent: 10,
          aplicarJurosCrediario: false,
        })}
      />,
    )
    // Subtotal não aparece (só quando juros>0 OU desconto>0)
    expect(screen.queryByTestId('breakdown-juros-row')).toBeNull()
  })

  it('aplica juros no breakdown quando checkbox marcado + CREDIARIO', () => {
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'CREDIARIO',
          crediarioJurosPercent: 10,
          aplicarJurosCrediario: true,
        })}
      />,
    )
    expect(screen.getByTestId('breakdown-juros-row')).toBeInTheDocument()
    expect(screen.getByTestId('breakdown-juros-row')).toHaveTextContent(/10/) // "Juros (10%)"
    expect(screen.getByTestId('breakdown-juros-row')).toHaveTextContent(/10,00/) // R$ 10
  })

  it('marcar o checkbox dispara onAplicarJurosCrediarioChange(true)', () => {
    const onChange = vi.fn()
    render(
      <Cart
        {...makeProps({
          formaPagamento: 'CREDIARIO',
          crediarioJurosPercent: 5,
          aplicarJurosCrediario: false,
          onAplicarJurosCrediarioChange: onChange,
        })}
      />,
    )
    fireEvent.click(screen.getByTestId('aplicar-juros-checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
