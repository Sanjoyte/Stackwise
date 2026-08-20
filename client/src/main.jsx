import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import { BrowserRouter } from "react-router";

import { Provider } from "react-redux";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";

import { store } from "./store";

import "./index.css";

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);