import { type DashboardData } from '@bonistore/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import { LowStockWidget } from '../LowStockWidget'

type Alert = DashboardData['lowStockAlerts'][number]

const alert = (id: string, productName: string, estoque = 1, estoqueMinimo = 10): Alert => ({
  id: `00000000-0000-0000-0000-00000000000${id}`,
  productName,
  tamanho: 'M',
  cor: 'Preto',
  estoque,
  estoqueMinimo,
})

function renderWidget(alerts: Alert[]) {
  return render(
    <MemoryRouter>
      <LowStockWidget alerts={alerts} />
    </MemoryRouter>,
  )
}

describe('LowStockWidget', () => {
  it('renders empty state when there are no alerts', () => {
    renderWidget([])
    expect(screen.getByText(/Nenhum alerta de estoque/i)).toBeInTheDocument()
  })

  it('shows total count alongside the heading', () => {
    renderWidget([alert('1', 'Camiseta'), alert('2', 'Calça')])
    expect(screen.getByText(/Alertas de Estoque \(2\)/)).toBeInTheDocument()
  })

  it('paginates large lists at the default page size of 10', async () => {
    const user = userEvent.setup()
    const alerts = Array.from({ length: 13 }, (_, i) =>
      alert(String(i + 1), `Produto ${i + 1}`),
    )
    renderWidget(alerts)

    expect(screen.getByText('Produto 1')).toBeInTheDocument()
    expect(screen.getByText('Produto 10')).toBeInTheDocument()
    expect(screen.queryByText('Produto 11')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Próxima/i }))
    expect(screen.getByText('Produto 11')).toBeInTheDocument()
    expect(screen.queryByText('Produto 1')).not.toBeInTheDocument()
  })

  it('changes page size and resets to page 1', async () => {
    const user = userEvent.setup()
    const alerts = Array.from({ length: 8 }, (_, i) => alert(String(i + 1), `Item ${i + 1}`))
    renderWidget(alerts)

    expect(screen.queryByText(/Página/)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Alertas por página/i), '5')
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument()
  })

  it('exposes a "Ver produtos" link to /produtos', () => {
    renderWidget([])
    const link = screen.getByRole('link', { name: /Ver produtos/i })
    expect(link).toHaveAttribute('href', '/produtos')
  })
})
