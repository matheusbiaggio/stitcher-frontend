import { type ProductResponse, type ProductVariantResponse, productResponseSchema } from '@bonistore/shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, FormEvent } from 'react'

import { api } from '../lib/api'
import {
  label as labelStyle,
  input as inputStyle,
  inputSmall as smallInputStyle,
} from '../styles/ui'

type Variant = ProductVariantResponse
type Product = ProductResponse

interface VariantRow {
  tamanho: string
  cor: string
  estoque: number
  estoqueMinimo: number
}

interface CreateProductForm {
  nome: string
  sku: string
  categoria: string
  preco: string
  custo: string
  variants: VariantRow[]
}

interface EditVariantForm {
  tamanho: string
  cor: string
  estoqueMinimo: number | ''
}

interface EditProductForm {
  nome: string
  sku: string
  categoria: string
  preco: string // centavos digits
  custo: string // centavos digits
}

interface NewVariantForm {
  tamanho: string
  cor: string
  estoque: number | ''
  estoqueMinimo: number | ''
}

function priceToCentavos(price: number): string {
  return String(Math.round(price * 100))
}

const NEW_VARIANT_EMPTY: NewVariantForm = { tamanho: '', cor: '', estoque: 0, estoqueMinimo: 0 }

const FORM_EMPTY: CreateProductForm = {
  nome: '',
  sku: '',
  categoria: '',
  preco: '',
  custo: '',
  variants: [],
}

interface FormErrors {
  nome?: string
  sku?: string
  categoria?: string
  preco?: string
  custo?: string
  variants?: Record<number, string>
}

function extractApiErrors(err: unknown): FormErrors {
  const data = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response
    ?.data
  if (!data?.errors) return {}
  const map: FormErrors = {}
  const e = data.errors
  if (e.nome?.length) map.nome = e.nome[0]
  if (e.sku?.length) map.sku = e.sku[0]
  if (e.categoria?.length) map.categoria = e.categoria[0]
  if (e.preco?.length) map.preco = e.preco[0]
  if (e.custo?.length) map.custo = e.custo[0]
  return map
}

/** Store raw digits (centavos) and display as Brazilian money: "4990" → "49,90" */
function formatMoneyDisplay(digits: string): string {
  const n = parseInt(digits || '0', 10)
  const reais = Math.floor(n / 100)
  const centavos = n % 100
  return `${reais},${String(centavos).padStart(2, '0')}`
}

function validateForm(form: CreateProductForm): FormErrors {
  const errors: FormErrors = {}
  if (!form.nome.trim()) errors.nome = 'Nome é obrigatório'
  if (!form.sku.trim()) errors.sku = 'SKU é obrigatório'
  if (!form.categoria.trim()) errors.categoria = 'Categoria é obrigatória'
  if (!form.preco || parseInt(form.preco) <= 0) errors.preco = 'Informe um preço de venda positivo'
  const variantErrors: Record<number, string> = {}
  form.variants.forEach((v, i) => {
    if (!v.tamanho.trim() || !v.cor.trim()) variantErrors[i] = 'Tamanho e cor são obrigatórios'
  })
  if (Object.keys(variantErrors).length) errors.variants = variantErrors
  return errors
}

