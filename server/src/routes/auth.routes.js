import { Router } from "express";
import { randomBytes } from "node:crypto";
import User from "../models/User.js";
import AuthSession from "../models/AuthSession.js";
import { notifySafely, notificationDay, fingerprint } from "../services/notifications.js";
import { hashPassword, verifyPassword, hashSessionToken, publicUser, validateAccount } from "../services/auth.js";
import { AUTH_COOKIE, SESSION_LIFETIME, cookieOptions, requireAccountDatabase, protectWorkspace } from "../middleware/account.js";

const router = Router();
const attempts = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const keys = [{ key: `${req.ip}:${req.path}`, limit: 25 }];
  if (req.path === "/login" && typeof req.body?.email === "string") {
    keys.push({ key: `email:${hashSessionToken(req.body.email.trim().toLowerCase())}`, limit: 10 });
  }
  for (const { key, limit } of keys) {
    const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
    entry.count += 1;
    if (entry.count > limit || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set("Retry-After", "900");
      return res.status(429).json({ message: "محاولات كثيرة خلال وقت قصير. انتظر 15 دقيقة ثم أعد المحاولة." });
    }
    attempts.set(key, entry);
  }
  next();
}

router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/me", (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));
router.use((req, res, next) => {
  if (req.get("X-Smart-Pricing") !== "1") return res.status(403).json({ message: "طلب الحساب غير صالح. أعد المحاولة من الموقع." });
  next();
});

async function signIn(req, res, user) {
  if (req.accountSession) await AuthSession.deleteOne({ _id: req.accountSession._id });
  const token = randomBytes(32).toString("hex");
  await AuthSession.create({
    userId: user._id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME),
  });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_LIFETIME });
}

function authError(error, res, next) {
  if (error?.code === 11000) {
    return res.status(409).json({ message: "هذا البريد مسجّل مسبقًا. استخدم تسجيل الدخول.", errors: { email: "البريد الإلكتروني مستخدم بالفعل." } });
  }
  return next(error);
}

router.post("/register", requireAccountDatabase, rateLimit, async (req, res, next) => {
  if (req.user) return res.status(409).json({ message: "حسابك مكتمل بالفعل. يمكنك تعديل بياناته من صفحة حسابي." });
  const { values, errors } = validateAccount(req.body);
  if (errors) return res.status(400).json({ message: "تحقق من بيانات التسجيل.", errors });
  try {
    const user = await User.create({ ...values, preferredLanguage: req.language, passwordHash: await hashPassword(req.body.password) });
    await signIn(req, res, user);
    await notifySafely(user._id, "account_created", "account-created");
    return res.status(201).json({ user: publicUser(user), message: "تم إنشاء حسابك بنجاح وحفظ بياناته." });
  } catch (error) { return authError(error, res, next); }
});

router.post("/login", requireAccountDatabase, rateLimit, async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body?.password;
  if (!email || email.length > 254 || typeof password !== "string" || !password.length || password.length > 128) {
    return res.status(400).json({ message: "أدخل البريد الإلكتروني وكلمة المرور." });
  }
  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    const valid = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
    if (!valid) return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    await signIn(req, res, user);
    return res.json({ user: publicUser(user), message: "تم تسجيل الدخول. بيانات حسابك محفوظة كما هي." });
  } catch (error) { return next(error); }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (req.accountSession) await AuthSession.deleteOne({ _id: req.accountSession._id });
    res.clearCookie(AUTH_COOKIE, cookieOptions(req));
    return res.json({ message: "تم تسجيل الخروج." });
  } catch (error) { return next(error); }
});

router.patch("/preferences", requireAccountDatabase, protectWorkspace, async (req, res, next) => {
  if (!["ar", "en"].includes(req.body?.language)) return res.status(400).json({ message: "اختر العربية أو الإنجليزية." });
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { preferredLanguage: req.body.language } }, { returnDocument: "after", runValidators: true });
    if (!user) return res.status(401).json({ message: "تعذر العثور على الحساب. سجّل الدخول مجددًا." });
    return res.json({ user: publicUser(user), message: "تم حفظ اللغة المفضلة." });
  } catch (error) { return next(error); }
});

router.patch("/profile", requireAccountDatabase, rateLimit, async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "سجّل الدخول لتعديل بياناتك." });
  const { values, errors } = validateAccount(req.body, { passwordRequired: false });
  if (errors) return res.status(400).json({ message: "تحقق من بيانات الحساب.", errors });
  const currentPassword = req.body?.currentPassword;
  if (typeof currentPassword !== "string" || !currentPassword.length || currentPassword.length > 128) {
    return res.status(400).json({ message: "أدخل كلمة المرور الحالية لتأكيد التعديل.", errors: { currentPassword: "كلمة المرور الحالية مطلوبة." } });
  }
  const newPassword = req.body?.newPassword;
  if (newPassword) {
    const validation = validateAccount({ ...values, password: newPassword, confirmPassword: req.body.confirmPassword });
    if (validation.errors) return res.status(400).json({ message: "تحقق من كلمة المرور الجديدة.", errors: validation.errors });
  }
  try {
    const existing = await User.findById(req.user._id).select("+passwordHash");
    if (!existing || !await verifyPassword(currentPassword, existing.passwordHash)) {
      return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة.", errors: { currentPassword: "كلمة المرور الحالية غير صحيحة." } });
    }
    if (newPassword) values.passwordHash = await hashPassword(newPassword);
    const user = await User.findByIdAndUpdate(req.user._id, { $set: values }, { returnDocument: "after", runValidators: true });
    if (newPassword || existing.email !== values.email) {
      await AuthSession.deleteMany({ userId: user._id, _id: { $ne: req.accountSession._id } });
    }
    await notifySafely(user._id, "profile_updated", `profile:${notificationDay()}:${fingerprint(values)}`);
    return res.json({ user: publicUser(user), message: "تم تحديث بيانات حسابك دون إنشاء حساب جديد." });
  } catch (error) { return authError(error, res, next); }
});

export default router;
