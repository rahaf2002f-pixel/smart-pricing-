import mongoose from "mongoose";
import app from "../server/src/app.js";
import { initializeAccounts } from "../server/src/middleware/account.js";

// Reuse the connection pool and index initialization across warm invocations.
// Concurrent cold-start requests await the same promise instead of reconnecting.
let connectionPromise;
let initialized = false;
async function readyDatabase() {
  if (initialized && mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = (async () => {
      if (!process.env.MONGODB_URI) throw new Error("DATABASE_NOT_CONFIGURED");
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 8000,
          maxPoolSize: 5,
        });
      }
      await initializeAccounts();
      initialized = true;
    })();
  }
  try {
    await connectionPromise;
  } catch (error) {
    initialized = false;
    throw error;
  } finally {
    connectionPromise = undefined;
  }
}

// Vercel owns the HTTP listener. Never import server.js or start Vite here.
export default async function handler(req, res) {
  try {
    await readyDatabase();
  } catch (error) {
    // Connection error messages can contain credentials; log only the class.
    console.error("API database unavailable:", error.name);
    const english = /^en\b/i.test(String(req.headers["accept-language"] || ""));
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Language", english ? "en" : "ar");
    res.setHeader("Vary", "Accept-Language");
    return res.end(JSON.stringify({
      code: "DATABASE_UNAVAILABLE",
      status: "waiting_for_database",
      database: "disconnected",
      message: english
        ? "The database is temporarily unavailable. Please try again shortly."
        : "قاعدة البيانات غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.",
    }));
  }
  return app(req, res);
}
