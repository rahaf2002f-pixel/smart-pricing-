import { getLanguage } from "../i18n/runtime.js";
let ownerId = null;
export const setNotificationAccount = (id) => { ownerId = id; };
export function notifyClient(code, target = "start") {
  window.dispatchEvent(new CustomEvent("sp-client-notification", { detail: { code, target } }));
}
export const refreshNotifications = () => window.dispatchEvent(new Event("sp-notifications-refresh"));
async function request(path = "", method = "GET", body) {
  const response = await fetch(`/api/notifications${path}`, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "Accept-Language": getLanguage(), "X-Smart-Pricing": "1", "X-SP-Account": ownerId || "guest" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("sp-account-changed"));
    throw new Error(data.message || "تعذر تحميل الإشعارات. أعد المحاولة.");
  }
  return data;
}
export const getNotifications = (before) => request(before ? `?before=${encodeURIComponent(before)}` : "");
export const markNotificationRead = (id) => request(`/${id}/read`, "PATCH");
export const markAllNotificationsRead = () => request("/read-all", "PATCH");
export const deleteNotification = (id) => request(`/${id}`, "DELETE");
export const recordClientNotification = (code, target) => request("/client-events", "POST", { code, target });
export const createDemoNotification = (reset = false) => request("/demo", "POST", { reset });
