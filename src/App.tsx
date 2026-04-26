import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { ROLES } from '@bonistore/shared'

import { ErrorBoundary } from './components/ErrorBoundary'
import { SessionExpiredBanner } from './components/SessionExpiredBanner'
import { Layout } from './components/Layout'
import { PrivateRoute } from './components/PrivateRoute'
import { useAuth } from './contexts/AuthContext'

const CrediarioPage = lazy(() =>
  import('./pages/CrediarioPage').then((m) => ({ default: m.CrediarioPage })),
)
const CustomerHistoryPage = lazy(() =>
  import('./pages/CustomerHistoryPage').then((m) => ({ default: m.CustomerHistoryPage })),
)
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const LembretesPage = lazy(() =>
  import('./pages/LembretesPage').then((m) => ({ default: m.LembretesPage })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const PdvPage = lazy(() => import('./pages/PdvPage').then((m) => ({ default: m.PdvPage })))
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const SalesPage = lazy(() =>
  import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

const loadingScreen = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--black)',
    }}
  >
    <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-body)' }}>Carregando...</p>
  </div>
)

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== ROLES[0]) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <>
      <SessionExpiredBanner />
      <Suspense fallback={loadingScreen}>
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
          path="/lembretes"
          element={
            <PrivateRoute>
              <Layout>
                <ErrorBoundary>
                  <LembretesPage />
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
      </Suspense>
    </>
  )
}
