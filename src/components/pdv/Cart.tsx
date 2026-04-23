import { PAYMENT_METHODS, type PaymentMethod } from '@bonistore/shared'
import {
  type CartItem,
  type FormaPagamento,
  cartTotal,
  formatMoney,
} from '../../utils/cart'
import {
  sectionHeader,
  label,
  input,
  primaryButton,
  rowActionButton,
  rowDangerButton,
  fieldError,
} from '../../styles/ui'

export interface CustomerResult {
  id: string
  nome: string
  telefone: string
  saldoDevedor: number
}

const paymentLabels: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  CREDIARIO: 'Crediário',
}

const CREDIARIO = PAYMENT_METHODS[3]

const paymentOptions = PAYMENT_METHODS.map((v) => ({ value: v, label: paymentLabels[v] }))

interface CartProps {
  cart: CartItem[]
  formaPagamento: FormaPagamento | null
  selectedCustomer: { id: string; nome: string } | null
  customerSearch: string
  customerResults: CustomerResult[]
  errorMsg: string | null
  successMsg: string | null
  isPending: boolean
  onUpdateQty: (variantId: string, quantidade: number) => void
  onRemoveItem: (variantId: string) => void
  onSelectPayment: (forma: FormaPagamento) => void
  onCustomerSearchChange: (value: string) => void
  onSelectCustomer: (customer: { id: string; nome: string }) => void
  onClearCustomer: () => void
  onCheckout: () => void
}

export function Cart({
  cart,
  formaPagamento,
  selectedCustomer,
  customerSearch,
  customerResults,
  errorMsg,
  successMsg,
  isPending,
  onUpdateQty,
  onRemoveItem,
  onSelectPayment,
  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
  onCheckout,
}: CartProps) {
  const total = cartTotal(cart)

  return (
    <section>
      <div
        style={{
          background: 'var(--black2)',
          border: '1px solid var(--black4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <h2 style={sectionHeader}>Sacola</h2>

        {cart.length === 0 ? (
          <p
            style={{
              color: 'var(--gray)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            Nenhum item adicionado.
          </p>
        ) : (
          <div style={{ marginBottom: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Produto', 'Qtd', 'Unit', 'Total', ''].map((col) => (
                    <th
                      key={col}
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        color: 'var(--gray)',
                        textAlign: 'left',
                        paddingBottom: '0.5rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.variantId} style={{ borderTop: '1px solid var(--black4)' }}>
                    <td style={{ padding: '0.5rem 0', paddingRight: '0.5rem' }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8rem',
                          color: 'var(--white)',
                          marginBottom: '0.15rem',
                        }}
                      >
                        {item.productNome}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.65rem',
                          color: 'var(--gray)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {item.tamanho} / {item.cor}
                      </p>
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          onClick={() => onUpdateQty(item.variantId, item.quantidade - 1)}
                          style={{ ...rowActionButton, padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            color: 'var(--white)',
                            minWidth: '1.5rem',
                            textAlign: 'center',
                          }}
                        >
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => onUpdateQty(item.variantId, item.quantidade + 1)}
                          disabled={item.quantidade >= item.estoqueDisponivel}
                          style={{ ...rowActionButton, padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.5rem 0.25rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--gray)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(item.precoUnitario)}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem 0.25rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        color: 'var(--white)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(item.precoUnitario * item.quantidade)}
                    </td>
                    <td style={{ padding: '0.5rem 0' }}>
                      <button onClick={() => onRemoveItem(item.variantId)} style={rowDangerButton}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment method */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={label}>Forma de pagamento</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelectPayment(opt.value)}
                style={{
                  padding: '0.5rem',
                  background: formaPagamento === opt.value ? 'var(--white)' : 'var(--black3)',
                  border: `1px solid ${formaPagamento === opt.value ? 'var(--white)' : 'var(--black4)'}`,
                  borderRadius: 'var(--radius)',
                  color: formaPagamento === opt.value ? 'var(--black)' : 'var(--gray)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontWeight: formaPagamento === opt.value ? 700 : 400,
                  transition: 'all var(--transition)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={label}>
            Cliente{' '}
            {formaPagamento === CREDIARIO ? (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>*</span>
            ) : (
              <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
            )}
          </label>
          {selectedCustomer ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--black3)',
                border: '1px solid var(--black4)',
                borderRadius: 'var(--radius)',
                padding: '0.5rem 0.75rem',
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--white)' }}>
                {selectedCustomer.nome}
              </span>
              <button onClick={onClearCustomer} style={{ ...rowActionButton, fontSize: '0.65rem' }}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Nome, telefone ou CPF..."
                value={customerSearch}
                onChange={(e) => onCustomerSearchChange(e.target.value)}
                style={{ ...input, marginBottom: '0.5rem' }}
              />
              {customerResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectCustomer({ id: c.id, nome: c.nome })}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--black3)',
                        border: '1px solid var(--black4)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--white)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{c.nome}</span>
                      {c.saldoDevedor > 0 && (
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: 'var(--danger)' }}>
                          Saldo: {formatMoney(c.saldoDevedor)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {customerSearch.length >= 1 && customerResults.length === 0 && (
                <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
                  Nenhum cliente encontrado
                </p>
              )}
            </>
          )}
        </div>

        {/* Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--black4)',
            paddingTop: '1rem',
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              color: 'var(--gray)',
              textTransform: 'uppercase',
            }}
          >
            Total
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--white)' }}>
            {formatMoney(total)}
          </span>
        </div>

        {errorMsg && (
          <p style={{ ...fieldError, marginBottom: '0.75rem', fontSize: '0.8rem' }}>{errorMsg}</p>
        )}
        {successMsg && (
          <p
            style={{
              color: 'var(--success)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-body)',
              marginBottom: '0.75rem',
            }}
          >
            {successMsg}
          </p>
        )}

        <button onClick={onCheckout} disabled={isPending} style={primaryButton(isPending)}>
          {isPending ? 'Processando...' : 'Fechar Venda'}
        </button>
      </div>
    </section>
  )
}
