import arabic from "./locales/ar.js";
import english from "./locales/en.js";
import common from "./common.js";
import notificationMessages from "./notificationMessages.js";
import { apiEnglish, translateApiMessage } from "../../../shared/i18n/messages.js";

export const LANGUAGE_KEY = "smart-pricing-language";
const englishMessages = { ...common, ...english, ...apiEnglish, ...notificationMessages };
const reverse = Object.fromEntries(Object.entries(englishMessages).map(([ar, en]) => [en, ar]));
const listeners = new Set();
function initialLanguage() {
  try { return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "ar"; }
  catch { return "ar"; }
}
let currentLanguage = initialLanguage();
export const getLanguage = () => currentLanguage;
export const subscribeLanguage = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export function setLanguage(language) {
  if (!["ar", "en"].includes(language)) return;
  try { window.localStorage.setItem(LANGUAGE_KEY, language); } catch { /* In-memory selection still works if storage is blocked. */ }
  if (currentLanguage === language) return;
  currentLanguage = language;
  listeners.forEach((listener) => listener());
}
export function translate(message, params = {}, language = currentLanguage) {
  if (message == null || typeof message !== "string") return message;
  const source = reverse[message] || message;
  const translated = language === "en"
    ? englishMessages[source] || translateApiMessage(source, language)
    : arabic[source] || translateApiMessage(source, language);
  return translated.replace(/\{(\w+)\}/g, (match, key) => params[key] == null ? match : String(params[key]));
}
export const localeFor = (language = currentLanguage) => language === "en" ? "en-KW" : "ar-KW-u-nu-latn";
export function formatNumber(value, options = {}, language = currentLanguage) {
  return new Intl.NumberFormat(localeFor(language), options).format(Number(value) || 0);
}
export function formatPercent(value, options = {}, language = currentLanguage) {
  return `${formatNumber(value, { maximumFractionDigits: 2, ...options }, language)}${language === "ar" ? "٪" : "%"}`;
}
export function formatDate(value, options = {}, language = currentLanguage) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(localeFor(language), { year: "numeric", month: "short", day: "numeric", ...options }).format(date);
}
