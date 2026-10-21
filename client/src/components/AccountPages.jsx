import { useRef, useState } from "react";
import { loginAccount, registerAccount, updateAccount } from "../services/authApi.js";

const COPY = {
  requiredName: "أدخل الاسم الكامل.",
  nameLength: "يجب أن يتكوّن الاسم من حرفين على الأقل.",
  invalidEmail: "أدخل بريدًا إلكترونيًا صالحًا.",
  requiredPassword: "أدخل كلمة المرور.",
  passwordLength: "يجب أن تتكوّن كلمة المرور من 10 أحرف على الأقل.",
  passwordMismatch: "كلمتا المرور غير متطابقتين.",
  requiredCurrentPassword: "أدخل كلمة المرور الحالية لتأكيد التعديلات.",
  saveError: "تعذّر إتمام الطلب الآن. حاول مرة أخرى بعد قليل.",
  formError: "يرجى مراجعة البيانات المدخلة.",
};

const FIELD_LABELS = {
  fullName: "الاسم الكامل",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  confirmPassword: "تأكيد كلمة المرور",
  currentPassword: "كلمة المرور الحالية",
  newPassword: "كلمة المرور الجديدة",
};

function getFieldErrorMap(error) {
  const source = error?.errors;
  if (!source || typeof source !== "object") return {};

  return Object.keys(source).reduce((messages, field) => {
    if (Object.hasOwn(FIELD_LABELS, field) && typeof source[field] === "string") {
      messages[field] = source[field];
      return messages;
    }
    const key = field.toLowerCase();
    if (key.includes("email")) messages.email = COPY.invalidEmail;
    else if (key.includes("confirm")) messages.confirmPassword = COPY.passwordMismatch;
    else if (key.includes("current")) messages.currentPassword = COPY.requiredCurrentPassword;
    else if (key.includes("password")) messages.password = COPY.passwordLength;
    else if (key.includes("name")) messages.fullName = COPY.nameLength;
    return messages;
  }, {});
}

function AccountIcon({ name }) {
  if (name === "arrow") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  }
  if (name === "user") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.6 3.2-5.5 7.5-5.5s6.8 1.9 7.5 5.5" /></svg>;
  }
  if (name === "mail") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

