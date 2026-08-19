import { Navigate } from "react-router";

import { useAuth } from "../context/AuthContext";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ff]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
    </main>
  );
}

export function ProtectedRoute({
  children,
}) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate to="/login" replace />
    );
  }

  return children;
}

export function PublicRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    return (
      <Navigate to="/dashboard" replace />
    );
  }

  return children;
}