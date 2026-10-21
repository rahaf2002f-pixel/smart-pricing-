import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NOTIFICATION_DEFINITIONS } from "../../../shared/notifications.js";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  recordClientNotification,
  createDemoNotification
} from "../services/notificationsApi.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import "../notifications.css";

const MAX_LOCAL_ERRORS = 12;
const FOCUS_THROTTLE_MS = 12000;

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
}
function RefreshIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M4.8 9a7.5 7.5 0 0 1 12.6-2L20 12M4 17v-5h5" /><path d="M19.2 15a7.5 7.5 0 0 1-12.6 2L4 12" /></svg>;
}
function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>;
}
function DeleteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></svg>;
}

function newLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function errorText(error) {
  return error?.message || error?.data?.message || error?.response?.data?.message || "";
}
function definitionFor(code) {
  return NOTIFICATION_DEFINITIONS?.[code] || {
    title: "تنبيه",
    message: "تعذر الاتصال بالخدمة. تحقق من اتصالك بالإنترنت.",
    level: "notice",
    target: "signin"
  };
}

export default function NotificationBell({ user, onNavigate }) {
  const { t, dir, formatDate, formatNumber } = useI18n();
  const userId = user?.id || user?._id || null;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [localErrors, setLocalErrors] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyIds, setBusyIds] = useState([]);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const refreshRef = useRef(null);
  const refreshLock = useRef(false);
  const refreshAgain = useRef(false);
  const accountRef = useRef(userId);
  const generationRef = useRef(0);
  const mutationVersionRef = useRef(0);
  const lastFocusRefreshRef = useRef(0);
  const localQueueRef = useRef([]);
  const demoRequested = useRef(false);
  const localCache = useRef(new Map());
  const loadingMoreRef = useRef(false);

  const allItems = useMemo(() => [...localErrors, ...notifications], [localErrors, notifications]);
  const hasUnread = unreadCount > 0 || localErrors.some((item) => !item.readAt);

  const addLocalError = useCallback((code, target, message) => {
    const key = `${code}:${target}`;
    if (localCache.current.has(key)) return localCache.current.get(key);
    const definition = definitionFor(code);
    const item = {
      id: newLocalId(),
      code,
      params: {},
      target: target || definition.target,
      level: definition.level || "error",
      createdAt: new Date().toISOString(),
      readAt: null,
      localOnly: true,
      localMessage: message || ""
    };
    localCache.current.set(key, item);
    if (localCache.current.size > MAX_LOCAL_ERRORS) localCache.current.delete(localCache.current.keys().next().value);
    setLocalErrors((current) => [item, ...current].slice(0, MAX_LOCAL_ERRORS));
    return item;
  }, []);

  const tryQueue = useCallback(async (accountAtStart) => {
    if (!accountAtStart || !localQueueRef.current.length) return;
    const queue = [...localQueueRef.current];
    for (const queued of queue) {
      if (accountRef.current !== accountAtStart) return;
      try {
        await recordClientNotification(queued.code, queued.target);
        localCache.current.delete(`${queued.code}:${queued.target}`);
        localQueueRef.current = localQueueRef.current.filter((item) => item.id !== queued.id);
        setLocalErrors((current) => current.filter((item) => item.id !== queued.id));
        mutationVersionRef.current++;
      } catch {
        // Keep it explicitly local-only until the server confirms persistence.
      }
    }
  }, []);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!userId) return;
    if (refreshLock.current) {
      refreshAgain.current = true;
      return;
    }
    refreshLock.current = true;
    const requestGeneration = generationRef.current;
    const accountAtStart = userId;
    if (!quiet) setLoading(true);
    setRefreshError("");
    try {
      await tryQueue(accountAtStart);
      let keepRefreshing = true;
      while (keepRefreshing && accountRef.current === accountAtStart && generationRef.current === requestGeneration) {
        refreshAgain.current = false;
        const requestedMutationVersion = mutationVersionRef.current;
        const result = await getNotifications();
        if (accountRef.current !== accountAtStart || generationRef.current !== requestGeneration) break;
        if (requestedMutationVersion === mutationVersionRef.current) {
          setNotifications(Array.isArray(result?.notifications) ? result.notifications : []);
          setUnreadCount(Number(result?.unreadCount) || 0);
          setNextCursor(result?.nextCursor || null);
        } else {
          refreshAgain.current = true;
        }
        keepRefreshing = refreshAgain.current;
      }
    } catch (error) {
      if (accountRef.current === accountAtStart && generationRef.current === requestGeneration) {
        setRefreshError(errorText(error) || t("تعذر تحميل الإشعارات."));
      }
    } finally {
      if (generationRef.current === requestGeneration) setLoading(false);
      refreshLock.current = false;
      if (accountRef.current !== accountAtStart && accountRef.current) {
        queueMicrotask(() => refreshRef.current?.({ quiet: true }));
      }
    }
  }, [userId, t, tryQueue]);
  refreshRef.current = refresh;

  const addDemo = useCallback(async (explicit = false) => {
    if (!userId) {
      let shown = false;
      try { shown = sessionStorage.getItem("sp-notification-demo") === "shown"; } catch { /* Guest session storage can be unavailable. */ }
      if (!shown || explicit) {
        if (explicit) {
          localCache.current.delete("demo:start");
          setLocalErrors((current) => current.filter((item) => item.code !== "demo"));
        }
        addLocalError("demo", "start");
        try { sessionStorage.setItem("sp-notification-demo", "shown"); } catch { /* It remains a clearly local test. */ }
      }
      return;
    }
    try {
      await createDemoNotification(explicit);
      refresh({ quiet: true });
    } catch {
      if (explicit) setActionError("تعذر إضافة الإشعار التجريبي. أعد المحاولة.");
    }
  }, [userId, addLocalError, refresh]);
  useEffect(() => {
    if (demoRequested.current) return;
    demoRequested.current = true;
    addDemo();
  }, [addDemo]);

  useEffect(() => {
    if (accountRef.current !== userId) {
      accountRef.current = userId;
      generationRef.current++;
      mutationVersionRef.current = 0;
      refreshAgain.current = false;
      localQueueRef.current = [];
      localCache.current.clear();
      setNotifications([]);
      setLocalErrors([]);
      setUnreadCount(0);
      setNextCursor(null);
      setRefreshError("");
      setActionError("");
      setBusyIds([]);
      setLoading(Boolean(userId));
    }
    if (!userId) {
      setLoading(false);
      return undefined;
    }
    refresh({ quiet: false });
    return undefined;
  }, [userId, refresh]);

  useEffect(() => {
    const onRefresh = () => refresh({ quiet: true });
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < FOCUS_THROTTLE_MS) return;
      lastFocusRefreshRef.current = now;
      refresh({ quiet: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    const onClientNotification = (event) => {
      const code = event?.detail?.code;
      if (!code) return;
      const target = event?.detail?.target || definitionFor(code).target;
      if (!userId) {
        addLocalError(code, target);
        return;
      }
      const accountAtStart = userId;
      recordClientNotification(code, target).then(() => {
        if (accountRef.current !== accountAtStart) return;
        mutationVersionRef.current++;
        refresh({ quiet: true });
      }).catch((error) => {
        if (accountRef.current !== accountAtStart) return;
        const local = addLocalError(code, target, errorText(error));
        if (!localQueueRef.current.some((item) => item.id === local.id)) localQueueRef.current = [...localQueueRef.current, { id: local.id, code, target }].slice(-MAX_LOCAL_ERRORS);
        setActionError(t("تعذر حفظ التنبيه في الحساب. سيبقى محلياً مؤقتاً، ويمكنك إعادة المحاولة."));
      });
    };
    window.addEventListener("sp-notifications-refresh", onRefresh);
    window.addEventListener("focus", onFocus);
    window.addEventListener("sp-client-notification", onClientNotification);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("sp-notifications-refresh", onRefresh);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("sp-client-notification", onClientNotification);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, refresh, addLocalError, t]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const setBusy = (id, value) => setBusyIds((current) => value
    ? [...new Set([...current, id])]
    : current.filter((busyId) => busyId !== id));

  const markRead = async (item) => {
    if (item.readAt) return true;
    if (item.localOnly) {
      setLocalErrors((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      return true;
    }
    setBusy(item.id, true);
    setActionError("");
    try {
      await markNotificationRead(item.id);
      mutationVersionRef.current++;
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    } catch (error) {
      setActionError(errorText(error) || t("تعذر تحديث الإشعار. أعد المحاولة."));
      return false;
    } finally {
      setBusy(item.id, false);
    }
  };

  const handleOpenItem = async (item) => {
    const marked = await markRead(item);
    if (!marked) return;
    setOpen(false);
    const target = userId || ["start", "signup", "signin"].includes(item.target) ? item.target : "signin";
    if (typeof target === "string" && target && !/^https?:|^\/\//i.test(target)) onNavigate?.(target);
  };

  const markAll = async () => {
    const unreadServerItems = notifications.filter((item) => !item.readAt);
    if (!unreadServerItems.length && !localErrors.some((item) => !item.readAt)) return;
    setActionError("");
    setBusy("all", true);
    try {
      if (userId && unreadServerItems.length) await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      setLocalErrors((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      setUnreadCount(0);
      mutationVersionRef.current++;
    } catch (error) {
      setActionError(errorText(error) || t("تعذر تحديد الإشعارات كمقروءة. أعد المحاولة."));
    } finally {
      setBusy("all", false);
    }
  };

  const removeItem = async (event, item) => {
    event.stopPropagation();
    setActionError("");
    setBusy(item.id, true);
    try {
      if (item.localOnly) {
        localCache.current.delete(`${item.code}:${item.target}`);
        setLocalErrors((current) => current.filter((entry) => entry.id !== item.id));
        localQueueRef.current = localQueueRef.current.filter((entry) => entry.id !== item.id);
      } else {
        await deleteNotification(item.id);
        mutationVersionRef.current++;
        setNotifications((current) => current.filter((entry) => entry.id !== item.id));
        if (!item.readAt) setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      setActionError(errorText(error) || t("تعذر حذف الإشعار. أعد المحاولة."));
    } finally {
      setBusy(item.id, false);
    }
  };

  const loadMore = async () => {
    if (!userId || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setActionError("");
    const accountAtStart = userId;
    const requestGeneration = generationRef.current;
    try {
      const result = await getNotifications(nextCursor);
      if (accountRef.current !== accountAtStart || generationRef.current !== requestGeneration) return;
      setNotifications((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...(result?.notifications || []).filter((item) => !known.has(item.id))];
      });
      setNextCursor(result?.nextCursor || null);
    } catch (error) {
      setActionError(errorText(error) || t("تعذر تحميل الإشعارات."));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return t("الوقت غير متاح");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("الوقت غير متاح");
    const dateLabel = formatDate(date, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const elapsed = Date.now() - date.getTime();
    if (elapsed >= 0 && elapsed < 60000) return `${t("منذ قليل")} · ${dateLabel}`;
    return dateLabel;
  };
  const totalUnread = unreadCount + localErrors.filter((item) => !item.readAt).length;
  const unreadLabel = formatNumber(Math.min(99, totalUnread));

  return (
    <div className="sp-notification-root" ref={rootRef} dir={dir}>
      <button
        className="sp-notification-trigger"
        type="button"
        aria-label={t("الإشعارات")}
        aria-expanded={open}
        aria-controls="sp-notification-panel"
        title={t("الإشعارات")}
        onClick={() => {
          setOpen((value) => !value);
          if (!open && userId) refresh({ quiet: true });
        }}
      >
        <BellIcon />
        {totalUnread > 0 && <span className="sp-notification-badge">{unreadLabel}{totalUnread > 99 ? "+" : ""}</span>}
        {hasUnread && unreadCount === 0 && <span className="sp-notification-new-dot" aria-hidden="true" />}
        <span className="sp-sr-only">{t("الإشعارات")}{totalUnread ? `, ${unreadLabel} ${t("غير مقروء")}` : ""}</span>
      </button>
      {open && (
        <section className="sp-notification-panel" id="sp-notification-panel" aria-labelledby="sp-notification-title" aria-busy={loading || loadingMore}>
          <header className="sp-notification-heading">
            <div>
              <h2 id="sp-notification-title">{t("الإشعارات")}</h2>
              <p>{t("مركز التنبيهات")}</p>
            </div>
            <div className="sp-notification-heading-actions">
              {allItems.some((item) => !item.readAt) && (
                <button className="sp-notification-mark-all" type="button" disabled={busyIds.includes("all")} onClick={markAll}>
                  {t("تحديد الكل كمقروء")}
                </button>
              )}
              <button className="sp-notification-icon-button" type="button" aria-label={t("تحديث الإشعارات")} title={t("تحديث الإشعارات")} disabled={loading} onClick={() => refresh({ quiet: false })}>
                <RefreshIcon />
              </button>
              <button className="sp-notification-icon-button" type="button" aria-label={t("إغلاق الإشعارات")} title={t("إغلاق الإشعارات")} onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
          </header>
          {(refreshError || actionError) && (
            <div className={`sp-notification-alert${localQueueRef.current.length ? " is-local" : ""}`} role="alert">
              {t(actionError || refreshError)}
              {localQueueRef.current.length > 0 && <button type="button" onClick={() => refresh({ quiet: true })}>{t("إعادة المحاولة")}</button>}
            </div>
          )}
          <div className="sp-notification-list" ref={listRef} role="list">
            {loading && !allItems.length ? (
              <div className="sp-notification-skeleton" aria-label={t("جارٍ تحميل الإشعارات")}><i /><i /><i /></div>
            ) : !allItems.length ? (
              refreshError ? (
                <div className="sp-notification-state">
                  <strong>{t("تعذر تحميل الإشعارات.")}</strong>
                  <p>{refreshError}</p>
                  <button type="button" onClick={() => refresh({ quiet: false })}>{t("إعادة المحاولة")}</button>
                </div>
              ) : (
                <div className="sp-notification-state">
                  <strong>{t("لا توجد إشعارات بعد")}</strong>
                  <p>{t("ستظهر هنا تحديثات حسابك وتنبيهات التسعير المهمة.")}</p>
                </div>
              )
            ) : allItems.map((item) => {
              const definition = definitionFor(item.code);
              const localOnly = Boolean(item.localOnly);
              const title = t(definition.title || "تنبيه");
              const message = item.localMessage
                ? (userId ? t("تعذر حفظ التنبيه في الحساب. سيبقى محلياً مؤقتاً، ويمكنك إعادة المحاولة.") : t("تم حفظ هذا التنبيه على هذا الجهاز فقط؛ لم يتم حفظه في الحساب."))
                : t(definition.message || "تعذر الاتصال بالخدمة. تحقق من اتصالك بالإنترنت.", item.params || {});
              return (
                <article className={`sp-notification-item${!item.readAt ? " is-unread" : ""}${localOnly ? " is-local-only" : ""}`} key={item.id} role="listitem">
                  <button className="sp-notification-item-main" type="button" onClick={() => handleOpenItem(item)} disabled={busyIds.includes(item.id)}>
                    <span className="sp-notification-item-title">
                      {!item.readAt && <i className="sp-notification-unread-mark" aria-hidden="true" />}
                      <span>{title}</span>
                    </span>
                    <span className="sp-notification-item-message">{message}</span>
                    <span className="sp-notification-item-meta">
                      <i className={`sp-notification-level ${definition.level === "warning" ? "warning" : ["error", "danger"].includes(definition.level) ? "error" : ""}`} aria-hidden="true" />
                      <time dateTime={item.createdAt || undefined}>{formatTimestamp(item.createdAt)}</time>
                      {localOnly && <span className="sp-notification-local-tag">{t("محلي فقط")}</span>}
                    </span>
                  </button>
                  <button className="sp-notification-icon-button sp-notification-delete" type="button" aria-label={t("حذف الإشعار")} title={t("حذف الإشعار")} disabled={busyIds.includes(item.id)} onClick={(event) => removeItem(event, item)}>
                    <DeleteIcon />
                  </button>
                </article>
              );
            })}
          </div>
          <div className="sp-notification-more-wrap"><button className="sp-notification-more sp-notification-demo" type="button" onClick={() => addDemo(true)}>{t("إضافة إشعار تجريبي")}</button></div>
          {userId && nextCursor && (
            <div className="sp-notification-more-wrap">
              <button className="sp-notification-more" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? t("جارٍ التحميل") : t("تحميل المزيد")}</button>
            </div>
          )}
          {localQueueRef.current.length > 0 && <div className="sp-notification-footer-note">{t("لم يتم حفظ بعض التنبيهات في الحساب.")}</div>}
        </section>
      )}
    </div>
  );
}
