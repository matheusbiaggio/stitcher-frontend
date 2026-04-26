import { type DashboardData } from '@bonistore/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import { RecentSalesWidget } from '../RecentSalesWidget'

type Sale = DashboardData['recentSales'][number]

const sale = (id: string, customer: string | null): Sale => ({
  id: `00000000-0000-0000-0000-00000000000${id}`,
  subtotal: 150,
  desconto: 0,
  descontoMotivo: null,
  total: 150,
  formaPagamento: 'PIX',
  status: 'COMPLETED',
  createdAt: '2026-04-14T10:00:00Z',
  customer: customer
    ? { id: '00000000-0000-0000-0000-000000000099', nome: customer }
    : null,
  user: { id: '00000000-0000-0000-0000-000000000088', nome: 'Operador' },
  itens: [],
})

function renderWidget(sales: Sale[]) {
  return render(
    <MemoryRouter>
      <RecentSalesWidget sales={sales} />
    </MemoryRouter>,
  )
}

describe('RecentSalesWidget', () => {
  it('renders empty state when there are no sales', () => {
    renderWidget([])
    expect(screen.getByText(/Nenhuma venda recente/i)).toBeInTheDocument()
  })

  it('shows total count alongside the heading', () => {
    renderWidget([sale('1', 'Maria'), sale('2', 'João')])
    expect(screen.getByText(/Últimas Vendas \(2\)/)).toBeInTheDocument()
  })

  it('respects the page size and paginates the rest', async () => {
    const user = userEvent.setup()
    const sales = Array.from({ length: 15 }, (_, i) =>
      sale(String(i + 1).padStart(1, '0'), `Cliente ${i + 1}`),
    )
    renderWidget(sales)

    expect(screen.getByText('Cliente 1')).toBeInTheDocument()
    expect(screen.getByText('Cliente 10')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 11')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Próxima/i }))
    expect(screen.getByText('Cliente 11')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 1')).not.toBeInTheDocument()
  })

  it('changes page size and resets to page 1', async () => {
    const user = userEvent.setup()
    const sales = Array.from({ length: 12 }, (_, i) => sale(String(i + 1), `C${i + 1}`))
    renderWidget(sales)

    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Vendas por página/i), '25')
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument()
    expect(screen.getByText('C12')).toBeInTheDocument()
  })

  it('exposes a "Ver vendas" link to /vendas', () => {
    renderWidget([])
    const link = screen.getByRole('link', { name: /Ver vendas/i })
    expect(link).toHaveAttribute('href', '/vendas')
  })
})
