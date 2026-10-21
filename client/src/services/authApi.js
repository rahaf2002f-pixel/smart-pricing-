import { getLanguage } from "../i18n/runtime.js";
import { notifyClient, refreshNotifications } from "./notificationsApi.js";

async function authRequest(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Smart-Pricing": "1", "Accept-Language": getLanguage(), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    if (path !== "me" && path !== "preferences") notifyClient("connection_error", path === "register" ? "signup" : path === "login" ? "signin" : "account");
    throw new Error("تعذر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (path !== "me" && path !== "preferences") notifyClient(path === "login" ? "login_failed" : response.status === 400 ? "validation_error" : "save_failed", path === "register" ? "signup" : path === "login" ? "signin" : "account");
    const error = new Error(data.message || "تعذر إكمال طلب الحساب. أعد المحاولة.");
    error.errors = data.errors || {};
    error.status = response.status;
    if (response.status === 401 && path === "profile") window.dispatchEvent(new Event("sp-account-changed"));
    throw error;
  }
  if (path === "profile") refreshNotifications();
  return data;
}

export const getCurrentUser = () => authRequest("me");
export const registerAccount = (body) => authRequest("register", { method: "POST", body });
export const loginAccount = (body) => authRequest("login", { method: "POST", body });
export const logoutAccount = () => authRequest("logout", { method: "POST" });
export const updateAccount = (body) => authRequest("profile", { method: "PATCH", body });
export const updateLanguagePreference = (language, userId) => authRequest("preferences", {
  method: "PATCH", body: { language }, headers: { "X-SP-Account": userId },
});
