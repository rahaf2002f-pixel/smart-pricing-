import { useState } from "react";
import {
  ArrowLeft,
  BadgeHelp,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  Lightbulb,
  Menu,
  Package,
  PanelTop,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import "./ScreenshotReplica.css";

const navItems = [
  { label: "محاكي تسعير المنتجات", icon: Calculator, href: "/#calculator", active: true },
  { label: "كتالوج وهوامش التكلفة", icon: PanelTop, href: "/#catalog" },
  { label: "مقارنة سعر البيع", icon: ChartNoAxesCombined, href: "/#calculator" },
  { label: "توصيات الذكاء الاصطناعي", icon: BadgeHelp, href: "/#details", accent: "amber" },
  { label: "إعدادات الحسبة", icon: SlidersHorizontal, href: "/#details", accent: "amber" },
  { label: "رسوم الدفع وبوابات KNET", icon: CreditCard, href: "/#details" },
  { label: "عرض العملة · د.ك", icon: Settings2, href: "/#start" },
];

function ProductArtwork() {
  return (
    <div className="spr-artwork" aria-hidden="true">
      <div className="spr-art-halo" />
      <div className="spr-art-frame">
        <svg viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="spr-screen" x1="16" y1="18" x2="83" y2="86" gradientUnits="userSpaceOnUse">
              <stop stopColor="#132546" />
              <stop offset="1" stopColor="#07152A" />
            </linearGradient>
            <linearGradient id="spr-mint" x1="23" y1="31" x2="75" y2="73" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7EFFE1" />
              <stop offset="1" stopColor="#19BFA0" />
            </linearGradient>
            <linearGradient id="spr-gold" x1="34" y1="26" x2="70" y2="69" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFD18A" />
              <stop offset="1" stopColor="#EF8B37" />
            </linearGradient>
          </defs>
          <rect x="15" y="15" width="70" height="70" rx="17" fill="url(#spr-screen)" stroke="#35E0BD" strokeWidth="1.6" />
          <rect x="20" y="20" width="60" height="60" rx="12" stroke="#FFFFFF" strokeOpacity=".11" />
          <path d="M27 63.5 49.8 49l22.7 12.8-22.8 14L27 63.5Z" fill="#153E4D" stroke="#48DCC1" strokeWidth="1.3" />
          <path d="m27 63.5.2-7.2 22.6-13.8.1 6.5L27 63.5Z" fill="#1C6972" stroke="#55E9CF" strokeWidth="1.1" />
          <path d="m49.9 49 22.6 12.8v-7.1L50 41.5l-.1 7.5Z" fill="#244D5B" stroke="#55E9CF" strokeWidth="1.1" />
          <path d="m36.4 57.5 22.4-14.1 7.2 4.2-22.5 14-7.1-4.1Z" fill="#37D7B6" fillOpacity=".7" stroke="#7BFFE3" strokeWidth="1" />
          <path d="m41.9 61.5 22.5-14.1 5.3 3.1-22.5 14-5.3-3Z" fill="#F2B76E" fillOpacity=".88" stroke="#FFE1AA" strokeWidth=".9" />
          <path d="M38.8 51.7v-8.5m7.5 3.8v-8.3m7.5 3.8v-8.1" stroke="#83FFE3" strokeWidth="2" strokeLinecap="round" />
          <circle cx="39" cy="41" r="2" fill="#B7FFF0" />
          <circle cx="46.4" cy="37.4" r="2" fill="#B7FFF0" />
          <circle cx="53.9" cy="33.8" r="2" fill="#B7FFF0" />
          <path d="m65 33 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L65 33Z" fill="url(#spr-gold)" />
          <path d="M28 72h7m31 3h6" stroke="#3EDFC0" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        </svg>
      </div>
      <span className="spr-art-spark"><Sparkles size={15} strokeWidth={2.3} /></span>
    </div>
  );
}

export function ScreenshotReplica() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="spr-page" dir="rtl" lang="ar">
      <header className="spr-topbar">
        <div className="spr-top-brand">
          <div className="spr-logo" aria-hidden="true"><Sparkles size={17} /></div>
          <div className="spr-brand-copy">
            <strong>التسعير الذكي للمتاجر</strong>
            <span>Smart Pricing AI · GCC Engine</span>
          </div>
          <span className="spr-beta">نسخة MVP التجريبية</span>
        </div>
        <button className="spr-menu-toggle" type="button" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="spr-top-meta">
          <a className="spr-store-chip" href="/#calculator"><Store size={13} /><span>حسبة تسعير المنتج · د.ك</span></a>
          <a className="spr-currency-chip" href="/#start"><i /> الكويت <b>·</b> د.ك (KWD)</a>
          <a className="spr-notice" href="/#details" aria-label="إعدادات الحسبة"><Settings2 size={16} /><i /></a>
          <a className="spr-account-chip" href="/#catalog">
            <span className="spr-account-mark"><Package size={14} /></span>
            <span><strong>منتجك الحالي</strong><small>حاسبة التسعير</small></span>
          </a>
        </div>
      </header>

      <aside className={`spr-sidebar${menuOpen ? " is-open" : ""}`} aria-label="التنقل داخل التسعير الذكي">
        <div className="spr-sidebar-heading"><span>وحدات التحليل</span><i /></div>
        <nav className="spr-nav">
          {navItems.map(({ label, icon: Icon, href, active, accent }) => (
            <a
              key={label}
              className={`spr-nav-link${active ? " is-active" : ""}${accent ? ` accent-${accent}` : ""}`}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="spr-health">
          <span className="spr-health-icon"><ChartNoAxesCombined size={18} /></span>
          <div className="spr-health-copy">
            <small>متوسط هامش الربح</small>
            <strong><bdi>34.8%</bdi> صحي جدًا</strong>
          </div>
        </div>
      </aside>

      <main className="spr-main">
        <section className="spr-welcome-card" id="calculator" aria-labelledby="spr-title">
          <ProductArtwork />
          <div className="spr-locale-tag"><i /> متجر الكويت <b>·</b> KWD <i /></div>
          <h1 id="spr-title">التسعير الذكي للمتاجر</h1>
          <p className="spr-intro">احسب تكلفة وسعر بيع منتجك بدقة، مع كشف فوري لرسوم<br className="spr-desktop-break" /> KNET وهامش الربح الصافي.</p>
          <div className="spr-benefits" aria-label="مميزات الحاسبة">
            <span><ChartNoAxesCombined size={13} /> حساب فوري للأرباح <Sparkles size={13} className="spr-sparkle-small" /></span>
            <span><SlidersHorizontal size={13} /> كشف التكاليف وبوابات الدفع <Lightbulb size={13} className="spr-bulb" /></span>
            <span><ShoppingBag size={13} /> سعر البيع الأمثل <CircleDollarSign size={13} className="spr-target" /></span>
          </div>
          <a className="spr-primary-cta" href="/#calculator">
            <Calculator size={17} strokeWidth={2} />
            <span>ابدأ التسعير الآن</span>
            <ArrowLeft size={18} strokeWidth={2} />
          </a>
        </section>
      </main>
    </div>
  );
}

export default ScreenshotReplica;
