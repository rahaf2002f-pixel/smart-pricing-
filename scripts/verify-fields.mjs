// Run against a development app with an isolated Chromium debugging session on 9225.
// Uses only Node built-ins; creates/deletes only its own test product.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import "dotenv/config";
import mongoose from "mongoose";
import User from "../server/src/models/User.js";
import AuthSession from "../server/src/models/AuthSession.js";
import Notification from "../server/src/models/Notification.js";
import PricingProduct from "../server/src/models/PricingProduct.js";
import PricingCalculation from "../server/src/models/PricingCalculation.js";
import PricingSettings from "../server/src/models/PricingSettings.js";

const pages = await (await fetch("http://127.0.0.1:9225/json/list")).json();
const socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const exceptions = [];
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression, timeout = 12000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function fill(selector, value) {
  await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error("Missing input: " + ${JSON.stringify(selector)});
    const prototype = element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, ${JSON.stringify(String(value))});
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  })()`);
  await pause(70);
}
async function click(selector) {
  await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element || element.disabled) throw new Error("Missing or disabled button: " + ${JSON.stringify(selector)});
    element.click();
  })()`);
  await pause(100);
}
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText`);
const value = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.value`);
const money = async (selector) => parseFloat((await text(selector)).replaceAll(",", "").replace(/[\u061c\u200e\u200f]/g, ""));
const near = (actual, expected) => assert(Math.abs(actual - expected) < 0.002, `${actual} != ${expected}`);
const checks = [];
async function check(name, task) {
  if (process.env.VERIFY_ONLY && !name.includes(process.env.VERIFY_ONLY)) return;
  try { await task(); checks.push({ name, pass: true }); console.log("PASS", name); }
  catch (error) { checks.push({ name, pass: false, error: error.message }); console.log("FAIL", name, error.message); }
}
const name = `اختبار الخانات ${randomUUID().slice(0, 8)}`;
const testEmail = `sp-fields-${randomUUID()}@example.invalid`;
async function cleanupTestAccount() {
  await mongoose.connect(process.env.MONGODB_URI);
  const account = await User.findOne({ email: testEmail });
  if (account) {
    await Promise.all([AuthSession, Notification, PricingProduct, PricingCalculation, PricingSettings].map((model) => model.deleteMany({ userId: account._id })));
    await User.deleteOne({ _id: account._id });
  }
  await mongoose.disconnect();
}
let productId;
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.clearBrowserCookies");
await send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 819, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `https://${process.env.REPLIT_DEV_DOMAIN}/` });
try {
  await waitFor(`document.querySelector(".spa-form")`);
  const password = randomBytes(24).toString("base64url");
  const result = await evaluate(`fetch("/api/auth/register", {method:"POST",headers:{"Content-Type":"application/json","X-Smart-Pricing":"1","Accept-Language":"ar"},body:JSON.stringify(${JSON.stringify({fullName:"حساب اختبار الخانات",email:testEmail,password,confirmPassword:password})})}).then(r=>r.status)`);
  assert.equal(result, 201);
  await evaluate(`window.__spFieldsReload=true`);
  await send("Page.reload");
  await pause(400);
  await waitFor(`!window.__spFieldsReload && document.querySelector(".sp-logout")`);
} catch (error) {
  await cleanupTestAccount();
  socket.close();
  throw error;
}
await waitFor(`document.querySelector(".connection-connected") && document.querySelector("#product-name")`);
const session = await evaluate(`localStorage.getItem("smart-pricing-calculation-id")`);
const api = async (path, options) => evaluate(`fetch(${JSON.stringify(path)}, ${JSON.stringify(options)}).then(async r => ({status:r.status, body:await r.json()}))`);
const productsPath = `/api/pricing/products/${session}`;
const getProducts = async () => (await api(productsPath)).body.products;
try {
  await check("All sidebar destinations and current-section indicators", async () => {
    const ids = await evaluate(`[...document.querySelectorAll(".sp-sidebar a.sp-side-link")].map(a => a.hash.slice(1))`);
    assert.equal(ids.length, 9);
    const parents = {
      start: "start", calculator: "calculator", "market-comparison": "calculator",
      details: "details", "store-settings": "details", "payment-settings": "details",
      "ai-advice": "details", catalog: "catalog",
      account: "account-access",
    };
    for (const id of ids) {
      await click(`.sp-sidebar a[href="#${id}"]`);
      await waitFor(`document.querySelector(".sp-main").dataset.activeSection===${JSON.stringify(id)}`);
      assert.equal(await evaluate(`window.location.hash`), `#${id}`);
      assert.equal(await evaluate(`window.scrollY`), 0, `${id} should start at the top`);
      const displayedPages = await evaluate(`[...document.querySelectorAll(".sp-main > .sp-section")].filter(section=>getComputedStyle(section).display!=="none").map(section=>section.id)`);
      assert.deepEqual(displayedPages, [parents[id]], `visible page for ${id}`);
      assert.equal(await evaluate(`document.querySelector(".sp-sidebar a[aria-current]")?.hash`), `#${id}`, id);
      const destinationVisible = await evaluate(`(() => {
        const shown = selector => document.querySelector(selector).getClientRects().length > 0;
        if (${JSON.stringify(id)} === "market-comparison") return shown("#market-comparison") && !shown("#calculator .sp-form-card");
        if (${JSON.stringify(id)} === "details") return shown("#details .sp-editor-grid") && !shown("#store-settings");
        if (${JSON.stringify(id)} === "store-settings") return shown("#store-settings") && !shown("#details .sp-editor-grid");
        if (${JSON.stringify(id)} === "payment-settings") return shown("#payment-settings") && !shown("#default-delivery-fee");
        if (${JSON.stringify(id)} === "ai-advice") return shown("#ai-advice") && !shown(".sp-scenario-block");
        return true;
      })()`);
      assert(destinationVisible, `subpage contents for ${id}`);
    }
    await evaluate(`window.history.back()`);
    await waitFor(`document.querySelector(".sp-main").dataset.activeSection===${JSON.stringify(ids.at(-2))}`);
    await evaluate(`window.history.forward()`);
    await waitFor(`document.querySelector(".sp-main").dataset.activeSection===${JSON.stringify(ids.at(-1))}`);
    await click('.sp-sidebar a[href="#start"]');
    await click(".sp-primary-cta");
    await waitFor(`document.querySelector(".sp-main").dataset.activeSection==="calculator"`);
    await click(".sp-brand");
    await waitFor(`document.querySelector(".sp-main").dataset.activeSection==="start"`);
    await click('.sp-side-link[href="#store-settings"]');
    await waitFor(`document.querySelector(".sp-main").dataset.activeSection==="store-settings"`);
    await click('.sp-sidebar a[href="#start"]');
  });
  await check("Start button and fixed-fee calculator fields", async () => {
    await click(".sp-primary-cta");
    for (const [label, amount] of [["تكلفة شراء المنتج", 10], ["تكلفة التوصيل", 2], ["تكلفة التغليف", 1], ["رسوم الدفع الإلكتروني", 0.5]]) {
      await fill(`#calculator input[aria-label="${label}"]`, amount);
    }
    await fill('select[aria-label="نوع رسوم الدفع في الحاسبة"]', "fixed");
    await fill("#sp-margin-range", 50);
    near(await money(".sp-price b"), 27);
    near(await money(".sp-cost-total b"), 13.5);
    near(await money(".sp-stat-profit b"), 13.5);
  });
  await check("Clearing, typing decimals, presets and negative amounts", async () => {
    const purchase = '#calculator input[aria-label="تكلفة شراء المنتج"]';
    await fill(purchase, "");
    assert.equal(await value(purchase), "");
    await fill(purchase, "10.125");
    near(await money(".sp-cost-total b"), 13.625);
    await fill(purchase, "-4");
    assert(Number(await value(purchase)) >= 0);
    await fill(purchase, 10);
    await evaluate(`[...document.querySelectorAll(".sp-presets button")].find(b=>b.textContent==="35%").click()`);
    await pause(80);
    near(await money(".sp-price b"), 13.5 / 0.65);
    await fill("#sp-margin-range", 50);
  });
  await check("Percentage fees, comparison field and comparison slider", async () => {
    await fill('select[aria-label="نوع رسوم الدفع في الحاسبة"]', "percentage");
    await fill('#calculator input[aria-label="رسوم الدفع الإلكتروني"]', 2);
    near(await money(".sp-price b"), 13 / 0.48);
    await fill('input[aria-label="سعر البيع للمقارنة"]', 20);
    near(await money(".sp-compare-stats > div:nth-child(2) b"), 6.6);
    await fill('input[aria-label="حرّك سعر البيع للمقارنة"]', 25);
    near(await money(".sp-compare-stats > div:nth-child(2) b"), 11.5);
  });
  await check("Automatic database save and calculator restore after reload", async () => {
    await waitFor(`document.querySelector(".connection-connected")`);
    const saved = await api(`/api/pricing/calculations/${session}`);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.purchaseCost, 10);
    await send("Page.reload");
    await waitFor(`document.querySelector(".connection-connected")`);
    assert.equal(await value('#calculator input[aria-label="رسوم الدفع الإلكتروني"]'), "2");
  });
  await check("Default fee fields, saving settings and new-product defaults", async () => {
    await click('.sp-sidebar a[href="#store-settings"]');
    await fill("#default-delivery-fee", "1.25");
    await fill('select[aria-label="نوع رسوم الدفع الافتراضية"]', "percentage");
    await fill("#default-payment-fee", "2.5");
    await click("#store-settings button[type=submit]");
    await waitFor(`document.querySelector(".sp-default-settings-actions").innerText.includes("تم حفظ")`);
    await click('.sp-sidebar a[href="#details"]');
    await click("#details .sp-heading button");
    assert.equal(await value("#editor-deliveryCost"), "1.25");
    assert.equal(await value("#editor-paymentFee"), "2.5");
  });
  await check("All detailed product fields and custom cost add/remove", async () => {
    await fill("#product-name", name);
    await fill("#product-sku", "TEST-FIELDS");
    await fill("#product-category", "عطور");
    await fill("#product-batch", 3);
    await fill('select[aria-label="نوع رسوم الدفع للمنتج"]', "fixed");
    for (const [key, amount] of Object.entries({ purchaseCost: 10, packagingCost: 1, deliveryCost: 2, paymentFee: 0.5, marketingCost: 1, operationalCost: 0.5 })) await fill(`#editor-${key}`, amount);
    await fill("#editor-margin", 50);
    await fill("#editor-selling", "");
    await click(".sp-add-custom");
    await fill('input[aria-label="اسم بند التكلفة 1"]', "تكلفة اختبار");
    await fill('input[aria-label="قيمة بند التكلفة 1"]', 1);
    near(await money(".sp-editor-price > strong"), 32);
    await click(".sp-add-custom");
    assert.equal(await evaluate(`document.querySelectorAll(".sp-remove-custom").length`), 2);
    await evaluate(`document.querySelectorAll(".sp-remove-custom")[1].click()`);
    await pause(100);
    assert.equal(await evaluate(`document.querySelectorAll(".sp-remove-custom").length`), 1);
    await fill("#editor-selling", 30);
    near(await money(".sp-editor-price > strong"), 30);
    assert((await text(".sp-editor-price")).includes("42.000"));
  });
  await check("Discount number, quick presets and slider recalculate", async () => {
    await fill("#discount-percent", 20);
    const discounted = await text(".sp-discount-results");
    assert(discounted.includes("24.000") && discounted.includes("8.000"), discounted);
    await fill('input[aria-label="نسبة الخصم"]', 10);
    assert((await text(".sp-discount-results")).includes("27.000"));
    await evaluate(`[...document.querySelectorAll(".sp-discount-control button")].find(b=>b.textContent==="20%").click()`);
    await pause(100);
    assert.equal(await value("#discount-percent"), "20");
  });
  await check("Save product through UI and verify persisted calculations", async () => {
    await click(".sp-editor-actions button[type=submit]");
    await waitFor(`document.querySelector(".sp-success")?.innerText.includes("تم حفظ")`);
    const product = (await getProducts()).find((item) => item.name === name);
    assert(product);
    productId = product.id;
    near(product.totalCost, 16);
    near(product.expectedProfit, 14);
    near(product.marginPercent, 46.666666);
    await send("Page.reload");
    await waitFor(`document.querySelector(".connection-connected")`);
    await waitFor(`document.querySelector("#catalog").innerText.includes(${JSON.stringify(name)})`);
  });
  await check("Catalog edit, save and cancel", async () => {
    await click(`button[aria-label="تعديل المنتج ${name}"]`);
    assert.equal(await value("#product-name"), name);
    await fill("#editor-selling", 28);
    await click(".sp-editor-actions button[type=submit]");
    await waitFor(`document.querySelector(".sp-success")?.innerText.includes("تم تحديث")`);
    near((await getProducts()).find((item) => item.id === productId).sellingPrice, 28);
    await click(".sp-editor-actions button[type=button]");
    assert.equal(await value("#product-name"), "");
  });
  await check("Search, category/margin filters, table and cards", async () => {
    await fill('input[aria-label="بحث المنتجات"]', name);
    assert((await text(".sp-table tbody")).includes(name));
    await fill('select[aria-label="التصفية حسب التصنيف"]', "عطور");
    await fill('select[aria-label="التصفية حسب هامش الربح"]', "healthy");
    assert((await text(".sp-table tbody")).includes(name));
    await fill('select[aria-label="التصفية حسب هامش الربح"]', "review");
    assert((await text("#catalog")).includes("لا توجد نتائج مطابقة"));
    await evaluate(`[...document.querySelectorAll("#catalog button")].find(b=>b.textContent==="مسح عوامل التصفية").click()`);
    await pause(100);
    await click('button[title="عرض بطاقات"]');
    assert((await text(".sp-product-grid")).includes(name));
    await click('button[title="عرض جدولي"]');
  });
  await check("CSV export and print button", async () => {
    await evaluate(`window.__download=""; window.__printCalled=false;
      const originalClick=HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click=function(){if(this.download){window.__download=this.download;}return originalClick.call(this);};
      window.print=()=>{window.__printCalled=true;}`);
    await evaluate(`[...document.querySelectorAll("#catalog button")].find(b=>b.textContent.includes("تصدير CSV")).click()`);
    assert.equal(await evaluate(`window.__download`), "smart-pricing-products.csv");
    await evaluate(`[...document.querySelectorAll("#catalog button")].find(b=>b.textContent.includes("طباعة / PDF")).click()`);
    assert(await evaluate(`window.__printCalled`));
  });
  await check("AI advice button with real backend/provider request", async () => {
    await click(`button[aria-label="تعديل المنتج ${name}"]`);
    await click("#ai-advice button");
    await waitFor(`document.querySelector(".sp-advice-result") || document.querySelector("#ai-advice [role=alert]")`, 22000);
    const error = await text("#ai-advice [role=alert]");
    if (error) throw new Error(`Provider unavailable: ${error}`);
    assert((await text(".sp-advice-result")).length > 30);
  });
  await check("Mobile menu opens/closes and numeric input remains editable", async () => {
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await click(".sp-menu-toggle");
    assert(await evaluate(`document.querySelector(".sp-menu-toggle").getAttribute("aria-expanded")==="true"`));
    await click('.sp-sidebar a[href="#calculator"]');
    assert(await evaluate(`document.querySelector(".sp-menu-toggle").getAttribute("aria-expanded")==="false"`));
    await fill('#calculator input[aria-label="تكلفة شراء المنتج"]', "11.25");
    assert.equal(await value('#calculator input[aria-label="تكلفة شراء المنتج"]'), "11.25");
    assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`));
    for (const width of [320, 768, 1024, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 760 });
      await pause(120);
      assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`), `horizontal overflow at ${width}px`);
      assert.equal(await evaluate(`document.querySelector(".sp-main").dataset.activeSection`), "calculator");
    }
  });
  await check("Delete own test product and confirm persistent deletion", async () => {
    await send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 819, deviceScaleFactor: 1, mobile: false });
    await click('.sp-sidebar a[href="#catalog"]');
    await click('button[title="عرض جدولي"]');
    await evaluate(`window.confirm=()=>true`);
    await click(`button[aria-label="حذف ${name}"]`);
    await waitFor(`!document.querySelector('button[aria-label="حذف ${name}"]')`);
    assert(!(await getProducts()).some((item) => item.name === name));
    await send("Page.reload");
    await waitFor(`document.querySelector(".connection-connected")`);
    assert(!(await getProducts()).some((item) => item.name === name));
  });
} finally {
  // All data belongs to this run's isolated test account.
  await cleanupTestAccount();
  await send("Network.clearBrowserCookies");
  socket.close();
}
console.log(JSON.stringify({ checks, browserExceptions: exceptions }, null, 2));
if (checks.some((item) => !item.pass) || exceptions.length) process.exitCode = 1;
