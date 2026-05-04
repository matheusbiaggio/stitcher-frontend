import { PAYMENT_METHODS, type PaymentMethod } from '@bonistore/shared'
import { useState } from 'react'

import {
  type CartItem,
  type DiscountMode,
  type FormaPagamento,
  type SaleLevelDiscountState,
  cartBreakdown,
  formatMoney,
  itemPrecoUnitario,
} from '../../utils/cart'
import { QuickCreateCustomerForm } from './QuickCreateCustomerForm'
import {
  fieldError,
  input,
  label,
  primaryButton,
  rowActionButton,
  rowDangerButton,
  sectionHeader,
} from '../../styles/ui'

export interface CustomerResult {
  id: string
  nome: string
  telefone: string
  saldoDevedor: number
  dataNascimento: string | null
}

export interface SelectedCustomer {
  id: string
  nome: string
  dataNascimento: string | null
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
  selectedCustomer: SelectedCustomer | null
  customerSearch: string
  customerResults: CustomerResult[]
  discountMode: DiscountMode
  saleDiscount: SaleLevelDiscountState
  isBirthdayCustomer: boolean
  errorMsg: string | null
  successMsg: string | null
  isPending: boolean
  onUpdateQty: (variantId: string, quantidade: number) => void
  onRemoveItem: (variantId: string) => void
  onItemDiscountChange: (variantId: string, pct: number | undefined) => void
  onDiscountModeChange: (mode: DiscountMode) => void
  onSaleDiscountChange: (field: keyof SaleLevelDiscountState, value: string) => void
  onSelectPayment: (forma: FormaPagamento) => void
  onCustomerSearchChange: (value: string) => void
  onSelectCustomer: (customer: SelectedCustomer) => void
  onClearCustomer: () => void
  onCheckout: () => void
}

