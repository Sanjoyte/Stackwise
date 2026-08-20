import path from "node:path";
import { fileURLToPath } from "node:url";
import { setServers } from "node:dns";
import dotenv from "dotenv";

import app from "./app.js";
import connectDB from "./config/db.js";
import { startNotificationScheduler } from "./jobs/notificationScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Use public DNS for MongoDB Atlas SRV resolution
setServers(["8.8.8.8", "1.1.1.1"]);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    startNotificationScheduler();
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
