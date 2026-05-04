import { FormEvent } from 'react'
import { type ProductResponse } from '@bonistore/shared'
import { label as labelStyle, input as inputStyle, inputSmall as smallInputStyle } from '../../styles/ui'

type Product = ProductResponse

export interface EditVariantForm {
  tamanho: string
  cor: string
  /**
   * Estoque atual em valor absoluto. Substitui o valor existente ao salvar
   * — pra entradas de mercadoria do dia-a-dia (incremento), use o botão
   * "Estoque +" que tem fluxo dedicado.
   */
  estoque: number | ''
  estoqueMinimo: number | ''
}

export interface EditProductForm {
  nome: string
  sku: string
  categoria: string
  preco: string
  custo: string
}

export interface NewVariantForm {
  tamanho: string
  cor: string
  estoque: number | ''
  estoqueMinimo: number | ''
}

export const NEW_VARIANT_EMPTY: NewVariantForm = {
  tamanho: '',
  cor: '',
  estoque: 0,
  estoqueMinimo: 0,
}

function formatMoneyDisplay(digits: string): string {
  const n = parseInt(digits || '0', 10)
  const reais = Math.floor(n / 100)
  const centavos = n % 100
  return `${reais},${String(centavos).padStart(2, '0')}`
}

interface ProductCardProps {
  product: Product
  expanded: boolean
  onToggleExpand: () => void
  stockEntry: { variantId: string; productId: string; value: string } | null
  onStockEntryChange: (entry: { variantId: string; productId: string; value: string } | null) => void
  onStockSubmit: (e: FormEvent) => void
  stockMutation: { isPending: boolean }
  editingVariant: { variantId: string; productId: string; form: EditVariantForm } | null
  onEditingVariantChange: (ev: { variantId: string; productId: string; form: EditVariantForm } | null) => void
  onEditVariantSubmit: (e: FormEvent) => void
  editVariantMutation: { isPending: boolean }
  editingProduct: { id: string; form: EditProductForm } | null
  onEditingProductChange: (ep: { id: string; form: EditProductForm } | null) => void
  onToggleEditProduct: (product: Product) => void
  onUpdateProduct: (e: React.FormEvent) => void
  updateProductMutation: { isPending: boolean }
  addingVariantTo: string | null
  onAddingVariantToChange: (id: string | null) => void
  newVariantForm: NewVariantForm
  onNewVariantFormChange: (f: NewVariantForm) => void
  onAddVariantSubmit: (e: FormEvent, productId: string) => void
  addVariantMutation: { isPending: boolean }
  onDeactivate: (id: string) => void
  onActivate: (id: string) => void
  deactivateMutation: { isPending: boolean }
  activateMutation: { isPending: boolean }
}

