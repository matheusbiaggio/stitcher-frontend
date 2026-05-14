import {
  type StoreSettings,
  storeSettingsSchema,
  updateStoreSettingsSchema,
} from '@bonistore/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'

import { api } from '../../lib/api'

function formatMoneyDisplay(centavos: string): string {
  const n = parseInt(centavos || '0', 10)
  const reais = Math.floor(n / 100)
  const cent = n % 100
  return reais.toLocaleString('pt-BR') + ',' + String(cent).padStart(2, '0')
}

function centavosFromBRL(value: number): string {
  return String(Math.round(value * 100))
}

/**
 * Painel pra configurar a loja. Hoje cobre:
 *   - Meta de receita mensal (M010): R$, mascarado em centavos
 *   - Prefixo SKU (M012): letras/dígitos maiúsculos, 1-10 chars; quando
 *     setado, o form de novo produto auto-preenche o SKU com o prefixo +
 *     próxima sequência.
 *
 * Singleton — backend sempre tem 1 row (upsert no boot da primeira leitura).
 * Admin only.
 */
export function StoreSettingsSection() {
  const queryClient = useQueryClient()
  const [centavos, setCentavos] = useState('0')
  const [skuPrefix, setSkuPrefix] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const query = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await api.get<{ settings: StoreSettings }>('/settings')
      return storeSettingsSchema.parse(res.data.settings)
    },
  })

  // Sincroniza state local com valor carregado.
  useEffect(() => {
    if (query.data) {
      setCentavos(centavosFromBRL(query.data.metaReceitaMensal))
      setSkuPrefix(query.data.skuPrefix ?? '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: async (input: { metaReceitaMensal: number; skuPrefix: string }) => {
      // Backend trata '' como "desligar" e normaliza pra null.
      const body = updateStoreSettingsSchema.parse({
        metaReceitaMensal: input.metaReceitaMensal,
        skuPrefix: input.skuPrefix,
      })
      const res = await api.patch<{ settings: StoreSettings }>('/settings', body)
      return storeSettingsSchema.parse(res.data.settings)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['store-settings'], data)
      // Invalida o dashboard (meta) e o next-sku (prefix) pra refletir mudanças.
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['next-sku'] })
      setError(null)
      setSavedFlash(true)
      setTimeout(() => {
        setSavedFlash(false)
      }, 2200)
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { message?: string } } }).response?.data
      setError(data?.message ?? 'Não foi possível salvar.')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = parseInt(centavos || '0', 10) / 100
    if (Number.isNaN(value) || value < 0) {
      setError('Valor inválido')
      return
    }
    // Valida o prefixo client-side: se não vazio, deve casar com o regex
    // do shared schema (1-10 chars uppercase alphanumeric).
    if (skuPrefix !== '' && !/^[A-Z0-9]{1,10}$/.test(skuPrefix)) {
      setError('Prefixo SKU: 1-10 caracteres maiúsculos ou dígitos')
      return
    }
    mutation.mutate({ metaReceitaMensal: value, skuPrefix })
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--gray)',
  }
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    flex: 1,
    maxWidth: 220,
    padding: '0.5rem 0.75rem',
    background: 'var(--black3)',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--black4)'}`,
    borderRadius: 'var(--radius)',
    color: 'var(--white)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
  })

  return (
    <section
      data-testid="store-settings-section"
      style={{
        background: 'var(--black2)',
        border: '1px solid var(--black4)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
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
        Loja
      </h2>

      {query.isPending && (
        <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Carregando...</p>
      )}

      {query.isError && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
          Não foi possível carregar as configurações.
        </p>
      )}

      {query.isSuccess && (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="meta-receita-mensal" style={labelStyle}>
              Meta de receita mensal
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>R$</span>
              <input
                id="meta-receita-mensal"
                data-testid="meta-receita-input"
                type="text"
                inputMode="numeric"
                value={formatMoneyDisplay(centavos)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setCentavos(digits)
                  setError(null)
                }}
                style={inputStyle(error?.includes('Valor') ?? false)}
              />
            </div>
            <p style={{ color: 'var(--gray)', fontSize: '0.72rem' }}>
              Usada nos cards e gráfico mensal do Dashboard. Use 0 pra ocultar a meta.
            </p>
          </div>

          {/* SKU Prefix (M012) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="sku-prefix" style={labelStyle}>
              Prefixo SKU (auto-preenchimento)
            </label>
            <input
              id="sku-prefix"
              data-testid="sku-prefix-input"
              type="text"
              value={skuPrefix}
              onChange={(e) => {
                // Força maiúsculas e remove inválidos enquanto digita.
                const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                setSkuPrefix(cleaned)
                setError(null)
              }}
              placeholder="Ex: BS"
              style={inputStyle(error?.includes('Prefixo') ?? false)}
            />
            <p style={{ color: 'var(--gray)', fontSize: '0.72rem' }}>
              Quando preenchido, o SKU de produtos novos vira{' '}
              <code>{skuPrefix || 'BS'}</code>
              <code>073</code> (prefixo + sequência) automaticamente. Deixe vazio pra desligar.
            </p>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="submit"
              data-testid="store-settings-save"
              disabled={mutation.isPending}
              style={{
                padding: '0.5rem 1rem',
                background: mutation.isPending ? 'var(--gray2)' : 'var(--white)',
                color: 'var(--black)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-label)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {savedFlash && (
              <span
                data-testid="store-settings-saved-flash"
                style={{ color: 'var(--success)', fontSize: '0.8rem' }}
              >
                ✓ Salvo
              </span>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{error}</p>}
        </form>
      )}
    </section>
  )
}
