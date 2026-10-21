import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$32768$8$3$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash ?? "").split("$");
  if (parts.length !== 6 || parts.slice(0, 4).join("$") !== "scrypt$32768$8$3"
    || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const actual = await scryptAsync(password, parts[4], 64, SCRYPT_OPTIONS);
  return timingSafeEqual(Buffer.from(parts[5], "hex"), actual);
}

export const hashSessionToken = (token) => createHash("sha256").update(token).digest("hex");

export function normalizeAccount(input = {}) {
  return {
    fullName: typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "",
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
  };
}

export function validateAccount(input, { passwordRequired = true } = {}) {
  const values = normalizeAccount(input);
  const errors = {};
  if (values.fullName.length < 2 || values.fullName.length > 100) errors.fullName = "أدخل اسمًا من حرفين إلى 100 حرف.";
  if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (passwordRequired) {
    if (typeof input?.password !== "string" || input.password.length < 10 || input.password.length > 128) {
      errors.password = "استخدم كلمة مرور من 10 إلى 128 حرفًا.";
    }
    if (typeof input?.confirmPassword !== "string" || input.confirmPassword !== input.password) {
      errors.confirmPassword = "كلمتا المرور غير متطابقتين.";
    }
  }
  return { values, errors: Object.keys(errors).length ? errors : null };
}

export function publicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    profileCompleted: user.profileCompleted,
    profileCompletedAt: user.profileCompletedAt,
  };
}
