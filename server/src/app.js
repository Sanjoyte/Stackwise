import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import {
  errorHandler,
  notFound,
} from "./middleware/errorMiddleware.js";

const app = express();

// Basic security headers
app.use(helmet());

// Allow the React frontend to communicate with the backend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON and form data
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Read cookies
app.use(cookieParser());

// Show API requests during development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Test endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stackwise API is running",
    timestamp: new Date().toISOString(),
  });
});

// These must remain after all normal routes
app.use(notFound);
app.use(errorHandler);

export default app;