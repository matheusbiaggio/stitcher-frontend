import { isBirthdayWeek, productResponseSchema } from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useEffect, useMemo, useState } from 'react'

import { Cart, type CustomerResult, type SelectedCustomer } from '../components/pdv/Cart'
import { ProductCatalog } from '../components/pdv/ProductCatalog'
import { api } from '../lib/api'
import { extractApiError } from '../lib/errors'
import { pageTitle } from '../styles/ui'
import {
  type CartItem,
  type DiscountMode,
  type FormaPagamento,
  type Product,
  type ProductVariant,
  type SaleLevelDiscountState,
  SALE_DISCOUNT_EMPTY,
  addItemToCart,
  cartBreakdown,
  clearAllItemDiscounts,
  itemPrecoUnitario,
  removeItemFromCart,
  setItemDiscount,
  updateItemQty,
  validateCheckout,
} from '../utils/cart'

dayjs.extend(utc)
dayjs.extend(timezone)

const BIRTHDAY_DEFAULT_PCT = 10
const BIRTHDAY_MOTIVO = 'Desconto de aniversário'
const TZ = 'America/Sao_Paulo'

export function PdvPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [discountMode, setDiscountMode] = useState<DiscountMode>('none')
  const [saleDiscount, setSaleDiscount] = useState<SaleLevelDiscountState>(SALE_DISCOUNT_EMPTY)
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
        .get<{ customers: CustomerResult[] }>(
          '/customers/search?q=' + encodeURIComponent(customerSearch),
        )
        .then((r) => r.data.customers),
    enabled: customerSearch.length >= 1,
    staleTime: 10_000,
  })
  const customerResults = customersData ?? []

  const checkoutMutation = useMutation({
    mutationFn: (body: object) => api.post('/sales', body).then((r) => r.data),
  })

  const isBirthdayCustomer = useMemo(() => {
    if (!selectedCustomer?.dataNascimento) return false
    const today = dayjs().tz(TZ).format('YYYY-MM-DD')
    try {
      return isBirthdayWeek(selectedCustomer.dataNascimento, today)
    } catch {
      return false
    }
  }, [selectedCustomer?.dataNascimento])

  // Auto-aplica desconto de aniversário quando cliente é selecionado pela primeira vez
  // (ou trocado para outro) E modo atual é 'none' — respeita intervenção manual do caixa.
  useEffect(() => {
    if (!isBirthdayCustomer) return
    if (discountMode !== 'none') return
    setDiscountMode('total')
    setSaleDiscount({ tipo: 'percent', valor: BIRTHDAY_DEFAULT_PCT, motivo: BIRTHDAY_MOTIVO })
    // Depend only on selected customer id so the effect doesn't re-trigger
    // when caixa later edits discountMode/saleDiscount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id])

  function addToCart(variant: ProductVariant, product: Product) {
    setCart((prev) => addItemToCart(prev, variant, product))
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function handleDiscountModeChange(mode: DiscountMode) {
    setDiscountMode(mode)
    if (mode !== 'item') {
      setCart((prev) => clearAllItemDiscounts(prev))
    }
    if (mode !== 'total') {
      setSaleDiscount(SALE_DISCOUNT_EMPTY)
    }
    setErrorMsg(null)
  }

  function handleSaleDiscountChange(field: keyof SaleLevelDiscountState, value: string) {
    setSaleDiscount((prev) => {
      if (field === 'tipo') {
        return { ...prev, tipo: value === 'reais' ? 'reais' : 'percent' }
      }
      if (field === 'valor') {
        const n = value === '' ? 0 : Number(value)
        return { ...prev, valor: Number.isFinite(n) && n >= 0 ? n : 0 }
      }
      return { ...prev, motivo: value }
    })
  }

  function handleCheckout() {
    setErrorMsg(null)
    setSuccessMsg(null)

    const breakdown = cartBreakdown(cart, discountMode, saleDiscount)
    const error = validateCheckout(
      cart,
      formaPagamento,
      selectedCustomer?.id ?? null,
      breakdown,
    )
    if (error) {
      setErrorMsg(error)
      return
    }

    const itens = cart.map((i) => ({
      variantId: i.variantId,
      quantidade: i.quantidade,
      precoUnitarioOriginal: i.precoUnitarioOriginal,
      precoUnitario: itemPrecoUnitario(i),
    }))

    const body: Record<string, unknown> = {
      customerId: selectedCustomer?.id,
      formaPagamento,
      itens,
    }
    if (discountMode === 'total' && saleDiscount.valor > 0) {
      body.descontoTotal = {
        tipo: saleDiscount.tipo,
        valor: saleDiscount.valor,
        motivo: saleDiscount.motivo.trim() === '' ? undefined : saleDiscount.motivo.trim(),
      }
    }

    checkoutMutation.mutate(body, {
      onSuccess: () => {
        setCart([])
        setSearchInput('')
        setSelectedCustomer(null)
        setCustomerSearch('')
        setFormaPagamento(null)
        setDiscountMode('none')
        setSaleDiscount(SALE_DISCOUNT_EMPTY)
        setSuccessMsg('Venda fechada com sucesso!')
        void queryClient.invalidateQueries({ queryKey: ['pdv-catalog'] })
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
          discountMode={discountMode}
          saleDiscount={saleDiscount}
          isBirthdayCustomer={isBirthdayCustomer}
          errorMsg={errorMsg}
          successMsg={successMsg}
          isPending={checkoutMutation.isPending}
          onUpdateQty={(variantId, quantidade) => {
            setCart((prev) => updateItemQty(prev, variantId, quantidade))
          }}
          onRemoveItem={(variantId) => {
            setCart((prev) => removeItemFromCart(prev, variantId))
          }}
          onItemDiscountChange={(variantId, pct) => {
            setCart((prev) => setItemDiscount(prev, variantId, pct))
          }}
          onDiscountModeChange={handleDiscountModeChange}
          onSaleDiscountChange={handleSaleDiscountChange}
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
