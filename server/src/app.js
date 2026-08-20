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
import incomeRoutes from "./routes/incomeRoutes.js";
import incomeTemplateRoutes from "./routes/incomeTemplateRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import usageAnalyticsRoutes from "./routes/usageAnalyticsRoutes.js";
import expenseCategoryRoutes from "./routes/expenseCategoryRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import profitabilityRoutes from "./routes/profitabilityRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

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
    limit: "1mb",
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

app.use("/api/auth", authRoutes);

/* =========================
   Subscription routes
   ========================= */

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

app.use("/api/recommendations", recommendationRoutes);
app.use("/api/usage-analytics", usageAnalyticsRoutes);

/* =========================
   Cash Flow routes
   ========================= */

app.use(
  "/api/cash-flow",
  cashFlowRoutes
);

/* =========================
   Income routes
   ========================= */

app.use(
  "/api/incomes",
  incomeRoutes
);

/* =========================
   Income Template routes
   ========================= */

app.use(
  "/api/expense-categories",
  expenseCategoryRoutes
);

app.use(
  "/api/expenses",
  expenseRoutes
);

app.use(
  "/api/income-templates",
  incomeTemplateRoutes
);

app.use(
  "/api/clients",
  clientRoutes
);

app.use(
  "/api/profitability",
  profitabilityRoutes
);

app.use("/api/notifications", notificationRoutes);

/* =========================
   404 handler
   ========================= */

app.use(notFound);

/* =========================
   Global error handler
   ========================= */

app.use(errorHandler);

export default app;
