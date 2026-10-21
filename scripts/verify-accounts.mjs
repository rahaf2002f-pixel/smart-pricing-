// Real database/API integration test. Only uniquely named test accounts are removed.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import User from "../server/src/models/User.js";
import AuthSession from "../server/src/models/AuthSession.js";
import PricingProduct from "../server/src/models/PricingProduct.js";
import PricingCalculation from "../server/src/models/PricingCalculation.js";
import PricingSettings from "../server/src/models/PricingSettings.js";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const prefix = `sp-test-${randomUUID()}`;
const emails = ["a", "b", "race"].map((part) => `${prefix}-${part}@example.invalid`);
const password = randomBytes(24).toString("base64url");
const newPassword = randomBytes(24).toString("base64url");
let passed = 0;
function check(condition, label) { assert(condition, label); passed += 1; console.log(`PASS ${label}`); }
function client() {
  let cookie = "";
  return async (path, { method = "GET", body, origin, noHeader = false, account } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(!noHeader ? { "X-Smart-Pricing": "1" } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(origin ? { Origin: origin } : {}),
        ...(account ? { "X-SP-Account": account } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length) cookie = setCookie.at(-1).split(";")[0];
    return { status: response.status, body: await response.json(), cookie: setCookie.join(";") };
  };
}
const A = client(), B = client(), guest = client();
const registration = (email) => ({ fullName: "متجر اختبار مستقل", email, password, confirmPassword: password });
const pricing = { purchaseCost: 5, packagingCost: 1, deliveryCost: 2, paymentFee: .5, paymentFeeType: "fixed", targetMarginPercent: 50, comparisonSellingPrice: 20 };
const product = { name: "منتج اختبار الحساب", sku: "", category: "عطور", ...pricing, marketingCost: 0, operationalCost: 0, customCosts: [], batchQuantity: 2, sellingPrice: 20 };
const route = (type) => `/api/pricing/${type}/${randomUUID()}`;
await mongoose.connect(process.env.MONGODB_URI);
try {
  const invalid = await A("/api/auth/register", { method: "POST", body: { ...registration(emails[0]), confirmPassword: "different" } });
  check(invalid.status === 400 && await User.countDocuments({ email: emails[0] }) === 0, "invalid registration never creates a partial profile");
  const first = await A("/api/auth/register", { method: "POST", body: registration(emails[0]) });
  check(first.status === 201 && first.body.user.profileCompleted, "registration stores a completed account");
  // The Replit preview proxy may rewrite Lax to None for its embedded iframe.
  check(/HttpOnly/i.test(first.cookie) && /SameSite=(Lax|None)/i.test(first.cookie) && /Secure/i.test(first.cookie), "proxied session cookie retains HttpOnly, Secure and an explicit SameSite policy");
  const userA = first.body.user;
  const stored = await User.findById(userA.id).select("+passwordHash +workspaceId").lean();
  check(stored.passwordHash !== password && stored.passwordHash.startsWith("scrypt$32768$8$3$"), "MongoDB stores a salted scrypt hash, not a plaintext password");
  check(!JSON.stringify(userA).includes("passwordHash") && !JSON.stringify(userA).includes("workspaceId"), "account responses exclude private authentication fields");
  const duplicate = await guest("/api/auth/register", { method: "POST", body: registration(emails[0].toUpperCase()) });
  check(duplicate.status === 409 && await User.countDocuments({ email: emails[0] }) === 1, "case-insensitive duplicate email is rejected");
  const race = await Promise.all([client(), client()].map((request) => request("/api/auth/register", { method: "POST", body: registration(emails[2]) })));
  check(race.map((item) => item.status).sort().join(",") === "201,409" && await User.countDocuments({ email: emails[2] }) === 1, "concurrent double registration creates exactly one record");

  check((await A(route("calculations"), { method: "PUT", body: pricing })).status === 200, "account calculation saves");
  check((await A(route("settings"), { method: "PUT", body: { defaultDeliveryFee: 1.25, defaultPaymentFee: 2, defaultPaymentFeeType: "percentage" } })).status === 200, "account defaults save");
  const created = await A(route("products"), { method: "POST", body: product });
  check(created.status === 201, "account product saves");
  const productId = created.body.product.id;
  const changed = await A("/api/auth/profile", { method: "PATCH", body: { fullName: "الاسم المحفوظ بعد التعديل", email: emails[0], currentPassword: password } });
  check(changed.status === 200 && changed.body.user.id === userA.id && await User.countDocuments({ email: emails[0] }) === 1, "profile edits update the same user record");
  check((await A("/api/auth/logout", { method: "POST" })).status === 200 && (await A("/api/auth/me")).body.user === null, "logout revokes the server session");
  const login = await A("/api/auth/login", { method: "POST", body: { email: ` ${emails[0].toUpperCase()} `, password } });
  check(login.status === 200 && login.body.user.id === userA.id && login.body.user.fullName === changed.body.user.fullName, "re-login restores the existing profile");
  check(login.body.user.profileCompletedAt === userA.profileCompletedAt, "completion state persists without creating a new form/profile");
  const restored = await A(route("products"));
  check(restored.body.products.length === 1 && restored.body.products[0].id === productId, "saved products return after login even with a new browser workspace ID");
  check((await A(route("calculations"))).body.purchaseCost === 5 && (await A(route("settings"))).body.settings.defaultDeliveryFee === 1.25, "calculation and default fees remain account-linked");
  check(await PricingCalculation.countDocuments({ userId: userA.id }) === 1 && await PricingSettings.countDocuments({ userId: userA.id }) === 1, "account settings and calculations have no duplicate records");

  const second = await B("/api/auth/register", { method: "POST", body: registration(emails[1]) });
  check(second.status === 201 && second.body.user.id !== userA.id, "second account has a different user ID");
  check((await B(route("products"))).body.products.length === 0 && (await B(route("calculations"))).status === 404, "second account cannot see the first account's data");
  check((await B(`${route("products")}/${productId}`, { method: "PUT", body: product })).status === 404
    && (await B(`${route("products")}/${productId}`, { method: "DELETE" })).status === 404, "cross-account product edits and deletions are rejected");
  check((await guest(`/api/pricing/products/${stored.workspaceId}`)).status === 401
    && (await guest(`/api/pricing/calculations/${stored.workspaceId}`)).status === 401, "anonymous requests cannot use pricing tools or read account records");
  const spoofed = await B(route("products"), { method: "POST", body: { ...product, userId: userA.id } });
  check(spoofed.status === 201 && await PricingProduct.countDocuments({ userId: second.body.user.id }) === 1
    && await PricingProduct.countDocuments({ userId: userA.id }) === 1, "submitted user IDs cannot override server-side ownership");
  check((await B(route("settings"), { account: userA.id })).status === 401, "stale account tabs cannot save into a different account");
  check((await guest("/api/auth/login", { method: "POST", body: { email: emails[0], password }, origin: "https://untrusted.invalid" })).status === 403
    && (await guest("/api/auth/login", { method: "POST", body: { email: emails[0], password }, noHeader: true })).status === 403, "cross-site and missing-CSRF-header authentication writes are rejected");
  const emailCollision = await A("/api/auth/profile", { method: "PATCH", body: { fullName: "متجر", email: emails[1], currentPassword: password } });
  check(emailCollision.status === 409 && (await A("/api/auth/me")).body.user.email === emails[0], "profile edits cannot steal another account's email");
  const passwordChange = await A("/api/auth/profile", { method: "PATCH", body: { fullName: "متجر اختبار", email: emails[0], currentPassword: password, newPassword, confirmPassword: newPassword } });
  check(passwordChange.status === 200, "password changes use verified current credentials");
  check((await guest("/api/auth/login", { method: "POST", body: { email: emails[0], password } })).status === 401
    && (await guest("/api/auth/login", { method: "POST", body: { email: emails[0], password: newPassword } })).status === 200, "old password stops working and new password works");
  await AuthSession.updateMany({ userId: second.body.user.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  check((await B(route("products"))).status === 401, "expired sessions cannot silently read or modify guest/account data");
  console.log(`Account integration: ${passed} checks passed.`);
} finally {
  const testUsers = await User.find({ email: { $in: emails } }).select("_id").lean();
  const ids = testUsers.map((user) => user._id);
  await Promise.all([AuthSession, PricingProduct, PricingCalculation, PricingSettings].map((model) => model.deleteMany({ userId: { $in: ids } })));
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
  console.log("Removed only this run's test accounts and their data.");
}
