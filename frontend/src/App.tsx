import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PortfolioProvider } from '@/features/portfolios/PortfolioProvider'
import { LoginPage } from '@/routes/LoginPage'
import { SignupPage } from '@/routes/SignupPage'
import { ForgotPasswordPage } from '@/routes/ForgotPasswordPage'
import { ResetPasswordPage } from '@/routes/ResetPasswordPage'
import { AuthCallbackPage } from '@/routes/AuthCallbackPage'
import { AppLayout } from '@/routes/AppLayout'
import { DashboardPage } from '@/routes/DashboardPage'
import { AssetsPage } from '@/routes/AssetsPage'
import { FxRatesPage } from '@/routes/FxRatesPage'
import { PricesPage } from '@/routes/PricesPage'
import { HistoryPage } from '@/routes/HistoryPage'
import { EntityDetailPage } from '@/routes/EntityDetailPage'
import { HoldingDetailPage } from '@/routes/HoldingDetailPage'
import { CashTransactionDetailPage } from '@/routes/CashTransactionDetailPage'
import { InvestmentDetailPage } from '@/routes/InvestmentDetailPage'
import { AssetDetailPage } from '@/routes/AssetDetailPage'
import { AccountPage } from '@/routes/AccountPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            element={
              <ProtectedRoute>
                <PortfolioProvider>
                  <AppLayout />
                </PortfolioProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/fx" element={<FxRatesPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/entities/:id" element={<EntityDetailPage />} />
            <Route path="/holdings/:id" element={<HoldingDetailPage />} />
            <Route path="/cash/:id" element={<CashTransactionDetailPage />} />
            <Route path="/investments/:id" element={<InvestmentDetailPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