export function ProductsPage() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      api.get<{ products: unknown[] }>('/products').then((r) => r.data.products.map((p) => productResponseSchema.parse(p))),
  })
  const products = data ?? []

  const createMutation = useMutation({
    mutationFn: (
      body: Omit<CreateProductForm, 'preco' | 'custo'> & { preco: number; custo: number },
    ) => api.post<{ product: Product }>('/products', body).then((r) => r.data.product),
  })

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
        .put<{ variant: Variant }>(`/products/${productId}/variants/${variantId}`, data)
        .then((r) => r.data.variant),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { nome: string; sku: string; categoria: string; preco: number; custo: number }
    }) => api.put<{ product: Product }>(`/products/${id}`, data).then((r) => r.data.product),
  })

  const addVariantMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: NewVariantForm }) =>
      api
        .post<{ variant: Variant }>(`/products/${productId}/variants`, data)
        .then((r) => r.data.variant),
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
  const [form, setForm] = useState<CreateProductForm>(FORM_EMPTY)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

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

  // Variant sub-form helpers
  function addVariantRow() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { tamanho: '', cor: '', estoque: 0, estoqueMinimo: 0 }],
    }))
  }

  function updateVariantRow(index: number, field: keyof VariantRow, value: string | number) {
    setForm((f) => {
      const rows = [...f.variants]
      rows[index] = { ...rows[index], [field]: value }
      return { ...f, variants: rows }
    })
  }

  function removeVariantRow(index: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }))
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault()
    const clientErrors = validateForm(form)
    if (Object.keys(clientErrors).length) {
      setFormErrors(clientErrors)
      return
    }
    setFormErrors({})
    const body = {
      ...form,
      preco: parseInt(form.preco || '0') / 100,
      custo: parseInt(form.custo || '0') / 100,
      variants: form.variants.filter((v) => v.tamanho !== '' || v.cor !== ''),
    }
    createMutation.mutate(body, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        setForm(FORM_EMPTY)
        setFormErrors({})
      },
      onError: (err) => {
        setFormErrors(extractApiErrors(err))
      },
    })
  }

  function handleDeactivate(id: string) {
    deactivateMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
      },
    })
  }

  function handleActivate(id: string) {
    activateMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
      },
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
    editVariantMutation.mutate(
      {
        productId: editingVariant.productId,
        variantId: editingVariant.variantId,
        data: editingVariant.form,
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
      {/* Header */}
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
              onChange={(e) => {
                setFilterSearch(e.target.value)
              }}
              placeholder="Buscar por nome, SKU, tamanho ou cor..."
              style={{ ...inputStyle, flex: '1 1 240px', minWidth: '200px' }}
            />
            <select
              value={filterCategoria}
              onChange={(e) => {
                setFilterCategoria(e.target.value)
              }}
              style={{ ...inputStyle, flex: '0 0 160px', cursor: 'pointer' }}
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as 'all' | 'ativo' | 'inativo')
              }}
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
                <div
                  key={product.id}
                  style={{
                    background: 'var(--black2)',
                    border: '1px solid var(--black4)',
                    borderRadius: 'var(--radius)',
                    opacity: product.ativo ? 1 : 0.5,
                    overflow: 'hidden',
                  }}
                >
                  {/* Product card header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem 1rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setExpandedId(expandedId === product.id ? null : product.id)
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.9rem',
                            color: 'var(--white)',
                            fontWeight: 500,
                          }}
                        >
                          {product.nome}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.75rem',
                            color: 'var(--gray)',
                            marginTop: '0.2rem',
                          }}
                        >
                          {product.categoria} · {product.variants.length}{' '}
                          {product.variants.length === 1 ? 'variante' : 'variantes'}
                        </p>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--info)',
                          padding: '0.2rem 0.45rem',
                          background: 'var(--black3)',
                          borderRadius: '4px',
                          flexShrink: 0,
                        }}
                      >
                        {product.sku}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.85rem',
                            color: 'var(--white)',
                            fontWeight: 500,
                          }}
                        >
                          R$ {Number(product.preco).toFixed(2)}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            color: 'var(--gray)',
                            marginTop: '0.1rem',
                          }}
                        >
                          custo R$ {Number(product.custo).toFixed(2)}
                        </p>
                      </div>

                      {!product.ativo && (
                        <span
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--danger)',
                            padding: '0.2rem 0.45rem',
                            background: 'var(--black3)',
                            borderRadius: '4px',
                          }}
                        >
                          Inativo
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (editingProduct?.id === product.id) {
                            setEditingProduct(null)
                          } else {
                            openEditProduct(product)
                          }
                        }}
                        style={{
                          padding: '0.3rem 0.6rem',
                          background: 'transparent',
                          border: '1px solid var(--black4)',
                          borderRadius: 'var(--radius)',
                          color: editingProduct?.id === product.id ? 'var(--white)' : 'var(--gray)',
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        {editingProduct?.id === product.id ? 'Fechar' : 'Editar'}
                      </button>

                      {product.ativo ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeactivate(product.id)
                          }}
                          disabled={deactivateMutation.isPending}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: 'transparent',
                            border: '1px solid var(--danger)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--danger)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivate(product.id)
                          }}
                          disabled={activateMutation.isPending}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: 'transparent',
                            border: '1px solid var(--success)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--success)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Reativar
                        </button>
                      )}

                      <span
                        style={{
                          color: 'var(--gray)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8rem',
                        }}
                      >
                        {expandedId === product.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Inline product edit form */}
                  {editingProduct?.id === product.id && (
                    <form
                      onSubmit={handleUpdateProduct}
                      style={{
                        borderTop: '1px solid var(--black4)',
                        padding: '0.875rem 1rem',
                        background: 'var(--black3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}
                      >
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Nome</label>
                          <input
                            type="text"
                            value={editingProduct.form.nome}
                            onChange={(e) => {
                              setEditingProduct({
                                ...editingProduct,
                                form: { ...editingProduct.form, nome: e.target.value },
                              })
                            }}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.65rem' }}>SKU</label>
                          <input
                            type="text"
                            value={editingProduct.form.sku}
                            onChange={(e) => {
                              setEditingProduct({
                                ...editingProduct,
                                form: { ...editingProduct.form, sku: e.target.value.toUpperCase() },
                              })
                            }}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Categoria</label>
                          <input
                            type="text"
                            value={editingProduct.form.categoria}
                            onChange={(e) => {
                              setEditingProduct({
                                ...editingProduct,
                                form: { ...editingProduct.form, categoria: e.target.value },
                              })
                            }}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}
                        >
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Preço (R$)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatMoneyDisplay(editingProduct.form.preco)}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '')
                                setEditingProduct({
                                  ...editingProduct,
                                  form: { ...editingProduct.form, preco: digits },
                                })
                              }}
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Custo (R$)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatMoneyDisplay(editingProduct.form.custo)}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '')
                                setEditingProduct({
                                  ...editingProduct,
                                  form: { ...editingProduct.form, custo: digits },
                                })
                              }}
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="submit"
                          disabled={updateProductMutation.isPending}
                          style={{
                            padding: '0.5rem 1.25rem',
                            background: updateProductMutation.isPending
                              ? 'var(--gray2)'
                              : 'var(--white)',
                            color: 'var(--black)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.7rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: updateProductMutation.isPending ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {updateProductMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(null)
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            border: '1px solid var(--black4)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--gray)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Expanded variant rows */}
                  {expandedId === product.id && (
                    <div
                      style={{
                        borderTop: '1px solid var(--black4)',
                        padding: '0.75rem 1rem',
                        background: 'var(--black)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {product.variants.length === 0 && (
                          <p
                            style={{
                              color: 'var(--gray)',
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.8rem',
                            }}
                          >
                            Sem variantes.
                          </p>
                        )}
                        {product.variants.map((variant) => (
                          <div key={variant.id}>
                            {/* Variant row */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--black2)',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--black4)',
                                opacity: variant.ativo ? 1 : 0.5,
                              }}
                            >
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.8rem',
                                    color: 'var(--white)',
                                  }}
                                >
                                  {variant.tamanho || '—'} / {variant.cor || '—'}
                                </span>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.7rem',
                                    color: 'var(--gray)',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Estoque: {variant.estoque} / mín {variant.estoqueMinimo}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => {
                                    if (stockEntry?.variantId === variant.id) {
                                      setStockEntry(null)
                                    } else {
                                      setEditingVariant(null)
                                      setStockEntry({
                                        variantId: variant.id,
                                        productId: product.id,
                                        value: '',
                                      })
                                    }
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--black4)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--gray)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Estoque +
                                </button>
                                <button
                                  onClick={() => {
                                    if (editingVariant?.variantId === variant.id) {
                                      setEditingVariant(null)
                                    } else {
                                      setStockEntry(null)
                                      setEditingVariant({
                                        variantId: variant.id,
                                        productId: product.id,
                                        form: {
                                          tamanho: variant.tamanho,
                                          cor: variant.cor,
                                          estoqueMinimo: variant.estoqueMinimo,
                                        },
                                      })
                                    }
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--black4)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--gray)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </div>

                            {/* Inline stock entry */}
                            {stockEntry?.variantId === variant.id && (
                              <form
                                onSubmit={handleStockSubmit}
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  alignItems: 'center',
                                  padding: '0.5rem 0.75rem',
                                  background: 'var(--black3)',
                                  borderRadius: 'var(--radius)',
                                  border: '1px solid var(--black4)',
                                  marginTop: '0.25rem',
                                }}
                              >
                                <label
                                  style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}
                                >
                                  Qtd a adicionar
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={stockEntry.value}
                                  onChange={(e) => {
                                    setStockEntry({ ...stockEntry, value: e.target.value })
                                  }}
                                  required
                                  style={{ ...smallInputStyle, width: '100px' }}
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={stockMutation.isPending}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: 'var(--white)',
                                    color: 'var(--black)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {stockMutation.isPending ? '...' : 'Confirmar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStockEntry(null)
                                  }}
                                  style={{
                                    padding: '0.375rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--black4)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--gray)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ×
                                </button>
                              </form>
                            )}

                            {/* Inline variant edit */}
                            {editingVariant?.variantId === variant.id && (
                              <form
                                onSubmit={handleEditVariantSubmit}
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  alignItems: 'flex-end',
                                  flexWrap: 'wrap',
                                  padding: '0.5rem 0.75rem',
                                  background: 'var(--black3)',
                                  borderRadius: 'var(--radius)',
                                  border: '1px solid var(--black4)',
                                  marginTop: '0.25rem',
                                }}
                              >
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                    Tamanho
                                  </label>
                                  <input
                                    type="text"
                                    value={editingVariant.form.tamanho}
                                    onChange={(e) => {
                                      setEditingVariant({
                                        ...editingVariant,
                                        form: { ...editingVariant.form, tamanho: e.target.value },
                                      })
                                    }}
                                    style={{ ...smallInputStyle, width: '80px' }}
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                    Cor
                                  </label>
                                  <input
                                    type="text"
                                    value={editingVariant.form.cor}
                                    onChange={(e) => {
                                      setEditingVariant({
                                        ...editingVariant,
                                        form: { ...editingVariant.form, cor: e.target.value },
                                      })
                                    }}
                                    style={{ ...smallInputStyle, width: '100px' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                    Estoque mín.
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editingVariant.form.estoqueMinimo}
                                    onChange={(e) => {
                                      setEditingVariant({
                                        ...editingVariant,
                                        form: {
                                          ...editingVariant.form,
                                          estoqueMinimo:
                                            e.target.value === '' ? '' : Number(e.target.value),
                                        },
                                      })
                                    }}
                                    style={{ ...smallInputStyle, width: '80px' }}
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={editVariantMutation.isPending}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: 'var(--white)',
                                    color: 'var(--black)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    alignSelf: 'flex-end',
                                  }}
                                >
                                  {editVariantMutation.isPending ? '...' : 'Salvar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariant(null)
                                  }}
                                  style={{
                                    padding: '0.375rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--black4)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--gray)',
                                    fontFamily: 'var(--font-label)',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    alignSelf: 'flex-end',
                                  }}
                                >
                                  ×
                                </button>
                              </form>
                            )}
                          </div>
                        ))}

                        {/* Add variant button + inline form */}
                        <div>
                          {addingVariantTo !== product.id ? (
                            <button
                              onClick={() => {
                                setAddingVariantTo(product.id)
                                setNewVariantForm(NEW_VARIANT_EMPTY)
                              }}
                              style={{
                                padding: '0.3rem 0.75rem',
                                background: 'transparent',
                                border: '1px solid var(--black4)',
                                borderRadius: 'var(--radius)',
                                color: 'var(--gray)',
                                fontFamily: 'var(--font-label)',
                                fontSize: '0.65rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                marginTop: product.variants.length > 0 ? '0.25rem' : 0,
                              }}
                            >
                              + Variante
                            </button>
                          ) : (
                            <form
                              onSubmit={(e) => {
                                handleAddVariantSubmit(e, product.id)
                              }}
                              style={{
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-end',
                                flexWrap: 'wrap',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--black3)',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--black4)',
                                marginTop: '0.25rem',
                              }}
                            >
                              <div>
                                <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                  Tamanho *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newVariantForm.tamanho}
                                  onChange={(e) => {
                                    setNewVariantForm((f) => ({ ...f, tamanho: e.target.value }))
                                  }}
                                  style={{ ...smallInputStyle, width: '80px' }}
                                  autoFocus
                                  placeholder="M"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                  Cor *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newVariantForm.cor}
                                  onChange={(e) => {
                                    setNewVariantForm((f) => ({ ...f, cor: e.target.value }))
                                  }}
                                  style={{ ...smallInputStyle, width: '100px' }}
                                  placeholder="Azul"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                  Estq. inicial
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={newVariantForm.estoque}
                                  onChange={(e) => {
                                    setNewVariantForm((f) => ({
                                      ...f,
                                      estoque: e.target.value === '' ? '' : Number(e.target.value),
                                    }))
                                  }}
                                  style={{ ...smallInputStyle, width: '70px' }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>
                                  Mín.
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={newVariantForm.estoqueMinimo}
                                  onChange={(e) => {
                                    setNewVariantForm((f) => ({
                                      ...f,
                                      estoqueMinimo:
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    }))
                                  }}
                                  style={{ ...smallInputStyle, width: '60px' }}
                                  placeholder="0"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={addVariantMutation.isPending}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  background: 'var(--white)',
                                  color: 'var(--black)',
                                  fontFamily: 'var(--font-label)',
                                  fontSize: '0.65rem',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  border: 'none',
                                  borderRadius: 'var(--radius)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  alignSelf: 'flex-end',
                                }}
                              >
                                {addVariantMutation.isPending ? '...' : 'Adicionar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingVariantTo(null)
                                }}
                                style={{
                                  padding: '0.375rem 0.5rem',
                                  background: 'transparent',
                                  border: '1px solid var(--black4)',
                                  borderRadius: 'var(--radius)',
                                  color: 'var(--gray)',
                                  fontFamily: 'var(--font-label)',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-end',
                                }}
                              >
                                ×
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create product form */}
        <section
          style={{
            background: 'var(--black2)',
            border: '1px solid var(--black4)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.8rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
              marginBottom: '1.25rem',
            }}
          >
            Novo produto
          </h2>

          <form
            onSubmit={handleCreateProduct}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => {
                  setForm({ ...form, nome: e.target.value })
                  setFormErrors((fe) => ({ ...fe, nome: undefined }))
                }}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.nome ? 'var(--danger)' : undefined,
                }}
                placeholder="Nome do produto"
              />
              {formErrors.nome && (
                <p
                  style={{
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                    marginTop: '0.25rem',
                  }}
                >
                  {formErrors.nome}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => {
                  setForm({ ...form, sku: e.target.value.toUpperCase() })
                  setFormErrors((fe) => ({ ...fe, sku: undefined }))
                }}
                style={{ ...inputStyle, borderColor: formErrors.sku ? 'var(--danger)' : undefined }}
                placeholder="CAM-001"
              />
              {formErrors.sku && (
                <p
                  style={{
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                    marginTop: '0.25rem',
                  }}
                >
                  {formErrors.sku}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => {
                  setForm({ ...form, categoria: e.target.value })
                  setFormErrors((fe) => ({ ...fe, categoria: undefined }))
                }}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.categoria ? 'var(--danger)' : undefined,
                }}
                placeholder="Roupas"
              />
              {formErrors.categoria && (
                <p
                  style={{
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                    marginTop: '0.25rem',
                  }}
                >
                  {formErrors.categoria}
                </p>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Preço (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyDisplay(form.preco)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setForm((f) => ({ ...f, preco: digits }))
                    setFormErrors((fe) => ({ ...fe, preco: undefined }))
                  }}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.preco ? 'var(--danger)' : undefined,
                  }}
                  placeholder="0,00"
                />
                {formErrors.preco && (
                  <p
                    style={{
                      color: 'var(--danger)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-body)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formErrors.preco}
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Custo (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyDisplay(form.custo)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setForm((f) => ({ ...f, custo: digits }))
                    setFormErrors((fe) => ({ ...fe, custo: undefined }))
                  }}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.custo ? 'var(--danger)' : undefined,
                  }}
                  placeholder="0,00"
                />
                {formErrors.custo && (
                  <p
                    style={{
                      color: 'var(--danger)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-body)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formErrors.custo}
                  </p>
                )}
              </div>
            </div>

            {/* Variant sub-form */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>Variantes</label>
                <button
                  type="button"
                  onClick={addVariantRow}
                  style={{
                    padding: '0.25rem 0.625rem',
                    background: 'transparent',
                    border: '1px solid var(--black4)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--gray)',
                    fontFamily: 'var(--font-label)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  + Adicionar variante
                </button>
              </div>

              {form.variants.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {form.variants.map((row, idx) => (
                    <div key={idx}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 60px 60px auto',
                          gap: '0.375rem',
                          alignItems: 'end',
                          padding: '0.5rem',
                          background: 'var(--black3)',
                          borderRadius: 'var(--radius)',
                          border: `1px solid ${formErrors.variants?.[idx] ? 'var(--danger)' : 'var(--black4)'}`,
                        }}
                      >
                        <div>
                          <label
                            style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}
                          >
                            Tamanho
                          </label>
                          <input
                            type="text"
                            value={row.tamanho}
                            onChange={(e) => {
                              updateVariantRow(idx, 'tamanho', e.target.value)
                              setFormErrors((fe) => {
                                const v = { ...fe.variants }
                                delete v[idx]
                                return { ...fe, variants: v }
                              })
                            }}
                            style={smallInputStyle}
                            placeholder="M"
                          />
                        </div>
                        <div>
                          <label
                            style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}
                          >
                            Cor
                          </label>
                          <input
                            type="text"
                            value={row.cor}
                            onChange={(e) => {
                              updateVariantRow(idx, 'cor', e.target.value)
                              setFormErrors((fe) => {
                                const v = { ...fe.variants }
                                delete v[idx]
                                return { ...fe, variants: v }
                              })
                            }}
                            style={smallInputStyle}
                            placeholder="Azul"
                          />
                        </div>
                        <div>
                          <label
                            style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}
                          >
                            Estq.
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={row.estoque}
                            onChange={(e) => {
                              updateVariantRow(idx, 'estoque', Number(e.target.value))
                            }}
                            style={smallInputStyle}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label
                            style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}
                          >
                            Mín.
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={row.estoqueMinimo}
                            onChange={(e) => {
                              updateVariantRow(idx, 'estoqueMinimo', Number(e.target.value))
                            }}
                            style={smallInputStyle}
                            placeholder="0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeVariantRow(idx)
                          }}
                          style={{
                            padding: '0.375rem 0.5rem',
                            background: 'transparent',
                            border: '1px solid var(--black4)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--danger)',
                            fontFamily: 'var(--font-label)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            alignSelf: 'flex-end',
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {formErrors.variants?.[idx] && (
                        <p
                          style={{
                            color: 'var(--danger)',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-body)',
                            marginTop: '0.2rem',
                            paddingLeft: '0.25rem',
                          }}
                        >
                          {formErrors.variants[idx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                padding: '0.75rem',
                background: createMutation.isPending ? 'var(--gray2)' : 'var(--white)',
                color: 'var(--black)',
                fontFamily: 'var(--font-label)',
                fontSize: '0.8rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                borderRadius: 'var(--radius)',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                border: 'none',
              }}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar produto'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
