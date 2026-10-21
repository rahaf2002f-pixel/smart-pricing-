import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, validateAccount, publicUser } from "./auth.js";
import { cookieOptions } from "../middleware/account.js";

test("account validation normalizes email and rejects missing, weak or mismatched fields", () => {
  const good = { fullName: "  متجر   الاختبار ", email: " Owner@Example.COM ", password: "Test-only-password-123", confirmPassword: "Test-only-password-123" };
  const valid = validateAccount(good);
  assert.equal(valid.errors, null);
  assert.equal(valid.values.email, "owner@example.com");
  assert.equal(valid.values.fullName, "متجر الاختبار");
  assert(validateAccount({ ...good, email: "not-email" }).errors.email);
  assert(validateAccount({ ...good, password: "short" }).errors.password);
  assert(validateAccount({ ...good, confirmPassword: "different" }).errors.confirmPassword);
  assert(validateAccount({}).errors.fullName);
});

test("scrypt uses unique salts, verifies correctly and rejects malformed hashes", async () => {
  const password = "A test password not used by real accounts!";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert(!first.includes(password));
  assert.match(first, /^scrypt\$32768\$8\$3\$/);
  assert(await verifyPassword(password, first));
  assert.equal(await verifyPassword("incorrect", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});

test("public account output excludes password hashes, workspace identifiers and session tokens", () => {
  const result = publicUser({ _id: "id", fullName: "متجر", email: "test@example.invalid", profileCompleted: true, profileCompletedAt: new Date(), passwordHash: "not-public", workspaceId: "private" });
  assert.deepEqual(Object.keys(result).sort(), ["id", "fullName", "email", "profileCompleted", "profileCompletedAt"].sort());
});

test("server cookie policy is HttpOnly, SameSite Lax and Secure for non-local hosts", () => {
  const options = cookieOptions({ hostname: "pricing.example.invalid", secure: false });
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.secure, true);
  assert.equal(options.path, "/");
});
