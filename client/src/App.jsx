import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import {
  ProtectedRoute,
  PublicRoute,
} from "./components/RouteGuards";

import AuthPage from "./pages/AuthPage";
import LoginSuccessPage from "./pages/LoginSuccessPage";
import DashboardPage from "./pages/DashboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import OverlapPage from "./pages/OverlapPage";
import CashFlowPage from "./pages/CashFlowPage";
import IncomePage from "./pages/IncomePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ExpenseCategoryDetailPage from "./pages/ExpenseCategoryDetailPage";
import CategorySpendingPage from "./pages/CategorySpendingPage";

export default function App() {
  return (
    <Routes>
      {/* =========================
          LOGIN
          ========================= */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        }
      />

      {/* =========================
          SIGNUP
          ========================= */}
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <AuthPage mode="signup" />
          </PublicRoute>
        }
      />

      {/* =========================
          MAIN DASHBOARD
          ========================= */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <LoginSuccessPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          LOGIN SUCCESS
          Keep for compatibility
          ========================= */}
      <Route
        path="/login-success"
        element={
          <ProtectedRoute>
            <LoginSuccessPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          SUBSCRIPTIONS
          ========================= */}
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          CASH FLOW
          ========================= */}
      <Route
        path="/cash-flow"
        element={
          <ProtectedRoute>
            <CashFlowPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          INCOME TRACKING
          ========================= */}
      <Route
        path="/income"
        element={
          <ProtectedRoute>
            <IncomePage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          AI OVERLAP PAGE
          Dedicated overlap detection page
          ========================= */}
      <Route
        path="/recommendations"
        element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>}
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

      {/* =========================
          DEFAULT
          ========================= */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
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
      {/* =========================
          UNKNOWN ROUTES
          ========================= */}
      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>

    
  );
}

