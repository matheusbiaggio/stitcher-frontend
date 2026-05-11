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
 * Painel pra configurar a meta de receita mensal. Singleton — backend
 * sempre tem 1 row (upsert no boot da primeira leitura). Admin only.
 *
 * Input mascarado: usuário só digita números, formatamos como R$ X.XXX,XX
 * (centavos guardados em string pra evitar imprecisão de float durante a
 * edição). No submit, dividimos por 100 e enviamos como number.
 */
export function StoreSettingsSection() {
  const queryClient = useQueryClient()
  const [centavos, setCentavos] = useState('0')
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
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: async (metaReceitaMensal: number) => {
      const body = updateStoreSettingsSchema.parse({ metaReceitaMensal })
      const res = await api.patch<{ settings: StoreSettings }>('/settings', body)
      return storeSettingsSchema.parse(res.data.settings)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['store-settings'], data)
      // Invalida o dashboard pra refletir a nova meta imediatamente.
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
    mutation.mutate(value)
  }

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
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <label
            htmlFor="meta-receita-mensal"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
            }}
          >
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
              style={{
                flex: 1,
                maxWidth: 220,
                padding: '0.5rem 0.75rem',
                background: 'var(--black3)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--black4)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--white)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
              }}
            />
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

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{error}</p>
          )}

          <p style={{ color: 'var(--gray)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
            Usada nos cards e gráfico mensal do Dashboard. Use 0 pra ocultar a meta.
          </p>
        </form>
      )}
    </section>
  )
}
