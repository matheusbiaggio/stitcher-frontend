import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--black)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--black2)',
        borderRight: '1px solid var(--black4)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{ padding: '0 1.5rem', marginBottom: '2rem', cursor: 'pointer' }}
        >
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.05em',
            color: 'var(--white)',
          }}>
            BONI STORE
          </span>
        </div>

        {/* Navegação */}
        <nav style={{ flex: 1, padding: '0 0.75rem' }}>
          {/* PDV — acessível por todos os usuários autenticados */}
          <NavLink
            to="/pdv"
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: isActive ? 'var(--white)' : 'var(--gray)',
              background: isActive ? 'var(--black3)' : 'transparent',
              transition: 'all var(--transition)',
              textDecoration: 'none',
              marginBottom: '0.25rem',
            })}
          >
            PDV
          </NavLink>

          {/* Clientes — acessível por todos os usuários autenticados */}
          <NavLink
            to="/clientes"
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: isActive ? 'var(--white)' : 'var(--gray)',
              background: isActive ? 'var(--black3)' : 'transparent',
              transition: 'all var(--transition)',
              textDecoration: 'none',
              marginBottom: '0.25rem',
            })}
          >
            Clientes
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink
                to="/vendas"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--white)' : 'var(--gray)',
                  background: isActive ? 'var(--black3)' : 'transparent',
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                  marginBottom: '0.25rem',
                })}
              >
                Vendas
              </NavLink>
              <NavLink
                to="/crediario"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--white)' : 'var(--gray)',
                  background: isActive ? 'var(--black3)' : 'transparent',
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                  marginBottom: '0.25rem',
                })}
              >
                Crediário
              </NavLink>
              <NavLink
                to="/produtos"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--white)' : 'var(--gray)',
                  background: isActive ? 'var(--black3)' : 'transparent',
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                  marginBottom: '0.25rem',
                })}
              >
                Produtos
              </NavLink>
              <NavLink
                to="/configuracoes"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--white)' : 'var(--gray)',
                  background: isActive ? 'var(--black3)' : 'transparent',
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                })}
              >
                Configurações
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer da sidebar — user info e logout */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--black4)',
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--white)',
              fontWeight: 500,
            }}>
              {user?.nome}
            </p>
            <p style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gray)',
              marginTop: '0.25rem',
            }}>
              {user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius)',
              color: 'var(--gray)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '2rem',
        background: 'var(--black)',
      }}>
        {children}
      </main>
    </div>
  )
}
