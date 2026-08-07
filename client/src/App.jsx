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
import CashFlowPage from "./pages/CashFlowPage";
import LoginSuccessPage from "./pages/LoginSuccessPage";
import SubscriptionPage from "./pages/SubscriptionPage";

export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        }
      />

      {/* Signup */}
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <AuthPage mode="signup" />
          </PublicRoute>
        }
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <LoginSuccessPage />
          </ProtectedRoute>
        }
      />

      {/* Subscription */}
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />

      {/* Cash Flow */}
      <Route
        path="/cash-flow"
        element={
          <ProtectedRoute>
            <CashFlowPage />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* Unknown Routes */}
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