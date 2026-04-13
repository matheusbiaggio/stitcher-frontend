import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Variant {
  id: string
  tamanho: string
  cor: string
  estoque: number
  estoqueMinimo: number
  ativo: boolean
}

interface Product {
  id: string
  nome: string
  sku: string
  categoria: string
  preco: number
  custo: number
  unidade: string
  ativo: boolean
  variants: Variant[]
  createdAt: string
}

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
  preco: number | ''
  custo: number | ''
  unidade: string
  variants: VariantRow[]
}

interface EditVariantForm {
  tamanho: string
  cor: string
  estoqueMinimo: number | ''
}

const FORM_EMPTY: CreateProductForm = {
  nome: '',
  sku: '',
  categoria: '',
  preco: '',
  custo: '',
  unidade: 'un',
  variants: [],
}

function extractMessage(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro desconhecido'
}

const labelStyle = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '0.375rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const smallInputStyle = {
  ...inputStyle,
  padding: '0.375rem 0.5rem',
  fontSize: '0.8rem',
}

export function ProductsPage() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/products').then(r => r.data.products),
  })
  const products = data ?? []

  const createMutation = useMutation({
    mutationFn: (body: CreateProductForm) =>
      api.post<{ product: Product }>('/products', body).then(r => r.data.product),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/deactivate`),
  })

  const stockMutation = useMutation({
    mutationFn: ({ productId, variantId, quantidade }: { productId: string; variantId: string; quantidade: number }) =>
      api.patch(`/products/${productId}/variants/${variantId}/stock`, { quantidade }),
  })

  const editVariantMutation = useMutation({
    mutationFn: ({ productId, variantId, data }: { productId: string; variantId: string; data: EditVariantForm }) =>
      api.put<{ variant: Variant }>(`/products/${productId}/variants/${variantId}`, data).then(r => r.data.variant),
  })

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stockEntry, setStockEntry] = useState<{ variantId: string; productId: string; value: string } | null>(null)
  const [editingVariant, setEditingVariant] = useState<{ variantId: string; productId: string; form: EditVariantForm } | null>(null)
  const [form, setForm] = useState<CreateProductForm>(FORM_EMPTY)
  const [formError, setFormError] = useState('')

  // Variant sub-form helpers
  function addVariantRow() {
    setForm(f => ({ ...f, variants: [...f.variants, { tamanho: '', cor: '', estoque: 0, estoqueMinimo: 0 }] }))
  }

  function updateVariantRow(index: number, field: keyof VariantRow, value: string | number) {
    setForm(f => {
      const rows = [...f.variants]
      rows[index] = { ...rows[index], [field]: value }
      return { ...f, variants: rows }
    })
  }

  function removeVariantRow(index: number) {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }))
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const body = {
      ...form,
      preco: form.preco === '' ? 0 : Number(form.preco),
      custo: form.custo === '' ? 0 : Number(form.custo),
      variants: form.variants.filter(v => v.tamanho !== '' || v.cor !== ''),
    }
    createMutation.mutate(body, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        setForm(FORM_EMPTY)
        setFormError('')
      },
      onError: (err) => {
        setFormError(extractMessage(err))
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
      }
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
      }
    )
  }

  return (
    <div>
      {/* Header */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        letterSpacing: '0.05em',
        marginBottom: '2rem',
        color: 'var(--white)',
      }}>
        PRODUTOS
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Product list */}
        <section>
          <h2 style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: '1rem',
          }}>
            Catálogo de produtos
          </h2>

          {isPending ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Nenhum produto cadastrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {products.map((product) => (
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
                    onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--white)', fontWeight: 500 }}>
                          {product.nome}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--gray)', marginTop: '0.2rem' }}>
                          {product.categoria} · {product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}
                        </p>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--info)',
                        padding: '0.2rem 0.45rem',
                        background: 'var(--black3)',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}>
                        {product.sku}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        color: 'var(--white)',
                        fontWeight: 500,
                      }}>
                        R$ {Number(product.preco).toFixed(2)}
                      </span>

                      {!product.ativo && (
                        <span style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--danger)',
                          padding: '0.2rem 0.45rem',
                          background: 'var(--black3)',
                          borderRadius: '4px',
                        }}>
                          Inativo
                        </span>
                      )}

                      {product.ativo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeactivate(product.id) }}
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
                      )}

                      <span style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
                        {expandedId === product.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded variant rows */}
                  {expandedId === product.id && (
                    <div style={{
                      borderTop: '1px solid var(--black4)',
                      padding: '0.75rem 1rem',
                      background: 'var(--black)',
                    }}>
                      {product.variants.length === 0 ? (
                        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>Sem variantes.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {product.variants.map((variant) => (
                            <div key={variant.id}>
                              {/* Variant row */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--black2)',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--black4)',
                                opacity: variant.ativo ? 1 : 0.5,
                              }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--white)' }}>
                                    {variant.tamanho || '—'} / {variant.cor || '—'}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', color: 'var(--gray)', letterSpacing: '0.05em' }}>
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
                                        setStockEntry({ variantId: variant.id, productId: product.id, value: '' })
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
                                  <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Qtd a adicionar</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={stockEntry.value}
                                    onChange={(e) => setStockEntry({ ...stockEntry, value: e.target.value })}
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
                                    onClick={() => setStockEntry(null)}
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
                                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Tamanho</label>
                                    <input
                                      type="text"
                                      value={editingVariant.form.tamanho}
                                      onChange={(e) => setEditingVariant({
                                        ...editingVariant,
                                        form: { ...editingVariant.form, tamanho: e.target.value },
                                      })}
                                      style={{ ...smallInputStyle, width: '80px' }}
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Cor</label>
                                    <input
                                      type="text"
                                      value={editingVariant.form.cor}
                                      onChange={(e) => setEditingVariant({
                                        ...editingVariant,
                                        form: { ...editingVariant.form, cor: e.target.value },
                                      })}
                                      style={{ ...smallInputStyle, width: '100px' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Estoque mín.</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={editingVariant.form.estoqueMinimo}
                                      onChange={(e) => setEditingVariant({
                                        ...editingVariant,
                                        form: { ...editingVariant.form, estoqueMinimo: e.target.value === '' ? '' : Number(e.target.value) },
                                      })}
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
                                    onClick={() => setEditingVariant(null)}
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create product form */}
        <section style={{
          background: 'var(--black2)',
          border: '1px solid var(--black4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: '1.25rem',
          }}>
            Novo produto
          </h2>

          <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                style={inputStyle}
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <label style={labelStyle}>SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
                style={inputStyle}
                placeholder="CAM-001"
              />
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                required
                style={inputStyle}
                placeholder="Roupas"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value === '' ? '' : Number(e.target.value) })}
                  required
                  style={inputStyle}
                  placeholder="49.90"
                />
              </div>
              <div>
                <label style={labelStyle}>Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.custo}
                  onChange={(e) => setForm({ ...form, custo: e.target.value === '' ? '' : Number(e.target.value) })}
                  style={inputStyle}
                  placeholder="20.00"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Unidade</label>
              <input
                type="text"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                style={inputStyle}
                placeholder="un"
              />
            </div>

            {/* Variant sub-form */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 60px 60px auto',
                        gap: '0.375rem',
                        alignItems: 'end',
                        padding: '0.5rem',
                        background: 'var(--black3)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--black4)',
                      }}
                    >
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Tamanho</label>
                        <input
                          type="text"
                          value={row.tamanho}
                          onChange={(e) => updateVariantRow(idx, 'tamanho', e.target.value)}
                          style={smallInputStyle}
                          placeholder="M"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Cor</label>
                        <input
                          type="text"
                          value={row.cor}
                          onChange={(e) => updateVariantRow(idx, 'cor', e.target.value)}
                          style={smallInputStyle}
                          placeholder="Azul"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Estq.</label>
                        <input
                          type="number"
                          min={0}
                          value={row.estoque}
                          onChange={(e) => updateVariantRow(idx, 'estoque', Number(e.target.value))}
                          style={smallInputStyle}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Mín.</label>
                        <input
                          type="number"
                          min={0}
                          value={row.estoqueMinimo}
                          onChange={(e) => updateVariantRow(idx, 'estoqueMinimo', Number(e.target.value))}
                          style={smallInputStyle}
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariantRow(idx)}
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
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
                {formError}
              </p>
            )}

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
