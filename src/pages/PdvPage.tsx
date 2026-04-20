import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  type CartItem, type Product, type ProductVariant, type FormaPagamento,
  addItemToCart, removeItemFromCart, updateItemQty, cartTotal, formatMoney, validateCheckout,
} from '../utils/cart'
import {
  pageTitle, sectionHeader, card, input, label,
  primaryButton, rowActionButton, rowDangerButton, badge, fieldError,
} from '../styles/ui'

interface CustomerResult {
  id: string
  nome: string
  telefone: string
  saldoDevedor: number
}

export function PdvPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; nome: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load full catalog — always refetch on mount so newly added products appear immediately
  const { data: allProductsData, isPending: catalogLoading } = useQuery({
    queryKey: ['pdv-catalog'],
    queryFn: () => api.get<{ products: Product[] }>('/products').then(r => r.data.products),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const allProducts = (allProductsData ?? []).filter(p => (p as Product & { ativo?: boolean }).ativo !== false)

  // Client-side filter: match nome, SKU, tamanho, cor
  const q = searchInput.trim().toLowerCase()
  const products = q.length === 0
    ? allProducts
    : allProducts.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.variants.some(v =>
          v.tamanho.toLowerCase().includes(q) ||
          v.cor.toLowerCase().includes(q)
        )
      )

  const { data: customersData } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => api.get<{ customers: CustomerResult[] }>('/customers/search?q=' + encodeURIComponent(customerSearch)).then(r => r.data.customers),
    enabled: customerSearch.length >= 1,
    staleTime: 10_000,
  })
  const customerResults = customersData ?? []

  const checkoutMutation = useMutation({
    mutationFn: (body: object) => api.post('/sales', body).then(r => r.data),
  })

  function addToCart(variant: ProductVariant, product: Product) {
    setCart(prev => addItemToCart(prev, variant, product))
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function removeFromCart(variantId: string) {
    setCart(prev => removeItemFromCart(prev, variantId))
  }

  function updateQty(variantId: string, quantidade: number) {
    setCart(prev => updateItemQty(prev, variantId, quantidade))
  }

  const total = cartTotal(cart)

  function handleCheckout() {
    setErrorMsg(null)
    setSuccessMsg(null)

    const error = validateCheckout(cart, formaPagamento, selectedCustomer?.id ?? null)
    if (error) {
      setErrorMsg(error)
      return
    }

    const body = {
      customerId: selectedCustomer?.id,
      formaPagamento,
      itens: cart.map(i => ({
        variantId: i.variantId,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
      })),
    }

    checkoutMutation.mutate(body, {
      onSuccess: () => {
        setCart([])
        setSearchInput('')
        setSelectedCustomer(null)
        setCustomerSearch('')
        setFormaPagamento(null)
        setSuccessMsg('Venda fechada com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['pdv-catalog'] })
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } }
        setErrorMsg(e.response?.data?.message ?? 'Erro ao fechar venda')
      },
    })
  }

  const paymentOptions: { value: FormaPagamento; label: string }[] = [
    { value: 'PIX', label: 'PIX' },
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'CARTAO', label: 'Cartão' },
    { value: 'CREDIARIO', label: 'Crediário' },
  ]

  return (
    <div>
      <h1 style={pageTitle}>PDV — CAIXA</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column — catalog + filter */}
        <section>
          <h2 style={sectionHeader}>Catálogo</h2>
          <input
            type="text"
            placeholder="Filtrar por nome, SKU, tamanho ou cor..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ ...input, marginBottom: '1rem' }}
            autoFocus
          />

          {catalogLoading ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>Carregando catálogo...</p>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
              {q.length > 0 ? `Nenhum produto encontrado para "${searchInput}"` : 'Nenhum produto cadastrado.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              {products.map(product => {
                const availableVariants = product.variants.filter(v => v.estoque > 0)
                const outOfStock = availableVariants.length === 0
                return (
                  <div key={product.id} style={{
                    ...card,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                    opacity: outOfStock ? 0.4 : 1,
                  }}>
                    {/* Header: name + price */}
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--white)', fontWeight: 500, marginBottom: '0.3rem', lineHeight: 1.3 }}>
                        {product.nome}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={badge('info')}>{product.sku}</span>
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--success)', letterSpacing: '0.05em' }}>
                          {formatMoney(product.preco)}
                        </span>
                      </div>
                    </div>

                    {/* Variant buttons */}
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                      {outOfStock ? (
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--gray)', letterSpacing: '0.08em' }}>
                          SEM ESTOQUE
                        </span>
                      ) : (
                        availableVariants.map(variant => (
                          <button
                            key={variant.id}
                            onClick={() => addToCart(variant, product)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'var(--black)',
                              border: '1px solid var(--black4)',
                              borderRadius: 'var(--radius)',
                              color: 'var(--white)',
                              fontFamily: 'var(--font-label)',
                              fontSize: '0.6rem',
                              letterSpacing: '0.07em',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              transition: 'border-color 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--white)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--black4)')}
                          >
                            {variant.tamanho && `${variant.tamanho} `}{variant.cor}
                            <span style={{ color: 'var(--gray)', marginLeft: '0.25rem' }}>({variant.estoque})</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Right column — cart + payment + checkout */}
        <section>
          <div style={{ background: 'var(--black2)', border: '1px solid var(--black4)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={sectionHeader}>Sacola</h2>

            {cart.length === 0 ? (
              <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Nenhum item adicionado.
              </p>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Produto', 'Qtd', 'Unit', 'Total', ''].map(col => (
                        <th key={col} style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--gray)', textAlign: 'left', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.variantId} style={{ borderTop: '1px solid var(--black4)' }}>
                        <td style={{ padding: '0.5rem 0', paddingRight: '0.5rem' }}>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--white)', marginBottom: '0.15rem' }}>
                            {item.productNome}
                          </p>
                          <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: 'var(--gray)', letterSpacing: '0.05em' }}>
                            {item.tamanho} / {item.cor}
                          </p>
                        </td>
                        <td style={{ padding: '0.5rem 0.25rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button onClick={() => updateQty(item.variantId, item.quantidade - 1)} style={{ ...rowActionButton, padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>−</button>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--white)', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantidade}</span>
                            <button onClick={() => updateQty(item.variantId, item.quantidade + 1)} disabled={item.quantidade >= item.estoqueDisponivel} style={{ ...rowActionButton, padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.25rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                          {formatMoney(item.precoUnitario)}
                        </td>
                        <td style={{ padding: '0.5rem 0.25rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--white)', whiteSpace: 'nowrap' }}>
                          {formatMoney(item.precoUnitario * item.quantidade)}
                        </td>
                        <td style={{ padding: '0.5rem 0' }}>
                          <button onClick={() => removeFromCart(item.variantId)} style={rowDangerButton}>×</button>
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
                {paymentOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFormaPagamento(opt.value); setSelectedCustomer(null); setCustomerSearch(''); setErrorMsg(null) }}
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

            {/* Customer link — optional for all, required for Crediário */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={label}>
                Cliente{' '}
                {formaPagamento === 'CREDIARIO'
                  ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>*</span>
                  : <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span>
                }
              </label>
              {selectedCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--black3)', border: '1px solid var(--black4)', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--white)' }}>{selectedCustomer.nome}</span>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} style={{ ...rowActionButton, fontSize: '0.65rem' }}>Trocar</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Nome, telefone ou CPF..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    style={{ ...input, marginBottom: '0.5rem' }}
                  />
                  {customerResults.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer({ id: c.id, nome: c.nome }); setCustomerSearch('') }}
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
                    <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>Nenhum cliente encontrado</p>
                  )}
                </>
              )}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--black4)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--gray)', textTransform: 'uppercase' }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--white)' }}>
                {formatMoney(total)}
              </span>
            </div>

            {/* Messages */}
            {errorMsg && <p style={{ ...fieldError, marginBottom: '0.75rem', fontSize: '0.8rem' }}>{errorMsg}</p>}
            {successMsg && (
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>
                {successMsg}
              </p>
            )}

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
              style={primaryButton(checkoutMutation.isPending)}
            >
              {checkoutMutation.isPending ? 'Processando...' : 'Fechar Venda'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
