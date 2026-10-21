import mongoose from "mongoose";
import User from "../models/User.js";
import AuthSession from "../models/AuthSession.js";
import Notification from "../models/Notification.js";
import { hashSessionToken } from "../services/auth.js";

export const AUTH_COOKIE = "sp_account";
export const SESSION_LIFETIME = 7 * 24 * 60 * 60 * 1000;
let indexesReady = false;

export async function initializeAccounts() {
  await Promise.all([User.init(), AuthSession.init(), Notification.init()]);
  indexesReady = true;
}

export function requireAccountDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1 || !indexesReady) {
    return res.status(503).json({ message: "تسجيل الحسابات غير متاح مؤقتًا. تحقق من اتصال قاعدة البيانات ثم أعد المحاولة." });
  }
  next();
}

export function cookieOptions(req) {
  const localHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(req.hostname);
  return {
    httpOnly: true,
    sameSite: "lax",
    // TLS can terminate before Express in the preview proxy. Non-local access
    // must always use a Secure cookie, even when the final proxy hop is HTTP.
    secure: !localHost || req.secure || process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function sameOriginOnly(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin) {
    try {
      const expectedHost = req.get("x-forwarded-host") || req.get("host");
      if (new URL(origin).host !== expectedHost || req.get("sec-fetch-site") === "cross-site") {
        return res.status(403).json({ message: "هذا الطلب غير مسموح من موقع آخر." });
      }
    } catch {
      return res.status(403).json({ message: "مصدر الطلب غير صالح." });
    }
  }
  next();
}

export async function loadAccount(req, res, next) {
  const token = req.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE}=`))?.slice(AUTH_COOKIE.length + 1);
  if (!token) return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "تعذر تحميل حسابك لأن قاعدة البيانات غير متصلة. أعد المحاولة." });
  }
  try {
    const session = /^[a-f0-9]{64}$/.test(token)
      ? await AuthSession.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } })
      : null;
    const user = session ? await User.findById(session.userId).select("+workspaceId") : null;
    if (!user) {
      req.accountExpired = true;
      res.clearCookie(AUTH_COOKIE, cookieOptions(req));
    } else {
      req.user = user;
      req.accountSession = session;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function protectWorkspace(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ code: "LOGIN_REQUIRED", message: "أنشئ حسابك أو سجّل الدخول لاستخدام أدوات التسعير وحفظ بياناتك." });
  }
  const expectedAccount = req.get("X-SP-Account");
  const actualAccount = req.user ? String(req.user._id) : "guest";
  if (req.accountExpired || (expectedAccount && expectedAccount !== actualAccount)) {
    return res.status(401).json({ code: "SESSION_EXPIRED", message: "انتهت جلسة حسابك. سجّل الدخول مجددًا." });
  }
  res.set("Cache-Control", "no-store");
  next();
}

// Account ownership always comes from the server session, never from a submitted user ID.
// A null owner matches the existing anonymous records, but can never match account data.
export function workspaceFilter(req) {
  return {
    sessionId: req.user ? req.user.workspaceId : req.params.sessionId,
    userId: req.user?._id ?? null,
  };
}
