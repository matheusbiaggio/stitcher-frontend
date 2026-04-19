import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProductsPage } from './pages/ProductsPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerHistoryPage } from './pages/CustomerHistoryPage'
import { PdvPage } from './pages/PdvPage'
import { SalesPage } from './pages/SalesPage'
import { CrediarioPage } from './pages/CrediarioPage'
import { DashboardPage } from './pages/DashboardPage'
import { ReportsPage } from './pages/ReportsPage'
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
              <DashboardPage />
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
      <Route
        path="/pdv"
        element={
          <PrivateRoute>
            <Layout>
              <PdvPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/vendas"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <SalesPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/crediario"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <CrediarioPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <PrivateRoute>
            <AdminRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
