import { useEffect, useRef, useState } from "react";
import App from "./App.jsx";
import { getCurrentUser, logoutAccount } from "./services/authApi.js";
import { setPricingAccount } from "./services/pricingApi.js";
import { useI18n } from "./i18n/I18nProvider.jsx";
import { setNotificationAccount } from "./services/notificationsApi.js";

export default function AccountRoot() {
  const { t, dir, bindAccount } = useI18n();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const currentUser = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async (force = false) => {
      if (force) setChecking(true);
      try {
        const result = await getCurrentUser();
        if (!active) return;
        bindAccount(result.user);
        if (force || result.user?.id !== currentUser.current?.id) {
          currentUser.current = result.user;
          setUser(result.user);
          if (force) window.history.replaceState(null, "", result.user ? "#account" : "#signin");
        }
        setError("");
      } catch (failure) {
        if (active) setError(failure.message);
      } finally {
        if (active) setChecking(false);
      }
    };
    load();
    const refresh = () => load(true);
    // A second tab may have signed in to a different account: never save stale drafts there.
    const checkOnFocus = () => load();
    window.addEventListener("sp-account-changed", refresh);
    window.addEventListener("focus", checkOnFocus);
    return () => {
      active = false;
      window.removeEventListener("sp-account-changed", refresh);
      window.removeEventListener("focus", checkOnFocus);
    };
  }, [retry, bindAccount]);

  function authenticated(nextUser, message) {
    bindAccount(nextUser);
    currentUser.current = nextUser;
    window.history.replaceState(null, "", "#account");
    setNotice(message || "");
    setError("");
    setUser(nextUser);
  }

  async function signOut() {
    if (accountBusy) return;
    setAccountBusy(true);
    try {
      await logoutAccount();
      window.history.replaceState(null, "", "#signin");
      currentUser.current = null;
      bindAccount(null);
      setUser(null);
      setNotice("تم تسجيل الخروج بأمان.");
      setError("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setAccountBusy(false);
    }
  }

  setPricingAccount(user?.id ?? null);
  setNotificationAccount(user?.id ?? null);
  if (checking || (error && !user)) {
    return <div className="spa-session-loading" dir={dir}>
      {checking ? <p role="status">{t("جارٍ التحقق من الحساب المحفوظ…")}</p> : <>
        <p role="alert">{t(error)}</p>
        <button className="spa-primary" type="button" onClick={() => { setChecking(true); setRetry((value) => value + 1); }}>{t("إعادة المحاولة")}</button>
      </>}
    </div>;
  }
  return <App
    key={user?.id || "guest"}
    user={user}
    accountNotice={notice}
    accountBusy={accountBusy}
    accountError={error}
    onAuthenticated={authenticated}
    onUserUpdated={(nextUser) => { currentUser.current = nextUser; setUser(nextUser); }}
    onLogout={signOut}
  />;
}
