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
import IncomePage from "./pages/IncomePage";

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
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
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
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

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