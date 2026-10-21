import { useI18n } from "./I18nProvider.jsx";

export default function LanguageSwitcher() {
  const { language, changeLanguage, t, saving } = useI18n();
  return <label className="sp-language-switcher">
    <span>{t("اللغة")}</span>
    <select aria-label={t("اللغة")} value={language} onChange={(event) => changeLanguage(event.target.value)}>
      <option value="ar" lang="ar">العربية</option>
      <option value="en" lang="en">English</option>
    </select>
    {saving && <span className="sp-sr-only" role="status">{t("جارٍ حفظ اللغة…")}</span>}
  </label>;
}
