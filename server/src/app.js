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

const app = express();

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",

    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stackwise API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;