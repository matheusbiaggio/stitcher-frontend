import { type ProductResponse } from '@bonistore/shared'
import { type ProductVariant, formatMoney } from '../../utils/cart'
import { sectionHeader, card, input, badge } from '../../styles/ui'

interface ProductCatalogProps {
  products: ProductResponse[]
  loading: boolean
  searchInput: string
  onSearchChange: (value: string) => void
  onAddToCart: (variant: ProductVariant, product: ProductResponse) => void
}

export function ProductCatalog({
  products,
  loading,
  searchInput,
  onSearchChange,
  onAddToCart,
}: ProductCatalogProps) {
  const q = searchInput.trim().toLowerCase()

  return (
    <section>
      <h2 style={sectionHeader}>Catálogo</h2>
      <input
        type="text"
        placeholder="Filtrar por nome, SKU, tamanho ou cor..."
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ ...input, marginBottom: '1rem' }}
        autoFocus
      />

      {loading ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
          Carregando catálogo...
        </p>
      ) : products.length === 0 ? (
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
          {q.length > 0
            ? `Nenhum produto encontrado para "${searchInput}"`
            : 'Nenhum produto cadastrado.'}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.625rem',
          }}
        >
          {products.map((product) => {
            const availableVariants = product.variants.filter((v) => v.estoque > 0)
            const outOfStock = availableVariants.length === 0
            return (
              <div
                key={product.id}
                style={{
                  ...card,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  opacity: outOfStock ? 0.4 : 1,
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--white)',
                      fontWeight: 500,
                      marginBottom: '0.3rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {product.nome}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={badge('info')}>{product.sku}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.7rem',
                        color: 'var(--success)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {formatMoney(product.preco)}
                    </span>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto' }}
                >
                  {outOfStock ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.6rem',
                        color: 'var(--gray)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      SEM ESTOQUE
                    </span>
                  ) : (
                    availableVariants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => onAddToCart(variant, product)}
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
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--white)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--black4)')}
                      >
                        {variant.tamanho && `${variant.tamanho} `}
                        {variant.cor}
                        <span style={{ color: 'var(--gray)', marginLeft: '0.25rem' }}>
                          ({variant.estoque})
                        </span>
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
  )
}
