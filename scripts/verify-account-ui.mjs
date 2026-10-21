// Isolated Chromium on CDP port 9225. Uses real UI/API/Atlas and cleans up its own users.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import User from "../server/src/models/User.js";
import AuthSession from "../server/src/models/AuthSession.js";
import PricingProduct from "../server/src/models/PricingProduct.js";
import PricingCalculation from "../server/src/models/PricingCalculation.js";
import PricingSettings from "../server/src/models/PricingSettings.js";

const pages = await (await fetch("http://127.0.0.1:9225/json/list")).json();
const socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map(), exceptions = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
  const request = pending.get(message.id);
  if (request) {
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression) {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch {
      // CDP can briefly lose its execution context while a real navigation reloads.
    }
    await pause(100);
  }
  // Avoid printing expressions that could contain generated credentials.
  throw new Error("Timed out waiting for the expected account UI state.");
}
async function fill(selector, value) {
  await evaluate(`(() => {
    const input=document.querySelector(${JSON.stringify(selector)});
    if(!input) throw new Error("Missing test field");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,${JSON.stringify(value)});
    input.dispatchEvent(new Event("input",{bubbles:true}));
  })()`);
  await pause(60);
}
async function click(selector) {
  await evaluate(`(() => {
    const element=document.querySelector(${JSON.stringify(selector)});
    if(!element || element.disabled) throw new Error("Missing or disabled test control");
    element.scrollIntoView({block:"center",behavior:"instant"}); element.click();
  })()`);
  await pause(120);
}
async function route(id) {
  await evaluate(`window.location.hash=${JSON.stringify(id)}`);
  await waitFor(`document.querySelector(".sp-main")?.dataset.activeSection===${JSON.stringify(id)}`);
  await pause(60);
}
async function submit() { await click('.spa-form button[type="submit"]'); }
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const prefix = `sp-ui-${randomUUID()}`;
const emails = [`${prefix}-a@example.invalid`, `${prefix}-b@example.invalid`];
const password = randomBytes(24).toString("base64url");
const nameA = "حساب واجهة الاختبار الأول", nameB = "حساب واجهة الاختبار الثاني";
const renamed = "اسم الحساب المحفوظ بعد التعديل";
const productName = `منتج حساب ${prefix}`;
let passed = 0;
function check(value, message) { assert(value, message); passed++; console.log(`PASS ${message}`); }
async function register(name, email) {
  await route("signup");
  await fill("#fullName", name); await fill("#email", email);
  await fill("#password", password); await fill("#confirmPassword", password);
  await submit(); await waitFor(`document.querySelector(".spa-account-card")`);
}
async function logout() {
  await click(".sp-logout");
  await waitFor(`document.querySelector(".sp-main")?.dataset.activeSection==="signin" && document.querySelector("#email")`);
}
await mongoose.connect(process.env.MONGODB_URI);
try {
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/#start` });
  await waitFor(`document.querySelector(".spa-form")`);
  check(await evaluate(`Boolean(document.querySelector("#start .sp-hero-card") && document.querySelector("#start .spa-form")) && document.querySelector("#start-account").getBoundingClientRect().top > document.querySelector(".sp-hero-card").getBoundingClientRect().bottom`), "registration appears directly below the homepage introduction");
  check(await evaluate(`fetch("/api/pricing/products/${randomUUID()}").then(r=>r.status===401)`), "anonymous users cannot use protected pricing APIs");
  await click(".sp-primary-cta");
  check(await evaluate(`document.querySelector(".sp-main").dataset.activeSection==="start" && document.activeElement.id==="fullName"`), "homepage start button takes guests directly to account entry");
  await fill("#fullName", nameA); await fill("#email", "invalid");
  await fill("#password", password); await fill("#confirmPassword", "different");
  await submit();
  check(await evaluate(`Boolean(document.querySelector("#email-error") && document.querySelector("#confirmPassword-error"))`), "registration displays Arabic email and password-match errors");
  await click("#password ~ .spa-reveal");
  check(await evaluate(`document.querySelector("#password").type==="text"`), "show password control works");
  await click("#password ~ .spa-reveal");
  check(await evaluate(`document.querySelector("#password").type==="password"`), "hide password control works");
  await fill("#email", emails[0]); await fill("#confirmPassword", password);
  await evaluate(`document.querySelector(".spa-form").requestSubmit(); document.querySelector(".spa-form")?.requestSubmit();`);
  await waitFor(`document.querySelector(".spa-account-card")`);
  check(await evaluate(`!document.querySelector(".spa-form") && document.querySelector(".spa-profile-list").innerText.includes(${JSON.stringify(nameA)})`), "successful registration shows saved profile rather than another input form");
  check(await User.countDocuments({ email: emails[0] }) === 1, "rapid repeated submit creates one account");
  const firstId = String((await User.findOne({ email: emails[0] }))._id);
  await evaluate(`window.__spAccountReloadMarker=true`);
  await send("Page.reload");
  await waitFor(`!window.__spAccountReloadMarker && document.querySelector(".spa-account-card .spa-profile-list")`);
  check(await evaluate(`document.querySelector(".spa-profile-list").innerText.includes(${JSON.stringify(emails[0])}) && !document.querySelector(".spa-form")`), "refresh restores saved account without repeating registration");
  await evaluate(`window.location.hash="signup"`);
  await waitFor(`window.location.hash==="#account" && document.querySelector(".spa-account-card")`);
  check(true, "signed-in users cannot reopen a duplicate signup form");
  await click(".spa-account-actions .spa-primary");
  await fill("#fullName", renamed); await fill("#currentPassword", password); await submit();
  await waitFor(`document.querySelector(".spa-account-card")?.innerText.includes(${JSON.stringify(renamed)})`);
  check(await evaluate(`document.querySelector(".spa-message")?.innerText.includes("تحديث")`), "profile edit shows success and the updated saved name");
  await route("details");
  await fill("#product-name", productName); await fill("#editor-purchaseCost", "9");
  await click(".sp-editor-actions button[type=submit]");
  await waitFor(`document.querySelector(".sp-success")?.innerText.includes("تم حفظ")`);
  await logout();
  await fill("#email", emails[0]); await fill("#password", "Incorrect-password-for-test");
  await submit();
  await waitFor(`document.querySelector(".spa-message.is-error")`);
  check(await evaluate(`document.querySelector(".spa-message").innerText.includes("غير صحيحة")`), "wrong login credentials show a clear Arabic error");
  await fill("#password", password); await submit();
  await waitFor(`document.querySelector(".spa-account-card")`);
  check(await evaluate(`document.querySelector(".spa-profile-list").innerText.includes(${JSON.stringify(renamed)}) && !document.querySelector(".spa-form")`)
    && await User.countDocuments({ email: emails[0] }) === 1
    && String((await User.findOne({ email: emails[0] }))._id) === firstId, "logout and re-login restore the same completed profile without duplicate records");
  await route("catalog");
  await waitFor(`document.querySelector("#catalog").innerText.includes(${JSON.stringify(productName)})`);
  check(true, "saved product appears after signing back into the account");
  await logout();
  await register(nameB, emails[1]);
  check(await evaluate(`document.querySelector(".spa-profile-list").innerText.includes(${JSON.stringify(nameB)}) && !document.querySelector(".spa-profile-list").innerText.includes(${JSON.stringify(renamed)})`), "second account displays only its own profile");
  await route("catalog");
  await waitFor(`document.querySelector("#catalog .sp-empty")`);
  check(!await evaluate(`document.querySelector("#catalog").innerText.includes(${JSON.stringify(productName)})`), "second account cannot see the first account's product");
  const routes = ["start", "calculator", "market-comparison", "details", "ai-advice", "catalog", "store-settings", "payment-settings", "account"];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
    for (const id of routes) {
      await route(id);
      check(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), `${id} stays within the viewport at ${width}px`);
    }
  }
  await route("account"); await click(".spa-account-actions .spa-primary");
  for (const width of [320, 820, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
    check(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth && parseFloat(getComputedStyle(document.querySelector("#currentPassword")).fontSize)>=16`), `profile edit form remains touch-readable at ${width}px`);
  }
  await logout();
  for (const width of [320, 390, 820, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
    for (const id of ["signup", "signin"]) {
      await route(id);
      check(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth && parseFloat(getComputedStyle(document.querySelector("#email")).fontSize)>=16`), `${id} form is responsive and readable at ${width}px`);
    }
  }
  await route("start");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  check(await evaluate(`parseFloat(getComputedStyle(document.querySelector(".sp-hero-artwork")).width)>=96 && document.querySelector(".sp-art-frame img").naturalWidth>0`), "original logo artwork is larger and loads correctly");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  check(await evaluate(`getComputedStyle(document.querySelector(".sp-hero-artwork")).animationName==="none" && getComputedStyle(document.querySelector(".sp-art-frame")).animationName==="none"`), "logo animation respects reduced-motion preferences");
  await send("Emulation.setEmulatedMedia", { features: [] });
  check(exceptions.length === 0, "account journeys produce no browser JavaScript exceptions");
  console.log(`Account UI: ${passed} checks passed.`);
} finally {
  const users = await User.find({ email: { $in: emails } }).select("_id").lean();
  const ids = users.map((user) => user._id);
  await Promise.all([AuthSession, PricingProduct, PricingCalculation, PricingSettings].map((model) => model.deleteMany({ userId: { $in: ids } })));
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
  await send("Network.clearBrowserCookies");
  socket.close();
  console.log("Removed only this run's UI test accounts and their data.");
}
