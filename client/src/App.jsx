import { Navigate, Route, Routes } from "react-router";

import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";

import AuthPage from "./pages/AuthPage";
import LoginSuccessPage from "./pages/LoginSuccessPage";
import DashboardPage from "./pages/DashboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import OverlapPage from "./pages/OverlapPage";
import CashFlowPage from "./pages/CashFlowPage";
import IncomePage from "./pages/IncomePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import UsageAnalyticsPage from "./pages/UsageAnalyticsPage";
import ExpenseCategoryDetailPage from "./pages/ExpenseCategoryDetailPage";
import CategorySpendingPage from "./pages/CategorySpendingPage";
import ExpensesPage from "./pages/ExpensesPage";
import ProfitabilityPage from "./pages/ProfitabilityPage";
import ClientProfitabilityPage from "./pages/ClientProfitabilityPage";
import NotificationsPage from "./pages/NotificationsPage";

import TeamPage from "./pages/TeamPage";
import PaymentsPage from "./pages/PaymentsPage";
import FinancialHealthPage from "./pages/FinancialHealthPage";
import TaxReportPage from "./pages/TaxReportPage";
import TaxReportDetailPage from "./pages/TaxReportDetailPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicRoute>
            <AuthPage mode="signup" />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <LoginSuccessPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/login-success"
        element={
          <ProtectedRoute>
            <LoginSuccessPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash-flow"
        element={
          <ProtectedRoute>
            <CashFlowPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/income"
        element={
          <ProtectedRoute>
            <IncomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profitability/:clientId"
        element={
          <ProtectedRoute>
            <ClientProfitabilityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profitability"
        element={
          <ProtectedRoute>
            <ProfitabilityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financial-health"
        element={
          <ProtectedRoute>
            <FinancialHealthPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usage-analytics"
        element={
          <ProtectedRoute>
            <UsageAnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recommendations"
        element={
          <ProtectedRoute>
            <RecommendationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/overlap"
        element={
          <ProtectedRoute>
            <OverlapPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-overlap"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expense-categories/:slug"
        element={
          <ProtectedRoute>
            <ExpenseCategoryDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/category-spending"
        element={
          <ProtectedRoute>
            <CategorySpendingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tax-reports"
        element={
          <ProtectedRoute>
            <TaxReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tax-reports/:id"
        element={
          <ProtectedRoute>
            <TaxReportDetailPage />
          </ProtectedRoute>
        }
      />
      {/* =========================
          UNKNOWN ROUTES
          ========================= */}

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
