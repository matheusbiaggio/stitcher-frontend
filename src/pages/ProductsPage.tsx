import { type ProductResponse, productResponseSchema } from '@bonistore/shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, FormEvent } from 'react'

import { api } from '../lib/api'
import { input as inputStyle } from '../styles/ui'
import {
  ProductCard,
  type EditVariantForm,
  type EditProductForm,
  type NewVariantForm,
  NEW_VARIANT_EMPTY,
} from '../components/products/ProductCard'
import { CreateProductForm } from '../components/products/CreateProductForm'

type Product = ProductResponse

function priceToCentavos(price: number): string {
  return String(Math.round(price * 100))
}

export function ProductsPage() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      api
        .get<{ products: unknown[] }>('/products')
        .then((r) => r.data.products.map((p) => productResponseSchema.parse(p))),
  })
  const products = data ?? []

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/deactivate`),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/activate`),
  })

  const stockMutation = useMutation({
    mutationFn: ({
      productId,
      variantId,
      quantidade,
    }: {
      productId: string
      variantId: string
      quantidade: number
    }) => api.patch(`/products/${productId}/variants/${variantId}/stock`, { quantidade }),
  })

  const editVariantMutation = useMutation({
    mutationFn: ({
      productId,
      variantId,
      data,
    }: {
      productId: string
      variantId: string
      data: EditVariantForm
    }) =>
      api
        .put(`/products/${productId}/variants/${variantId}`, data)
        .then((r) => r.data),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { nome: string; sku: string; categoria: string; preco: number; custo: number }
    }) => api.put(`/products/${id}`, data).then((r) => r.data),
  })

  const addVariantMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: NewVariantForm }) =>
      api.post(`/products/${productId}/variants`, data).then((r) => r.data),
  })

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stockEntry, setStockEntry] = useState<{
    variantId: string
    productId: string
    value: string
  } | null>(null)
  const [editingVariant, setEditingVariant] = useState<{
    variantId: string
    productId: string
    form: EditVariantForm
  } | null>(null)
  const [editingProduct, setEditingProduct] = useState<{
    id: string
    form: EditProductForm
  } | null>(null)
  const [addingVariantTo, setAddingVariantTo] = useState<string | null>(null)
  const [newVariantForm, setNewVariantForm] = useState<NewVariantForm>(NEW_VARIANT_EMPTY)

  // Atalho de teclado N: abre o form de adicionar variante quando há um
  // produto expandido. Power-user shortcut documentado no tooltip do botão
  // sticky "+ Variante (N)" em ProductCard.
  useEffect(() => {
    if (!expandedId) return
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      // Não interferir quando o usuário está digitando em um input/textarea
      // (ex: pesquisa, edit form aberto). Também ignora atalhos com modifier.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable=true]')) return
      e.preventDefault()
      setAddingVariantTo(expandedId)
      setNewVariantForm(NEW_VARIANT_EMPTY)
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [expandedId])

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all')

  const categorias = Array.from(new Set(products.map((p) => p.categoria))).sort()

  const filteredProducts = products.filter((p) => {
    if (filterStatus === 'ativo' && !p.ativo) return false
    if (filterStatus === 'inativo' && p.ativo) return false
    if (filterCategoria && p.categoria !== filterCategoria) return false
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase()
      const matchProduct = p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      const matchVariant = p.variants.some(
        (v) => v.tamanho.toLowerCase().includes(q) || v.cor.toLowerCase().includes(q),
      )
      if (!matchProduct && !matchVariant) return false
    }
    return true
  })

  function openEditProduct(product: Product) {
    setEditingProduct({
      id: product.id,
      form: {
        nome: product.nome,
        sku: product.sku,
        categoria: product.categoria,
        preco: priceToCentavos(product.preco),
        custo: priceToCentavos(product.custo),
      },
    })
  }

  function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    const { form: f } = editingProduct
    updateProductMutation.mutate(
      {
        id: editingProduct.id,
        data: {
          nome: f.nome,
          sku: f.sku,
          categoria: f.categoria,
          preco: parseInt(f.preco || '0') / 100,
          custo: parseInt(f.custo || '0') / 100,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          setEditingProduct(null)
        },
      },
    )
  }

  function handleAddVariantSubmit(e: React.FormEvent, productId: string) {
    e.preventDefault()
    if (!newVariantForm.tamanho.trim() || !newVariantForm.cor.trim()) return
    addVariantMutation.mutate(
      { productId, data: newVariantForm },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          setAddingVariantTo(null)
          setNewVariantForm(NEW_VARIANT_EMPTY)
        },
      },
    )
  }

  function handleDeactivate(id: string) {
    deactivateMutation.mutate(id, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }) },
    })
  }

  function handleActivate(id: string) {
    activateMutation.mutate(id, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }) },
    })
  }

  function handleStockSubmit(e: FormEvent) {
    e.preventDefault()
    if (!stockEntry) return
    const quantidade = parseInt(stockEntry.value, 10)
    if (isNaN(quantidade) || quantidade <= 0) return
    stockMutation.mutate(
      { productId: stockEntry.productId, variantId: stockEntry.variantId, quantidade },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          setStockEntry(null)
        },
      },
    )
  }

  function handleEditVariantSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editingVariant) return
    // Normaliza '' (input limpo durante edit) pra 0 antes de enviar — sem
    // isso o Zod do backend rejeita por tipo inválido.
    const { estoque, estoqueMinimo, ...rest } = editingVariant.form
    const data = {
      ...rest,
      estoque: estoque === '' ? 0 : estoque,
      estoqueMinimo: estoqueMinimo === '' ? 0 : estoqueMinimo,
    }
    editVariantMutation.mutate(
      {
        productId: editingVariant.productId,
        variantId: editingVariant.variantId,
        data,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          setEditingVariant(null)
        },
      },
    )
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          letterSpacing: '0.05em',
          marginBottom: '2rem',
          color: 'var(--white)',
        }}
      >
        PRODUTOS
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Product list */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.8rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
              marginBottom: '1rem',
            }}
          >
            Catálogo de produtos
          </h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value) }}
              placeholder="Buscar por nome, SKU, tamanho ou cor..."
              style={{ ...inputStyle, flex: '1 1 240px', minWidth: '200px' }}
            />
            <select
              value={filterCategoria}
              onChange={(e) => { setFilterCategoria(e.target.value) }}
              style={{ ...inputStyle, flex: '0 0 160px', cursor: 'pointer' }}
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as 'all' | 'ativo' | 'inativo') }}
              style={{ ...inputStyle, flex: '0 0 130px', cursor: 'pointer' }}
            >
              <option value="all">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>

          {isPending ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum produto cadastrado.
            </p>
          ) : filteredProducts.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>
              Nenhum produto corresponde aos filtros.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  expanded={expandedId === product.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === product.id ? null : product.id)
                  }
                  stockEntry={stockEntry}
                  onStockEntryChange={setStockEntry}
                  onStockSubmit={handleStockSubmit}
                  stockMutation={stockMutation}
                  editingVariant={editingVariant}
                  onEditingVariantChange={setEditingVariant}
                  onEditVariantSubmit={handleEditVariantSubmit}
                  editVariantMutation={editVariantMutation}
                  editingProduct={editingProduct}
                  onEditingProductChange={setEditingProduct}
                  onToggleEditProduct={(p) => {
                    if (editingProduct?.id === p.id) {
                      setEditingProduct(null)
                    } else {
                      openEditProduct(p)
                    }
                  }}
                  onUpdateProduct={handleUpdateProduct}
                  updateProductMutation={updateProductMutation}
                  addingVariantTo={addingVariantTo}
                  onAddingVariantToChange={setAddingVariantTo}
                  newVariantForm={newVariantForm}
                  onNewVariantFormChange={setNewVariantForm}
                  onAddVariantSubmit={handleAddVariantSubmit}
                  addVariantMutation={addVariantMutation}
                  onDeactivate={handleDeactivate}
                  onActivate={handleActivate}
                  deactivateMutation={deactivateMutation}
                  activateMutation={activateMutation}
                />
              ))}
            </div>
          )}
        </section>

        <CreateProductForm />
      </div>
    </div>
  )
}
