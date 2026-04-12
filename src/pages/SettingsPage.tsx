import { useState, useEffect, FormEvent } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  nome: string
  email: string
  role: 'admin' | 'caixa'
  telefone: string
  ativo: boolean
  createdAt: string
}

interface NewUserForm {
  nome: string
  email: string
  senha: string
  role: 'admin' | 'caixa'
  telefone: string
}

const FORM_EMPTY: NewUserForm = {
  nome: '',
  email: '',
  senha: '',
  role: 'caixa',
  telefone: '',
}

export function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<NewUserForm>(FORM_EMPTY)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await api.get<{ users: User[] }>('/users')
      setUsers(res.data.users)
    } catch {
      // erro tratado silenciosamente — interceptor cuida de 401
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const res = await api.post<{ user: User }>('/users', {
        ...form,
        ativo: true,
      })
      setUsers((prev) => [...prev, res.data.user].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm(FORM_EMPTY)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao criar usuário')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeactivate(userId: string) {
    setDeactivatingId(userId)
    try {
      await api.patch(`/users/${userId}/deactivate`)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ativo: false } : u))
      )
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? 'Erro ao desativar usuário')
    } finally {
      setDeactivatingId(null)
    }
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
  }

  return (
    <div>
      {/* Header */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        letterSpacing: '0.05em',
        marginBottom: '2rem',
      }}>
        CONFIGURAÇÕES
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Lista de usuários */}
        <section>
          <h2 style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: '1rem',
          }}>
            Usuários do sistema
          </h2>

          {loading ? (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    background: 'var(--black2)',
                    border: '1px solid var(--black4)',
                    borderRadius: 'var(--radius)',
                    opacity: user.ativo ? 1 : 0.5,
                  }}
                >
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--white)' }}>
                      {user.nome}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>
                      {user.email}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: user.role === 'admin' ? 'var(--info)' : 'var(--gray)',
                      padding: '0.25rem 0.5rem',
                      background: 'var(--black3)',
                      borderRadius: '4px',
                    }}>
                      {user.role}
                    </span>
                    {user.ativo ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        disabled={deactivatingId === user.id}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: 'transparent',
                          border: '1px solid var(--danger)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--danger)',
                          fontFamily: 'var(--font-label)',
                          fontSize: '0.7rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: deactivatingId === user.id ? 'not-allowed' : 'pointer',
                          opacity: deactivatingId === user.id ? 0.5 : 1,
                        }}
                      >
                        {deactivatingId === user.id ? '...' : 'Desativar'}
                      </button>
                    ) : (
                      <span style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '0.7rem',
                        color: 'var(--gray2)',
                        letterSpacing: '0.05em',
                      }}>
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Formulário de criação */}
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
            Novo usuário
          </h2>

          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                style={inputStyle}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={inputStyle}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Senha inicial</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required
                minLength={6}
                style={inputStyle}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                required
                style={inputStyle}
                placeholder="11999999999"
              />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'caixa' })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="caixa">Caixa (operador)</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {formError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={formLoading}
              style={{
                padding: '0.75rem',
                background: formLoading ? 'var(--gray2)' : 'var(--white)',
                color: 'var(--black)',
                fontFamily: 'var(--font-label)',
                fontSize: '0.8rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                borderRadius: 'var(--radius)',
                cursor: formLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                border: 'none',
              }}
            >
              {formLoading ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
