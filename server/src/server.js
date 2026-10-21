import "dotenv/config";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import app from "./app.js";
import { initializeAccounts } from "./middleware/account.js";

const port = Number(process.env.PORT) || 5000;
const server = http.createServer(app);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log("MongoDB connected.");
      await initializeAccounts();
      console.log("Account storage and unique indexes ready.");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
    }
  } else {
    console.warn("MONGODB_URI is missing; database persistence is unavailable.");
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: "client/vite.config.js",
      server: { middlewareMode: true, hmr: { server } },
    });
    app.use(vite.middlewares);
    app.get("/{*path}", async (req, res, next) => {
      try {
        const template = await readFile(resolve("client/index.html"), "utf8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).type("html").send(html);
      } catch (error) {
        next(error);
      }
    });
    app.use((error, _req, res, _next) => {
      vite.ssrFixStacktrace(error);
      console.error("Vite request failed:", error.message);
      res.status(500).end("Frontend development server error");
    });
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Smart Pricing AI is listening on port ${port}.`);
  });

  async function close() {
    await mongoose.disconnect();
    server.close(() => process.exit(0));
  }
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

start().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
