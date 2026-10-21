// Requires isolated Chromium CDP on 9225. Tests real UI/Atlas; deletes only its own users.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
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
const pending = new Map(), exceptions = [];
let sequence = 0, checks = 0;
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
  const request = pending.get(message.id);
  if (request) {
    pending.delete(message.id);
    message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression) {
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* Navigation can replace the context. */ }
    await pause(100);
  }
  throw Error(`Timed out: ${expression}`);
}
function check(value, message) { assert(value, message); checks++; console.log("PASS", message); }
async function fill(selector, value) {
  await evaluate(`(() => {
    const el=document.querySelector(${JSON.stringify(selector)});
    if(!el) throw Error("Missing input");
    const proto=el.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(String(value))});
    el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));
  })()`);
  await pause(80);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await pause(120);
}
async function route(id) {
  await evaluate(`location.hash=${JSON.stringify(id)}`);
  await waitFor(`document.querySelector(".sp-main")?.dataset.activeSection===${JSON.stringify(id)}`);
}
async function language(value) {
  await fill(".sp-language-switcher select", value);
  await waitFor(`document.documentElement.lang===${JSON.stringify(value)}`);
  await waitFor(`!document.querySelector(".sp-language-switcher [role='status']")`);
  assert.equal(await evaluate(`Boolean(document.querySelector(".sp-language-error"))`), false);
}
async function reload() {
  await evaluate("window.__localeReload=true");
  await send("Page.reload");
  await waitFor(`!window.__localeReload && document.querySelector(".sp-main")`);
}
async function logout() {
  await click(".sp-logout");
  await waitFor(`document.querySelector("#email") && document.querySelector(".sp-main").dataset.activeSection==="signin"`);
}
async function login(email, password) {
  await fill("#email", email); await fill("#password", password);
  await click('.spa-form button[type="submit"]');
  await waitFor(`document.querySelector(".spa-account-card")`);
}
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const emails = [`sp-lang-a-${randomUUID()}@example.invalid`, `sp-lang-b-${randomUUID()}@example.invalid`];
const password = randomBytes(24).toString("base64url");
const api = (path, method = "GET", body) => evaluate(`fetch(${JSON.stringify(path)}, {
  method:${JSON.stringify(method)},headers:{"Content-Type":"application/json","X-Smart-Pricing":"1","Accept-Language":document.documentElement.lang},
  ${body ? `body:JSON.stringify(${JSON.stringify(body)})` : ""}
}).then(async r=>({status:r.status,body:await r.json()}))`);
async function auditEnglish() {
  const remaining = await evaluate(`(() => {
    const bad=[], walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();) {
      const parent=node.parentElement;
      if(parent && !parent.closest("option,script,style") && parent.checkVisibility() && /[\\u0600-\\u06ff]/.test(node.textContent)) bad.push(node.textContent.trim());
    }
    for(const el of document.querySelectorAll("[placeholder],[title],[aria-label],img[alt]")) {
      if(!el.checkVisibility()) continue;
      for(const attr of ["placeholder","title","aria-label","alt"]) if(/[\\u0600-\\u06ff]/.test(el.getAttribute(attr)||"")) bad.push(attr+":"+el.getAttribute(attr));
    }
    return [...new Set(bad)].filter(Boolean);
  })()`);
  assert.deepEqual(remaining, [], "Untranslated English-screen text");
}
async function register(name, email) {
  await fill("#fullName", name); await fill("#email", email);
  await fill("#password", password); await fill("#confirmPassword", password);
  await click('.spa-form button[type="submit"]');
  await waitFor(`document.querySelector(".spa-account-card")`);
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width:1440,height:1000,deviceScaleFactor:1,mobile:false });
  await send("Page.navigate", { url:`${base}/#start` });
  await waitFor(`document.querySelector(".sp-language-switcher")`);
  await evaluate(`localStorage.removeItem("smart-pricing-language")`);
  await reload();
  check(await evaluate(`document.documentElement.lang==="ar" && document.documentElement.dir==="rtl"`), "new visitors default to Arabic RTL");
  await language("en");
  await auditEnglish();
  check(true, "English homepage and registration form have no untranslated text");
  await route("signin"); await auditEnglish();
  await route("signup"); await auditEnglish();
  check(true, "English sign-in and signup pages are fully translated");
  const invalid = await api("/api/auth/register","POST",{ email:"invalid" });
  check(invalid.status===400 && !/\p{Script=Arabic}/u.test(JSON.stringify(invalid.body)), "server validation errors are translated into English");
  await register("Language Test A", emails[0]);
  const first = await User.findOne({ email:emails[0] });
  check(first.preferredLanguage==="en", "registration saves the selected language to the user in Atlas");
  const translationGaps=[];
  for(const id of ["start","calculator","market-comparison","details","ai-advice","catalog","store-settings","payment-settings","account"]) {
    await route(id);
    try { await auditEnglish(); } catch(error) { translationGaps.push({id,error:error.message}); }
  }
  assert.deepEqual(translationGaps,[],"All independent English pages must be fully translated");
  await Promise.all(Array.from({length:3},()=>api("/api/notifications/demo","POST")));
  check(await Notification.countDocuments({userId:first._id,code:"demo"})===1, "the clearly labelled default test notification is created only once");
  await route("calculator");
  await waitFor(`document.querySelector(".connection-connected")`);
  await fill("#calculator input",17.375);
  const inputValues = await evaluate(`JSON.stringify([...document.querySelectorAll("#calculator input")].map(e=>[e.id,e.value]))`);
  await waitFor(`document.querySelector(".connection-saving")`);
  await waitFor(`document.querySelector(".connection-connected")`);
  const session = await evaluate(`localStorage.getItem("smart-pricing-calculation-id")`);
  const before = await api(`/api/pricing/calculations/${session}`);
  await language("ar");
  await pause(500);
  check(await evaluate(`JSON.stringify([...document.querySelectorAll("#calculator input")].map(e=>[e.id,e.value]))===${JSON.stringify(inputValues)}`), "language switches preserve every calculator input");
  const after = await api(`/api/pricing/calculations/${session}`);
  const { updatedAt: beforeTimestamp, ...beforeValues } = before.body;
  const { updatedAt: afterTimestamp, ...afterValues } = after.body;
  check(before.status===200 && after.status===200 && beforeValues.purchaseCost===17.375 && Number.isFinite(beforeValues.suggestedSellingPrice) && JSON.stringify(beforeValues)===JSON.stringify(afterValues), "KWD calculation values and results do not change with language");
  check((await User.findById(first._id)).preferredLanguage==="ar", "Arabic preference is persisted on the server");
  await reload();
  check(await evaluate(`document.documentElement.lang==="ar" && document.documentElement.dir==="rtl"`), "refresh restores the saved Arabic preference");
  await language("en"); await pause(400);
  await route("details");
  await fill("#product-name","Bilingual product");
  await fill("#editor-purchaseCost",8.125);
  await click('.sp-editor-actions button[type="submit"]');
  await waitFor(`document.querySelector(".sp-success")`);
  const saved = await PricingProduct.findOne({ userId:first._id,name:"Bilingual product" });
  check(saved?.purchaseCost===8.125, "English product entry persists the exact KWD value");
  let feed = (await api("/api/notifications")).body;
  check(feed.notifications.some(n=>n.code==="account_created") && feed.notifications.some(n=>n.code==="product_created"), "actual account creation and product saves create persistent notifications");
  const lossValues={ name:"Notification loss test",purchaseCost:10,packagingCost:1,deliveryCost:1,paymentFee:0,paymentFeeType:"fixed",marketingCost:0,operationalCost:0,batchQuantity:1,targetMarginPercent:40,sellingPrice:5,customCosts:[] };
  const lossProduct=await api(`/api/pricing/products/${session}`,"POST",lossValues);
  check(lossProduct.status===201 && await Notification.exists({userId:first._id,code:"loss_warning","params.name":lossValues.name}), "real loss-making prices create loss warnings");
  const lowMargin={...lossValues,sellingPrice:13};
  await api(`/api/pricing/products/${session}/${lossProduct.body.product.id}`,"PUT",lowMargin);
  await api(`/api/pricing/products/${session}/${lossProduct.body.product.id}`,"PUT",lowMargin);
  check(await Notification.countDocuments({userId:first._id,code:"product_updated","params.name":lossValues.name})===1 && await Notification.countDocuments({userId:first._id,code:"margin_warning","params.name":lossValues.name})===1, "repeated product updates do not duplicate save or low-margin notifications");
  await Promise.all(Array.from({length:5},()=>api("/api/notifications/client-events","POST",{code:"validation_error",target:"details"})));
  check(await Notification.countDocuments({userId:first._id,code:"validation_error",target:"details"})===1, "concurrent repeated errors create only one alert");
  const deletedAlert=await Notification.findOne({userId:first._id,code:"validation_error",target:"details"});
  await api(`/api/notifications/${deletedAlert._id}`,"DELETE");
  await api("/api/notifications/client-events","POST",{code:"validation_error",target:"details"});
  check(!(await api("/api/notifications")).body.notifications.some(n=>n.id===String(deletedAlert._id)) && await Notification.countDocuments({userId:first._id,code:"validation_error",target:"details"})===1, "deleted alerts stay deleted after a repeated request");
  await click(".sp-notification-trigger");
  await waitFor(`document.querySelector(".sp-notification-item")`);
  await auditEnglish();
  feed=(await api("/api/notifications")).body;
  await waitFor(`Number(document.querySelector(".sp-notification-badge")?.textContent)===${feed.unreadCount}`);
  check(Number(await evaluate(`document.querySelector(".sp-notification-badge")?.textContent`))===feed.unreadCount, "bell badge matches persisted unread count");
  const firstTarget=feed.notifications[0].target;
  await click(".sp-notification-item-main");
  await waitFor(`document.querySelector(".sp-main").dataset.activeSection===${JSON.stringify(firstTarget)} && !document.querySelector(".sp-notification-panel")`);
  check((await api("/api/notifications")).body.unreadCount===feed.unreadCount-1, "clicking a notification marks it read and opens the exact destination");
  await click(".sp-notification-trigger");
  await waitFor(`document.querySelector(".sp-notification-mark-all")`);
  await click(".sp-notification-mark-all");
  await waitFor(`!document.querySelector(".sp-notification-badge")`);
  check((await api("/api/notifications")).body.unreadCount===0, "mark all read updates the database and badge");
  const deleteId=(await api("/api/notifications")).body.notifications[0].id;
  await click(".sp-notification-delete");
  await waitFor(`document.querySelectorAll(".sp-notification-item").length===${feed.notifications.length-1}`);
  check(!(await api("/api/notifications")).body.notifications.some(n=>n.id===deleteId), "notification delete control removes the owned record from the feed");
  await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});
  await waitFor(`!document.querySelector(".sp-notification-panel")`);
  check(true,"Escape closes the notification panel");
  await route("ai-advice");
  const advice = await api(`/api/pricing/advice/${session}`,"POST",{ product:{name:"Bilingual product",purchaseCost:8.125,packagingCost:1,deliveryCost:1,paymentFee:0,paymentFeeType:"fixed",marketingCost:0,operationalCost:0,batchQuantity:1,targetMarginPercent:40,sellingPrice:20,customCosts:[]},discountPercent:5 });
  check(advice.status===200 && advice.body.language==="en" && /[A-Za-z]{3}/.test(advice.body.advice) && !/\p{Script=Arabic}/u.test(advice.body.advice), "real OpenRouter advice is returned in English with unchanged server metrics");
  const destinations=["start","calculator","market-comparison","details","ai-advice","catalog","store-settings","payment-settings","account"];
  for (const lang of ["en","ar"]) {
    await language(lang);
    for(const width of [320,390,768,820,1440]) {
      await send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:width<600});
      for(const id of destinations) {
        await route(id);
        const layout=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,dir:document.documentElement.dir})`);
        check(layout.scroll<=layout.width+1 && layout.dir===(lang==="en"?"ltr":"rtl"), `${lang} ${id}: correct direction and no overflow at ${width}px`);
        if(lang==="en" && width===1440) await auditEnglish();
      }
      await click(".sp-notification-trigger");
      await waitFor(`document.querySelector(".sp-notification-panel")`);
      check(await evaluate(`(() => {const r=document.querySelector(".sp-notification-panel").getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()`), `${lang} notification panel stays within ${width}px viewport`);
      if(lang==="en") await auditEnglish();
      await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});
      if(width===1440) {
        const side=await evaluate(`({rect:document.querySelector(".sp-sidebar").getBoundingClientRect().toJSON(),width:document.documentElement.clientWidth})`);
        check(lang==="en"?side.rect.left<=1:side.rect.right>=side.width-1, `${lang} sidebar is on the appropriate side`);
      }
    }
  }
  await language("en"); await pause(500);
  await logout();
  check(await evaluate(`document.documentElement.lang==="en"`), "logout keeps the selected browser language");
  await fill("#email",emails[0]); await fill("#password","wrong password");
  await click('.spa-form button[type="submit"]');
  await waitFor(`document.querySelector('.spa-message[role="alert"]')`);
  check(!/\p{Script=Arabic}/u.test(await evaluate(`document.querySelector('.spa-message[role="alert"]').innerText`)), "incorrect-login alerts are in English");
  await login(emails[0],password);
  check(await evaluate(`document.documentElement.lang==="en"`), "signing back in restores English and the existing account");
  await logout(); await language("ar");
  await login(emails[0],password);
  await waitFor(`document.documentElement.lang==="en"`);
  check((await User.findById(first._id)).preferredLanguage==="en", "saved account preference overrides a different guest selection on sign-in");
  check((await api("/api/notifications")).body.notifications.some(n=>n.code==="product_created") && await Notification.countDocuments({userId:first._id,code:"account_created"})===1, "notifications survive logout and login without duplicate account events");
  await logout(); await language("ar"); await route("signup");
  await register("Language Test B",emails[1]);
  const second=await User.findOne({email:emails[1]});
  check(second.preferredLanguage==="ar" && (await User.findById(first._id)).preferredLanguage==="en", "different accounts retain independent language preferences");
  const firstNotification=await Notification.findOne({userId:first._id,deletedAt:null});
  check((await api(`/api/notifications/${firstNotification._id}/read`,"PATCH")).status===404 && (await api(`/api/notifications/${firstNotification._id}`,"DELETE")).status===404, "other accounts cannot read or delete another user's notifications");
  check(!(await api("/api/notifications")).body.notifications.some(n=>n.id===String(firstNotification._id)), "each notification feed is private to its user");
  const invalidLanguage=await api("/api/auth/preferences","PATCH",{language:"fr",userId:String(first._id)});
  check(invalidLanguage.status===400 && (await User.findById(second._id)).preferredLanguage==="ar", "server rejects invalid language values without changing another user's settings");
  check(exceptions.length===0, "bilingual journeys produce no browser JavaScript exceptions");
  console.log(`Bilingual integration: ${checks} checks passed.`);
} finally {
  const users=await User.find({email:{$in:emails}}).select("_id");
  const ids=users.map(user=>user._id);
  if(ids.length) {
    await Promise.all([AuthSession,Notification,PricingProduct,PricingCalculation,PricingSettings].map(model=>model.deleteMany({userId:{$in:ids}})));
    await User.deleteMany({_id:{$in:ids}});
  }
  await mongoose.disconnect();
  await send("Network.clearBrowserCookies").catch(()=>{});
  socket.close();
  console.log("Removed only this run's language test accounts and data.");
}
