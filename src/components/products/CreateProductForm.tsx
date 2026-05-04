import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, FormEvent } from 'react'
import { productResponseSchema } from '@bonistore/shared'

import { api } from '../../lib/api'
import {
  label as labelStyle,
  input as inputStyle,
  inputSmall as smallInputStyle,
} from '../../styles/ui'

interface VariantRow {
  tamanho: string
  cor: string
  estoque: number
  estoqueMinimo: number
}

interface ProductFormValues {
  nome: string
  sku: string
  categoria: string
  preco: string
  custo: string
  variants: VariantRow[]
}

interface FormErrors {
  nome?: string
  sku?: string
  categoria?: string
  preco?: string
  custo?: string
  variants?: Record<number, string>
}

const FORM_EMPTY: ProductFormValues = {
  nome: '',
  sku: '',
  categoria: '',
  preco: '',
  custo: '',
  variants: [],
}

function formatMoneyDisplay(digits: string): string {
  const n = parseInt(digits || '0', 10)
  const reais = Math.floor(n / 100)
  const centavos = n % 100
  return `${reais},${String(centavos).padStart(2, '0')}`
}

function validateForm(form: ProductFormValues): FormErrors {
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

function extractApiErrors(err: unknown): FormErrors {
  const data = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data
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

export function CreateProductForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProductFormValues>(FORM_EMPTY)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const createMutation = useMutation({
    mutationFn: (body: Omit<ProductFormValues, 'preco' | 'custo'> & { preco: number; custo: number }) =>
      api.post<{ product: unknown }>('/products', body).then((r) => productResponseSchema.parse(r.data.product)),
  })

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

  return (
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
            style={{ ...inputStyle, borderColor: formErrors.nome ? 'var(--danger)' : undefined }}
            placeholder="Nome do produto"
          />
          {formErrors.nome && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.25rem' }}>
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
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.25rem' }}>
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
            style={{ ...inputStyle, borderColor: formErrors.categoria ? 'var(--danger)' : undefined }}
            placeholder="Roupas"
          />
          {formErrors.categoria && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.25rem' }}>
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
              style={{ ...inputStyle, borderColor: formErrors.preco ? 'var(--danger)' : undefined }}
              placeholder="0,00"
            />
            {formErrors.preco && (
              <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.25rem' }}>
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
              style={{ ...inputStyle, borderColor: formErrors.custo ? 'var(--danger)' : undefined }}
              placeholder="0,00"
            />
            {formErrors.custo && (
              <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.25rem' }}>
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
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Variantes{form.variants.length > 0 ? ` (${form.variants.length})` : ''}
            </label>
            <button
              type="button"
              data-testid="create-product-add-variant-button"
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
            // Scroll interno limita a ~5-6 variantes visíveis. Lista renderizada
            // em ordem reversa pra mostrar a recém-adicionada no topo,
            // facilitando preencher sem rolar até o fim.
            <div
              className="thin-scroll"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '380px',
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {form.variants
                .map((row, idx) => ({ row, idx }))
                .reverse()
                .map(({ row, idx }) => (
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
                      <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Tamanho</label>
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
                      <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Cor</label>
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
                      <label style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '0.2rem' }}>Estq.</label>
                      <input
                        type="number"
                        min={0}
                        value={row.estoque}
                        onChange={(e) => { updateVariantRow(idx, 'estoque', Number(e.target.value)) }}
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
                        onChange={(e) => { updateVariantRow(idx, 'estoqueMinimo', Number(e.target.value)) }}
                        style={smallInputStyle}
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { removeVariantRow(idx) }}
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
  )
}