export function ProductCard({
  product,
  expanded,
  onToggleExpand,
  stockEntry,
  onStockEntryChange,
  onStockSubmit,
  stockMutation,
  editingVariant,
  onEditingVariantChange,
  onEditVariantSubmit,
  editVariantMutation,
  editingProduct,
  onEditingProductChange,
  onToggleEditProduct,
  onUpdateProduct,
  updateProductMutation,
  addingVariantTo,
  onAddingVariantToChange,
  newVariantForm,
  onNewVariantFormChange,
  onAddVariantSubmit,
  addVariantMutation,
  onDeactivate,
  onActivate,
  deactivateMutation,
  activateMutation,
}: ProductCardProps) {
  return (
    <div
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
        onClick={onToggleExpand}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
              onToggleEditProduct(product)
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
                onDeactivate(product.id)
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
                onActivate(product.id)
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

          <span style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Inline product edit form */}
      {editingProduct?.id === product.id && (
        <form
          onSubmit={onUpdateProduct}
          style={{
            borderTop: '1px solid var(--black4)',
            padding: '0.875rem 1rem',
            background: 'var(--black3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Nome</label>
              <input
                type="text"
                value={editingProduct.form.nome}
                onChange={(e) => {
                  onEditingProductChange({
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
                  onEditingProductChange({
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
                  onEditingProductChange({
                    ...editingProduct,
                    form: { ...editingProduct.form, categoria: e.target.value },
                  })
                }}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Preço (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyDisplay(editingProduct.form.preco)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    onEditingProductChange({
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
                    onEditingProductChange({
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
                background: updateProductMutation.isPending ? 'var(--gray2)' : 'var(--white)',
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
              onClick={() => { onEditingProductChange(null) }}
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

      {/* Expanded variant rows — scroll container limita a ~5-6 variantes
          visíveis. Lista reordenada pra mostrar as mais novas primeiro,
          então a recém-adicionada fica logo embaixo do header sticky.
          Quem quiser ver as antigas rola pra baixo. */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--black4)',
            background: 'var(--black)',
            maxHeight: '420px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Sticky dentro do scroll container — gruda no topo enquanto
                a lista rola. */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--black)',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--black4)',
                zIndex: 2,
              }}
            >
              {addingVariantTo !== product.id ? (
                <button
                  data-testid={`add-variant-button-${product.id}`}
                  onClick={() => {
                    onAddingVariantToChange(product.id)
                    onNewVariantFormChange(NEW_VARIANT_EMPTY)
                  }}
                  title="Atalho: tecle N (com o produto expandido)"
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
                  }}
                >
                  + Variante <span style={{ opacity: 0.5, marginLeft: '0.4rem' }}>(N)</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    onAddVariantSubmit(e, product.id)
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
                  }}
                >
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Tamanho *</label>
                    <input
                      type="text"
                      required
                      value={newVariantForm.tamanho}
                      onChange={(e) => {
                        onNewVariantFormChange({ ...newVariantForm, tamanho: e.target.value })
                      }}
                      style={{ ...smallInputStyle, width: '80px' }}
                      autoFocus
                      placeholder="M"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Cor *</label>
                    <input
                      type="text"
                      required
                      value={newVariantForm.cor}
                      onChange={(e) => {
                        onNewVariantFormChange({ ...newVariantForm, cor: e.target.value })
                      }}
                      style={{ ...smallInputStyle, width: '100px' }}
                      placeholder="Azul"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Estq. inicial</label>
                    <input
                      type="number"
                      min={0}
                      value={newVariantForm.estoque}
                      onChange={(e) => {
                        onNewVariantFormChange({
                          ...newVariantForm,
                          estoque: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }}
                      style={{ ...smallInputStyle, width: '70px' }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Mín.</label>
                    <input
                      type="number"
                      min={0}
                      value={newVariantForm.estoqueMinimo}
                      onChange={(e) => {
                        onNewVariantFormChange({
                          ...newVariantForm,
                          estoqueMinimo: e.target.value === '' ? '' : Number(e.target.value),
                        })
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
                      onAddingVariantToChange(null)
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

            {/* Lista de variantes */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
              }}
            >
            {product.variants.length === 0 && (
              <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
                Sem variantes.
              </p>
            )}
            {/* Renderiza em ordem reversa (createdAt desc): a recém-adicionada
                aparece primeiro logo abaixo do header sticky. Slice antes do
                reverse pra não mutar o array original do react-query cache. */}
            {[...product.variants].reverse().map((variant) => (
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
                          onStockEntryChange(null)
                        } else {
                          onEditingVariantChange(null)
                          onStockEntryChange({ variantId: variant.id, productId: product.id, value: '' })
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
                          onEditingVariantChange(null)
                        } else {
                          onStockEntryChange(null)
                          onEditingVariantChange({
                            variantId: variant.id,
                            productId: product.id,
                            form: {
                              tamanho: variant.tamanho,
                              cor: variant.cor,
                              estoque: variant.estoque,
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
                    onSubmit={onStockSubmit}
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
                    <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>
                      Qtd a adicionar
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={stockEntry.value}
                      onChange={(e) => { onStockEntryChange({ ...stockEntry, value: e.target.value }) }}
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
                      onClick={() => { onStockEntryChange(null) }}
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
                    onSubmit={onEditVariantSubmit}
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
                        onChange={(e) => {
                          onEditingVariantChange({
                            ...editingVariant,
                            form: { ...editingVariant.form, tamanho: e.target.value },
                          })
                        }}
                        style={{ ...smallInputStyle, width: '80px' }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Cor</label>
                      <input
                        type="text"
                        value={editingVariant.form.cor}
                        onChange={(e) => {
                          onEditingVariantChange({
                            ...editingVariant,
                            form: { ...editingVariant.form, cor: e.target.value },
                          })
                        }}
                        style={{ ...smallInputStyle, width: '100px' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Estoque atual</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={editingVariant.form.estoque}
                        onChange={(e) => {
                          onEditingVariantChange({
                            ...editingVariant,
                            form: {
                              ...editingVariant.form,
                              estoque:
                                e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))),
                            },
                          })
                        }}
                        style={{ ...smallInputStyle, width: '90px' }}
                        title="Substitui o valor atual. Para entrada de mercadoria, use Estoque +."
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Estoque mín.</label>
                      <input
                        type="number"
                        min={0}
                        value={editingVariant.form.estoqueMinimo}
                        onChange={(e) => {
                          onEditingVariantChange({
                            ...editingVariant,
                            form: {
                              ...editingVariant.form,
                              estoqueMinimo: e.target.value === '' ? '' : Number(e.target.value),
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
                      onClick={() => { onEditingVariantChange(null) }}
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
          </div>
        </div>
      )}
    </div>
  )
}
