import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, useAuthActions } from '../contexts/AuthContext'

export function LoginPage() {
  const { user } = useAuth()
  const { login } = useAuthActions()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redireciona se já autenticado
  if (user) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      // Mensagem genérica — não revela qual campo está errado
      setError('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--black)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--black2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--black4)',
          padding: '2.5rem',
        }}
      >
        {/* Logo / Titulo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              letterSpacing: '0.05em',
              color: 'var(--white)',
              lineHeight: 1,
            }}
          >
            BONI STORE
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              color: 'var(--gray)',
              textTransform: 'uppercase',
              marginTop: '0.5rem',
            }}
          >
            PDV — Ponto de Venda
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-label)',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--gray)',
                marginBottom: '0.5rem',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--black3)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--black4)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--white)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-label)',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--gray)',
                marginBottom: '0.5rem',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--black3)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--black4)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--white)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
            />
          </div>

          {/* Erro inline — generico, nao revela qual campo */}
          {error && (
            <p
              style={{
                color: 'var(--danger)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-body)',
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '0.875rem',
              background:
                loading || !email.trim() || !password.trim() ? 'var(--gray2)' : 'var(--white)',
              color: 'var(--black)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderRadius: 'var(--radius)',
              cursor: loading || !email.trim() || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'background var(--transition)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid var(--gray)',
                    borderTopColor: 'var(--white)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>

      {/* CSS para spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
