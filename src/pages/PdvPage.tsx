import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productResponseSchema } from '@bonistore/shared'

import { api } from '../lib/api'
import { extractApiError } from '../lib/errors'
import {
  type CartItem,
  type Product,
  type ProductVariant,
  type FormaPagamento,
  addItemToCart,
  removeItemFromCart,
  updateItemQty,
  validateCheckout,
} from '../utils/cart'
import { pageTitle } from '../styles/ui'
import { ProductCatalog } from '../components/pdv/ProductCatalog'
import { Cart, type CustomerResult } from '../components/pdv/Cart'

export function PdvPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; nome: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: allProductsData, isPending: catalogLoading } = useQuery({
    queryKey: ['pdv-catalog'],
    queryFn: () =>
      api
        .get<{ products: unknown[] }>('/products')
        .then((r) => r.data.products.map((p) => productResponseSchema.parse(p))),
    staleTime: 5 * 60 * 1000,
  })
  const allProducts = (allProductsData ?? []).filter((p) => p.ativo !== false)

  const q = searchInput.trim().toLowerCase()
  const products =
    q.length === 0
      ? allProducts
      : allProducts.filter(
          (p) =>
            p.nome.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.variants.some(
              (v) => v.tamanho.toLowerCase().includes(q) || v.cor.toLowerCase().includes(q),
            ),
        )

  const { data: customersData } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () =>
      api
        .get<{ customers: CustomerResult[] }>('/customers/search?q=' + encodeURIComponent(customerSearch))
        .then((r) => r.data.customers),
    enabled: customerSearch.length >= 1,
    staleTime: 10_000,
  })
  const customerResults = customersData ?? []

  const checkoutMutation = useMutation({
    mutationFn: (body: object) => api.post('/sales', body).then((r) => r.data),
  })

  function addToCart(variant: ProductVariant, product: Product) {
    setCart((prev) => addItemToCart(prev, variant, product))
    setErrorMsg(null)
    setSuccessMsg(null)
  }

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
      itens: cart.map((i) => ({
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
        setErrorMsg(extractApiError(err, 'Erro ao fechar venda'))
      },
    })
  }

  return (
    <div>
      <h1 style={pageTitle}>PDV — CAIXA</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <ProductCatalog
          products={products}
          loading={catalogLoading}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          onAddToCart={addToCart}
        />
        <Cart
          cart={cart}
          formaPagamento={formaPagamento}
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          customerResults={customerResults}
          errorMsg={errorMsg}
          successMsg={successMsg}
          isPending={checkoutMutation.isPending}
          onUpdateQty={(variantId, quantidade) =>
            setCart((prev) => updateItemQty(prev, variantId, quantidade))
          }
          onRemoveItem={(variantId) =>
            setCart((prev) => removeItemFromCart(prev, variantId))
          }
          onSelectPayment={(forma) => {
            setFormaPagamento(forma)
            setSelectedCustomer(null)
            setCustomerSearch('')
            setErrorMsg(null)
          }}
          onCustomerSearchChange={setCustomerSearch}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c)
            setCustomerSearch('')
          }}
          onClearCustomer={() => {
            setSelectedCustomer(null)
            setCustomerSearch('')
          }}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  )
}
