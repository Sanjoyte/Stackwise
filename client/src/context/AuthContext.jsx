import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  useEffect(() => {
    const checkCurrentSession = async () => {
      try {
        const response = await api.get(
          "/auth/me"
        );

        setUser(response.data.user);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkCurrentSession();
  }, []);

  const signup = async ({
    name,
    email,
    password,
  }) => {
    const response = await api.post(
      "/auth/signup",
      {
        name,
        email,
        password,
      }
    );

    setUser(response.data.user);

    return response.data;
  };

  const login = async ({
    email,
    password,
  }) => {
    const response = await api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );

    setUser(response.data.user);

    return response.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      authLoading,
      signup,
      login,
      logout,
    }),
    [user, authLoading]
  );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}