function AccountField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  placeholder,
  required = true,
  minLength,
  maxLength,
  direction = "rtl",
  revealable = false,
  revealed,
  onToggleReveal,
}) {
  return (
    <div className={`spa-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`spa-input-wrap${direction === "ltr" ? " is-ltr" : ""}`}>
        {type === "email" && <AccountIcon name="mail" />}
        {type === "password" && <AccountIcon name="lock" />}
        {type === "text" && id === "fullName" && <AccountIcon name="user" />}
        <input
          id={id}
          name={id}
          type={revealable && revealed ? "text" : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          dir={direction}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {revealable && (
          <button
            className="spa-reveal"
            type="button"
            onClick={onToggleReveal}
            aria-label={revealed ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            aria-pressed={revealed}
          >
            {revealed ? "إخفاء" : "إظهار"}
          </button>
        )}
      </div>
      {error && <span className="spa-field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

export default function AccountPages({
  mode = "signin",
  user,
  notice = "",
  onAuthenticated,
  onUserUpdated,
  navigateTo,
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [messageKind, setMessageKind] = useState("error");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState({});
  const inFlight = useRef(false);

  const isSignup = mode === "signup";
  const isAccount = mode === "account";
  const isEdit = isAccount && editing;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    if (formMessage) setFormMessage("");
  }

  function toggleReveal(key) {
    setRevealed((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  function goTo(id, event) {
    if (navigateTo) navigateTo(id, event);
    else if (typeof window !== "undefined") window.location.hash = id;
  }

  function validate() {
    const next = {};
    if (isSignup && form.fullName.trim().length < 2) next.fullName = COPY.nameLength;
    if (isEdit && form.fullName.trim().length < 2) next.fullName = COPY.nameLength;
    if (!isAccount && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = COPY.invalidEmail;
    if (isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = COPY.invalidEmail;
    if (isSignup || mode === "signin") {
      if (form.password.length < 10) next.password = form.password ? COPY.passwordLength : COPY.requiredPassword;
    }
    if (isSignup && form.password !== form.confirmPassword) next.confirmPassword = COPY.passwordMismatch;
    if (isEdit) {
      if (!form.currentPassword) next.currentPassword = COPY.requiredCurrentPassword;
      if (form.newPassword && form.newPassword.length < 10) next.newPassword = COPY.passwordLength;
      if (form.newPassword && form.newPassword !== form.confirmPassword) next.confirmPassword = COPY.passwordMismatch;
      if (!form.newPassword && form.confirmPassword) next.confirmPassword = "اترك تأكيد كلمة المرور فارغًا إذا لم ترغب في تغييرها.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current || !validate()) return;
    inFlight.current = true;
    setLoading(true);
    setFormMessage("");

    try {
      if (isSignup) {
        const result = await registerAccount({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        onAuthenticated?.(result.user, result.message, "signup");
      } else if (mode === "signin") {
        const result = await loginAccount({ email: form.email.trim(), password: form.password });
        onAuthenticated?.(result.user, result.message, "signin");
      } else {
        const result = await updateAccount({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.newPassword ? form.confirmPassword : "",
        });
        onUserUpdated?.(result.user);
        setEditing(false);
        setForm((previous) => ({ ...previous, currentPassword: "", newPassword: "", confirmPassword: "" }));
        setMessageKind("success");
        setFormMessage(result.message || "تم حفظ بيانات الحساب.");
      }
    } catch (error) {
      const mappedErrors = getFieldErrorMap(error);
      if (isEdit && mappedErrors.password) mappedErrors.newPassword = mappedErrors.password;
      setErrors(mappedErrors);
      setMessageKind("error");
      setFormMessage(error.message || (Object.keys(mappedErrors).length ? COPY.formError : COPY.saveError));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function beginEditing() {
    setForm((previous) => ({
      ...previous,
      fullName: user?.fullName || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setErrors({});
    setFormMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setErrors({});
    setFormMessage("");
    setForm((previous) => ({ ...previous, currentPassword: "", newPassword: "", confirmPassword: "" }));
  }

  if (isAccount && !user) {
    return (
      <div className="spa-page" dir="rtl" lang="ar">
        <section className="spa-card spa-card-compact" aria-labelledby="spa-account-needed">
          <span className="spa-mark" aria-hidden="true"><AccountIcon name="user" /></span>
          <p className="spa-kicker">مساحة الحساب</p>
          <h1 id="spa-account-needed">سجّل الدخول لعرض بياناتك</h1>
          <p className="spa-intro">تظهر هنا بيانات الحساب المحفوظة بعد تسجيل الدخول.</p>
          <button className="spa-primary" type="button" onClick={(event) => goTo("signin", event)}>تسجيل الدخول <AccountIcon name="arrow" /></button>
        </section>
      </div>
    );
  }

  if (isAccount && !isEdit) {
    return (
      <div className="spa-page" dir="rtl" lang="ar">
        <section className="spa-card spa-account-card" aria-labelledby="spa-account-title">
          <div className="spa-card-topline"><span className="spa-status"><i /> حساب محفوظ</span><span className="spa-kicker">ملف المتجر</span></div>
          <div className="spa-account-heading">
            <span className="spa-avatar" aria-hidden="true">{(user?.fullName || "م").trim().charAt(0)}</span>
            <div><p className="spa-kicker">أهلًا بك</p><h1 id="spa-account-title">{user?.fullName || "حسابك"}</h1></div>
          </div>
          <div className="spa-profile-list">
            <div><span>الاسم الكامل</span><strong>{user?.fullName || "—"}</strong></div>
            <div><span>البريد الإلكتروني</span><strong dir="ltr">{user?.email || "—"}</strong></div>
            <div><span>حالة الملف</span><strong>{user?.profileCompleted ? "مكتمل" : "بيانات الحساب محفوظة"}</strong></div>
          </div>
          {(formMessage || notice) && <p className="spa-message is-success" role="status">{formMessage || notice}</p>}
          <div className="spa-account-actions">
            <button className="spa-primary" type="button" onClick={beginEditing}>تعديل بيانات الحساب <AccountIcon name="arrow" /></button>
            <p>بياناتك ومنتجاتك مرتبطة بحسابك وتبقى محفوظة عند دخولك مجددًا. بيانات وضع الزائر مستقلة.</p>
          </div>
        </section>
      </div>
    );
  }

  const title = isEdit ? "تعديل بيانات الحساب" : isSignup ? "افتح حسابك" : "مرحبًا بعودتك";
  const intro = isEdit
    ? "حدّث الاسم أو البريد. أدخل كلمة المرور الحالية لتأكيد التعديل."
    : isSignup
      ? "احفظ بيانات دخولك وارجع إلى مساحة تسعيرك متى احتجت."
      : "سجّل الدخول للعودة إلى بيانات حسابك المحفوظة.";

  return (
    <div className="spa-page" dir="rtl" lang="ar">
      <section className={`spa-card${isEdit ? " spa-edit-card" : ""}`} aria-labelledby="spa-form-title">
        <div className="spa-account-aside" aria-hidden="true">
          <div className="spa-aside-orbit spa-orbit-one" />
          <div className="spa-aside-orbit spa-orbit-two" />
          <span className="spa-aside-mark"><AccountIcon name="lock" /></span>
          <span className="spa-aside-wordmark">SMART PRICING <b>AI</b></span>
          <p>أسعار أوضح.<br />قرارات أهدأ.</p>
          <span className="spa-aside-note">مساحة عمل المتجر</span>
        </div>
        <div className="spa-form-side">
          <div className="spa-card-topline"><span className="spa-kicker">التسعير الذكي للمتاجر</span><span className="spa-locale">الكويت <i /> KWD</span></div>
          <div className="spa-heading">
            <span className="spa-form-icon"><AccountIcon name={isSignup ? "user" : "lock"} /></span>
            <p className="spa-kicker">{isEdit ? "إعدادات الحساب" : isSignup ? "حساب جديد" : "تسجيل الدخول"}</p>
            <h1 id="spa-form-title">{title}</h1>
            <p className="spa-intro">{intro}</p>
          </div>

          {(notice || formMessage) && (
            <p className={`spa-message ${!formMessage || messageKind === "success" ? "is-success" : "is-error"}`} role={formMessage && messageKind === "error" ? "alert" : "status"}>
              {formMessage || notice}
            </p>
          )}

          <form className="spa-form" onSubmit={handleSubmit} noValidate>
            {(isSignup || isEdit) && (
              <AccountField id="fullName" label="الاسم الكامل" value={form.fullName} onChange={updateField} autoComplete="name" placeholder="مثال: نورة العتيبي" error={errors.fullName} maxLength={100} />
            )}
            {(mode === "signin" || isSignup || isEdit) && (
              <AccountField id="email" label="البريد الإلكتروني" type="email" direction="ltr" value={form.email} onChange={updateField} autoComplete="email" placeholder="name@example.com" error={errors.email} maxLength={254} />
            )}
            {mode === "signin" && (
              <AccountField id="password" label="كلمة المرور" type="password" value={form.password} onChange={updateField} autoComplete="current-password" placeholder="أدخل كلمة المرور" error={errors.password} minLength={10} maxLength={128} revealable revealed={Boolean(revealed.password)} onToggleReveal={() => toggleReveal("password")} />
            )}
            {isSignup && (
              <>
                <AccountField id="password" label="كلمة المرور" type="password" value={form.password} onChange={updateField} autoComplete="new-password" placeholder="10 أحرف على الأقل" error={errors.password} minLength={10} maxLength={128} revealable revealed={Boolean(revealed.password)} onToggleReveal={() => toggleReveal("password")} />
                <AccountField id="confirmPassword" label="تأكيد كلمة المرور" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" error={errors.confirmPassword} minLength={10} maxLength={128} revealable revealed={Boolean(revealed.confirmPassword)} onToggleReveal={() => toggleReveal("confirmPassword")} />
              </>
            )}
            {isEdit && (
              <>
                <AccountField id="currentPassword" label="كلمة المرور الحالية" type="password" value={form.currentPassword} onChange={updateField} autoComplete="current-password" placeholder="لتأكيد تعديل بياناتك" error={errors.currentPassword} maxLength={128} revealable revealed={Boolean(revealed.currentPassword)} onToggleReveal={() => toggleReveal("currentPassword")} />
                <div className="spa-form-divider"><span>تغيير كلمة المرور اختياري</span></div>
                <AccountField id="newPassword" label="كلمة المرور الجديدة" type="password" value={form.newPassword} onChange={updateField} autoComplete="new-password" placeholder="اتركه فارغًا للإبقاء عليها" error={errors.newPassword} required={false} minLength={10} maxLength={128} revealable revealed={Boolean(revealed.newPassword)} onToggleReveal={() => toggleReveal("newPassword")} />
                <AccountField id="confirmPassword" label="تأكيد كلمة المرور الجديدة" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" placeholder="أعد كتابة كلمة المرور الجديدة" error={errors.confirmPassword} required={false} maxLength={128} revealable revealed={Boolean(revealed.confirmPassword)} onToggleReveal={() => toggleReveal("confirmPassword")} />
              </>
            )}
            {isSignup && <p className="spa-privacy-note">سيكون لحسابك مساحة مستقلة. لا تنتقل الحسبات والمنتجات المجهولة تلقائيًا إلى الحساب.</p>}
            <button className="spa-primary spa-submit" type="submit" disabled={loading}>
              <span>{loading ? "جارٍ حفظ البيانات…" : isEdit ? "حفظ التعديلات" : isSignup ? "إنشاء حساب" : "تسجيل الدخول"}</span>
              {!loading && <AccountIcon name="arrow" />}
            </button>
            {isEdit && <button className="spa-secondary" type="button" onClick={cancelEditing} disabled={loading}>إلغاء التعديل</button>}
          </form>

          {!isEdit && (
            <div className="spa-switch">
              <span>{isSignup ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"}</span>
              <button type="button" onClick={(event) => goTo(isSignup ? "signin" : "signup", event)}>{isSignup ? "تسجيل الدخول" : "إنشاء حساب"}</button>
            </div>
          )}
          <p className="spa-footnote">بيانات حسابك محفوظة بأمان في مساحة مستقلة عن جلسة التصفح.</p>
        </div>
      </section>
    </div>
  );
}
