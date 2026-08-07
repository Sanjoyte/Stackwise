import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import {
  errorHandler,
  notFound,
} from "./middleware/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import cashFlowRoutes from "./routes/cashFlowRoutes.js";

const app = express();

/* =========================
   Security middleware
   ========================= */

app.use(helmet());

/* =========================
   CORS
   ========================= */

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",

    credentials: true,
  })
);

/* =========================
   Body parsers
   ========================= */

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =========================
   Cookies
   ========================= */

app.use(cookieParser());

/* =========================
   Development logging
   ========================= */

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/* =========================
   Health check
   ========================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stackwise API is running",
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   Authentication routes
   ========================= */

app.use(
  "/api/auth",
  authRoutes
);

/* =========================
   Subscription routes
   ========================= */

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

/* =========================
   Cash Flow routes
   ========================= */

app.use(
  "/api/cash-flow",
  cashFlowRoutes
);

/* =========================
   Error handling
   IMPORTANT:
   These must stay after
   all normal routes.
   ========================= */

app.use(notFound);

app.use(errorHandler);

export default app;