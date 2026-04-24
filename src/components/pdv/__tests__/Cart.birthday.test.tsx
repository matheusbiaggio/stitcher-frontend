import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { SALE_DISCOUNT_EMPTY } from '../../../utils/cart'
import { Cart } from '../Cart'

const baseProps = {
  cart: [],
  formaPagamento: null,
  customerSearch: '',
  customerResults: [],
  discountMode: 'none' as const,
  saleDiscount: SALE_DISCOUNT_EMPTY,
  errorMsg: null,
  successMsg: null,
  isPending: false,
  onUpdateQty: vi.fn(),
  onRemoveItem: vi.fn(),
  onItemDiscountChange: vi.fn(),
  onDiscountModeChange: vi.fn(),
  onSaleDiscountChange: vi.fn(),
  onSelectPayment: vi.fn(),
  onCustomerSearchChange: vi.fn(),
  onSelectCustomer: vi.fn(),
  onClearCustomer: vi.fn(),
  onCheckout: vi.fn(),
}

const selectedAna = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Ana Aniversariante',
  dataNascimento: '1990-05-15',
}

describe('Cart — birthday customer badge', () => {
  it('does not render the badge when isBirthdayCustomer is false', () => {
    render(<Cart {...baseProps} selectedCustomer={selectedAna} isBirthdayCustomer={false} />)
    expect(screen.queryByText(/🎂 Aniversariante/)).toBeNull()
  })

  it('renders the 🎂 Aniversariante badge when isBirthdayCustomer is true', () => {
    render(<Cart {...baseProps} selectedCustomer={selectedAna} isBirthdayCustomer={true} />)
    expect(screen.getByText(/🎂 Aniversariante/)).toBeInTheDocument()
  })

  it('does not render the badge when no customer is selected', () => {
    render(<Cart {...baseProps} selectedCustomer={null} isBirthdayCustomer={true} />)
    expect(screen.queryByText(/🎂 Aniversariante/)).toBeNull()
  })
})
