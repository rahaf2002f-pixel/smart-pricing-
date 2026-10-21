import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { updateLanguagePreference } from "../services/authApi.js";
import { getLanguage, setLanguage, subscribeLanguage, translate, formatNumber, formatPercent, formatDate } from "./runtime.js";

const Context = createContext(null);
export function I18nProvider({ children }) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "ar");
  const account = useRef(null);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const bindAccount = useCallback((user) => {
    if (user?.id && user.id !== account.current?.id) {
      setLanguage(user.preferredLanguage === "en" ? "en" : "ar");
    }
    if (user?.id !== account.current?.id) { setSaveError(false); setSaving(false); revision.current++; }
    account.current = user || null;
  }, []);
  const changeLanguage = useCallback((next) => {
    if (!["ar", "en"].includes(next)) return;
    setLanguage(next);
    setSaveError(false);
    const id = account.current?.id;
    const version = ++revision.current;
    if (!id) return;
    setSaving(true);
    // Serialize quick switches, so the last selected language also wins in MongoDB.
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (account.current?.id !== id) return;
      await updateLanguagePreference(next, id);
    }).then(() => {
      if (revision.current === version) setSaving(false);
    }).catch(() => {
      if (revision.current === version && account.current?.id === id) { setSaving(false); setSaveError(true); }
    });
  }, []);
  const dir = language === "ar" ? "rtl" : "ltr";
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.title = translate("التسعير الذكي للمتاجر", {}, language);
  }, [language, dir]);
  const value = useMemo(() => ({
    language, dir, bindAccount, changeLanguage, saving, saveError,
    t: (message, params) => translate(message, params, language),
    formatNumber: (number, options) => formatNumber(number, options, language),
    formatPercent: (number, options) => formatPercent(number, options, language),
    formatDate: (date, options) => formatDate(date, options, language),
  }), [language, dir, bindAccount, changeLanguage, saving, saveError]);
  return <Context.Provider value={value}>{children}
    {saveError && <div className="sp-language-error" role="alert">
      <span>{value.t("تغيّرت اللغة على هذا الجهاز، لكن تعذر حفظها في حسابك. أعد المحاولة.")}</span>
      <button type="button" onClick={() => changeLanguage(language)}>{value.t("إعادة المحاولة")}</button>
    </div>}
  </Context.Provider>;
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("I18nProvider is required.");
  return context;
}
