import mongoose from "mongoose";

import app from "../src/app.js";
import connectDB from "../src/config/db.js";

/*
 * Serverless invocations share a warm container, so the Mongo connection is
 * cached across requests. The promise (not a boolean) is cached so concurrent
 * cold-start invocations await the same handshake instead of opening several,
 * and it is cleared on failure so the next request can retry.
 */
let connectionPromise = null;

const ensureConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
};

export default async function handler(req, res) {
  try {
    await ensureConnection();

    return app(req, res);
  } catch (error) {
    console.error("Serverless API error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
