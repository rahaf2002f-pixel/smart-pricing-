import { getLanguage } from "../i18n/runtime.js";
import { notifyClient, refreshNotifications } from "./notificationsApi.js";

let currentAccountId = null;
export function setPricingAccount(accountId) { currentAccountId = accountId; }
function workspaceFetch(url, options = {}) {
  const target = url.includes("/products") ? "details" : url.includes("/settings") ? "store-settings" : url.includes("/advice") ? "ai-advice" : "calculator";
  return fetch(url, { ...options, cache: "no-store", headers: {
    ...options.headers, "X-SP-Account": currentAccountId || "guest", "Accept-Language": getLanguage(),
  } }).then((response) => {
    if (response.ok && options.method && options.method !== "GET") refreshNotifications();
    if (!response.ok && response.status !== 404 && response.status !== 401) notifyClient(response.status === 400 ? "validation_error" : "save_failed", target);
    return response;
  }).catch(() => {
    notifyClient("connection_error", target);
    throw new Error("تعذر الاتصال بالخادم.");
  });
}

export async function getCalculation(sessionId) {
  const response = await workspaceFetch(`/api/pricing/calculations/${sessionId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function saveCalculation(sessionId, inputs) {
  const response = await workspaceFetch(`/api/pricing/calculations/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function getProducts(sessionId) {
  const response = await workspaceFetch(`/api/pricing/products/${sessionId}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const body = await response.json();
  return body.products;
}

export async function createProduct(sessionId, product) {
  const response = await workspaceFetch(`/api/pricing/products/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).product;
}

export async function updateProduct(sessionId, productId, product) {
  const response = await workspaceFetch(`/api/pricing/products/${sessionId}/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).product;
}

export async function deleteProduct(sessionId, productId) {
  const response = await workspaceFetch(`/api/pricing/products/${sessionId}/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function getPricingSettings(sessionId) {
  const response = await workspaceFetch(`/api/pricing/settings/${sessionId}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).settings;
}

export async function savePricingSettings(sessionId, settings) {
  const response = await workspaceFetch(`/api/pricing/settings/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).settings;
}

export async function requestPricingAdvice(sessionId, product, discountPercent) {
  const response = await workspaceFetch(`/api/pricing/advice/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, discountPercent }),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

async function getErrorMessage(response) {
  if (response.status === 401) window.dispatchEvent(new Event("sp-account-changed"));
  try {
    const body = await response.json();
    return body.message || "تعذر الاتصال بالخادم.";
  } catch {
    return "تعذر الاتصال بالخادم.";
  }
}
