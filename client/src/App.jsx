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
import SubscriptionPage from "./pages/SubscriptionPage";
import CashFlowPage from "./pages/CashFlowPage";
import IncomePage from "./pages/IncomePage";

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
          DASHBOARD
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
          SUBSCRIPTION
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
          INCOME
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
          DEFAULT ROUTE
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