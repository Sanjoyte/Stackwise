import path from "node:path";
import { fileURLToPath } from "node:url";
import { setServers } from "node:dns";
import dotenv from "dotenv";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

dotenv.config({
  path: path.resolve(
    __dirname,
    "..",
    ".env"
  ),
});

setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

const startServer = async () => {
  try {
    const { default: app } =
      await import("./app.js");

    const { default: connectDB } =
      await import("./config/db.js");

    await connectDB();

    const PORT =
      process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        "SSLCOMMERZ configured:",
        Boolean(
          process.env
            .SSLCOMMERZ_STORE_ID &&
            process.env
              .SSLCOMMERZ_STORE_PASSWORD
        )
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
};

startServer();