export function Cart({
  cart,
  formaPagamento,
  selectedCustomer,
  customerSearch,
  customerResults,
  discountMode,
  saleDiscount,
  isBirthdayCustomer,
  errorMsg,
  successMsg,
  isPending,
  onUpdateQty,
  onRemoveItem,
  onItemDiscountChange,
  onDiscountModeChange,
  onSaleDiscountChange,
  onSelectPayment,
  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
  onCheckout,
}: CartProps) {
  const breakdown = cartBreakdown(cart, discountMode, saleDiscount)
  // Quick-create de cliente sem abandonar a venda. Abre inline quando o
  // usuário clica "+ Criar cliente" no estado "Nenhum cliente encontrado".
  // O nome digitado no search vira o nome inicial do form.
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

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
                  {['Produto', 'Qtd', 'Unit', ...(discountMode === 'item' ? ['% off'] : []), 'Total', ''].map(
                    (col) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => {
                  const unitPrice = itemPrecoUnitario(item)
                  const hasDiscount = unitPrice < item.precoUnitarioOriginal
                  return (
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
                            onClick={() => {
                              onUpdateQty(item.variantId, item.quantidade - 1)
                            }}
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
                            onClick={() => {
                              onUpdateQty(item.variantId, item.quantidade + 1)
                            }}
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
                        {hasDiscount ? (
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span
                              style={{
                                textDecoration: 'line-through',
                                opacity: 0.6,
                                fontSize: '0.7rem',
                              }}
                            >
                              {formatMoney(item.precoUnitarioOriginal)}
                            </span>
                            <span style={{ color: 'var(--white)' }}>{formatMoney(unitPrice)}</span>
                          </div>
                        ) : (
                          formatMoney(item.precoUnitarioOriginal)
                        )}
                      </td>
                      {discountMode === 'item' && (
                        <td style={{ padding: '0.5rem 0.25rem', whiteSpace: 'nowrap' }}>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.descontoPct ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value
                              onItemDiscountChange(
                                item.variantId,
                                raw === '' ? undefined : Number(raw),
                              )
                            }}
                            placeholder="0"
                            style={{ ...input, width: '4.5rem', padding: '0.3rem 0.4rem', fontSize: '0.8rem' }}
                          />
                        </td>
                      )}
                      <td
                        style={{
                          padding: '0.5rem 0.25rem',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8rem',
                          color: 'var(--white)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatMoney(unitPrice * item.quantidade)}
                      </td>
                      <td style={{ padding: '0.5rem 0' }}>
                        <button onClick={() => {
                          onRemoveItem(item.variantId)
                        }} style={rowDangerButton}>
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
                onClick={() => {
                  onSelectPayment(opt.value)
                }}
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
                border: `1px solid ${isBirthdayCustomer ? 'var(--success, #4ade80)' : 'var(--black4)'}`,
                borderRadius: 'var(--radius)',
                padding: '0.5rem 0.75rem',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {selectedCustomer.nome}
                {isBirthdayCustomer && (
                  <span
                    style={{
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--success, #4ade80)',
                      background: 'rgba(74, 222, 128, 0.12)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                    title="Cliente faz aniversário nesta semana"
                  >
                    🎂 Aniversariante
                  </span>
                )}
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
                onChange={(e) => {
                  onCustomerSearchChange(e.target.value)
                }}
                style={{ ...input, marginBottom: '0.5rem' }}
              />
              {customerResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer({
                          id: c.id,
                          nome: c.nome,
                          dataNascimento: c.dataNascimento,
                        })
                      }}
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
                        <span
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.65rem',
                            color: 'var(--danger)',
                          }}
                        >
                          Saldo: {formatMoney(c.saldoDevedor)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {customerSearch.length >= 1 && customerResults.length === 0 && !quickCreateOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p
                    style={{
                      color: 'var(--gray)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                    }}
                  >
                    Nenhum cliente encontrado
                  </p>
                  <button
                    type="button"
                    data-testid="quick-create-customer-trigger"
                    onClick={() => {
                      setQuickCreateOpen(true)
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '0.4rem 0.75rem',
                      background: 'var(--white)',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      color: 'var(--black)',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + Criar cliente
                  </button>
                </div>
              )}
              {quickCreateOpen && (
                <QuickCreateCustomerForm
                  initialName={customerSearch}
                  onCreated={(customer) => {
                    onSelectCustomer({
                      id: customer.id,
                      nome: customer.nome,
                      dataNascimento: customer.dataNascimento,
                    })
                    setQuickCreateOpen(false)
                  }}
                  onCancel={() => {
                    setQuickCreateOpen(false)
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Discount */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={label}>Desconto</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {(['none', 'item', 'total'] as DiscountMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  onDiscountModeChange(mode)
                }}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  background: discountMode === mode ? 'var(--white)' : 'var(--black3)',
                  border: `1px solid ${discountMode === mode ? 'var(--white)' : 'var(--black4)'}`,
                  borderRadius: 'var(--radius)',
                  color: discountMode === mode ? 'var(--black)' : 'var(--gray)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontWeight: discountMode === mode ? 700 : 400,
                }}
              >
                {mode === 'none' && 'Nenhum'}
                {mode === 'item' && 'Por item'}
                {mode === 'total' && 'No total'}
              </button>
            ))}
          </div>

          {discountMode === 'total' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={saleDiscount.tipo}
                  onChange={(e) => {
                    onSaleDiscountChange('tipo', e.target.value)
                  }}
                  style={{ ...input, width: '5.5rem', cursor: 'pointer' }}
                >
                  <option value="percent">%</option>
                  <option value="reais">R$</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={saleDiscount.valor === 0 ? '' : saleDiscount.valor}
                  onChange={(e) => {
                    onSaleDiscountChange('valor', e.target.value)
                  }}
                  placeholder="0"
                  style={{ ...input, flex: 1 }}
                />
              </div>
              <textarea
                placeholder="Motivo (opcional)"
                value={saleDiscount.motivo}
                onChange={(e) => {
                  onSaleDiscountChange('motivo', e.target.value)
                }}
                maxLength={500}
                style={{
                  ...input,
                  minHeight: '60px',
                  resize: 'vertical',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                }}
              />
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div
          style={{
            borderTop: '1px solid var(--black4)',
            paddingTop: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {breakdown.desconto > 0 && (
            <>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    color: 'var(--gray)',
                  }}
                >
                  Subtotal
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    color: 'var(--gray)',
                  }}
                >
                  {formatMoney(breakdown.subtotal)}
                </span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    color: 'var(--success, #4ade80)',
                  }}
                >
                  Desconto
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    color: 'var(--success, #4ade80)',
                  }}
                >
                  − {formatMoney(breakdown.desconto)}
                </span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                color: 'var(--white)',
              }}
            >
              {formatMoney(breakdown.total)}
            </span>
          </div>
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
