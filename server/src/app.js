import express from "express";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pricingRoutes from "./routes/pricing.routes.js";
import productsRoutes from "./routes/products.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import adviceRoutes from "./routes/advice.routes.js";

const app = express();
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const clientDirectory = resolve(currentDirectory, "../../client");
const productionAssets = resolve(clientDirectory, "dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "waiting_for_database",
    database: databaseConnected ? "connected" : "disconnected",
  });
});
app.use("/api/pricing", pricingRoutes);
app.use("/api/pricing/settings", settingsRoutes);
app.use("/api/pricing/advice", adviceRoutes);
app.use("/api/pricing/products", productsRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "مسار API غير موجود." });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(productionAssets));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(productionAssets, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "صيغة البيانات المرسلة غير صحيحة." });
  }
  console.error("Request failed:", error.message);
  return res.status(500).json({ message: "حدث خطأ أثناء معالجة الطلب." });
});

export default app;
