import { Routes, Route, Navigate } from 'react-router-dom'

import { ROLES } from '@bonistore/shared'

import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { PrivateRoute } from './components/PrivateRoute'
import { useAuth } from './contexts/AuthContext'
import { CrediarioPage } from './pages/CrediarioPage'
import { CustomerHistoryPage } from './pages/CustomerHistoryPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PdvPage } from './pages/PdvPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesPage } from './pages/SalesPage'
import { SettingsPage } from './pages/SettingsPage'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== ROLES[0]) return <Navigate to="/" replace />
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
              <ErrorBoundary>
                <DashboardPage />
              </ErrorBoundary>
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
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
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
                <ErrorBoundary>
                  <ProductsPage />
                </ErrorBoundary>
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
              <ErrorBoundary>
                <CustomersPage />
              </ErrorBoundary>
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
                <ErrorBoundary>
                  <CustomerHistoryPage />
                </ErrorBoundary>
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
              <ErrorBoundary>
                <PdvPage />
              </ErrorBoundary>
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
                <ErrorBoundary>
                  <SalesPage />
                </ErrorBoundary>
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
                <ErrorBoundary>
                  <CrediarioPage />
                </ErrorBoundary>
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
                <ErrorBoundary>
                  <ReportsPage />
                </ErrorBoundary>
              </Layout>
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
