import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProductsPage } from './pages/ProductsPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerHistoryPage } from './pages/CustomerHistoryPage'
import { Layout } from './components/Layout'
import { PrivateRoute } from './components/PrivateRoute'
import { useAuth } from './contexts/AuthContext'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <div style={{ color: 'var(--white)', fontFamily: 'var(--font-display)', fontSize: '2rem' }}>
                DASHBOARD
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--gray)', marginTop: '0.5rem' }}>
                  Fase 5 — em breve
                </p>
              </div>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <ProductsPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <PrivateRoute>
            <Layout>
              <CustomersPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/clientes/:id/historico"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <CustomerHistoryPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
