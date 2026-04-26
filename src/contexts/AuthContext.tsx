import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { type DashboardLayout, type Role } from '@bonistore/shared'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  nome: string
  role: Role
  dashboardLayout: DashboardLayout | null
}

interface AuthState {
  user: User | null
  loading: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setDashboardLayout: (layout: DashboardLayout) => void
}

const AuthStateContext = createContext<AuthState | null>(null)
const AuthActionsContext = createContext<AuthActions | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setUser(null)
  }, [])

  const setDashboardLayout = useCallback((layout: DashboardLayout) => {
    setUser((prev) => (prev ? { ...prev, dashboardLayout: layout } : prev))
  }, [])

  return (
    <AuthStateContext.Provider value={{ user, loading }}>
      <AuthActionsContext.Provider value={{ login, logout, setDashboardLayout }}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthStateContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function useAuthActions(): AuthActions {
  const ctx = useContext(AuthActionsContext)
  if (!ctx) throw new Error('useAuthActions deve ser usado dentro de AuthProvider')
  return ctx
}
