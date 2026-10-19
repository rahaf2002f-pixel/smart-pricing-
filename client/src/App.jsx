import { useEffect, useMemo, useRef, useState } from "react";
import { getCalculation, saveCalculation } from "./services/pricingApi.js";

const DEFAULTS = {
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  targetMarginPercent: 50,
  comparisonSellingPrice: 16.2,
};

const FIELDS = [
  { key: "purchaseCost", label: "تكلفة شراء المنتج", number: "01", note: "من المورد" },
  { key: "deliveryCost", label: "تكلفة التوصيل", number: "02", note: "للعميل" },
  { key: "packagingCost", label: "تكلفة التغليف", number: "03", note: "لكل قطعة" },
  { key: "paymentFee", label: "رسوم الدفع الإلكتروني", number: "04", note: "للطلب" },
];

function formatKwd(value) {
  return new Intl.NumberFormat("en-KW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(value) ? value : 0);
}

function Money({ value, className = "" }) {
  return <span className={`sp-money ${className}`}><b>{formatKwd(value)}</b><small>د.ك</small></span>;
}

function getSessionId() {
  const storageKey = "smart-pricing-calculation-id";
  let sessionId = window.localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = window.crypto.randomUUID();
    window.localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

export default function App() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [connection, setConnection] = useState("checking");
  const sessionId = useRef(null);
  const initialized = useRef(false);
  const results = useMemo(() => {
    const totalCost = FIELDS.reduce((total, field) => total + inputs[field.key], 0);
    const margin = Math.min(inputs.targetMarginPercent / 100, 0.9);
    const suggestedSellingPrice = totalCost / (1 - margin);
    const suggestedProfit = suggestedSellingPrice - totalCost;
    const comparisonProfit = inputs.comparisonSellingPrice - totalCost;
    const comparisonMargin = inputs.comparisonSellingPrice > 0
      ? (comparisonProfit / inputs.comparisonSellingPrice) * 100
      : 0;
    return { totalCost, suggestedSellingPrice, suggestedProfit, comparisonProfit, comparisonMargin };
  }, [inputs]);

  useEffect(() => {
    let active = true;
    sessionId.current = getSessionId();

    getCalculation(sessionId.current)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          setInputs({
            purchaseCost: saved.purchaseCost,
            packagingCost: saved.packagingCost,
            deliveryCost: saved.deliveryCost,
            paymentFee: saved.paymentFee,
            targetMarginPercent: saved.targetMarginPercent,
            comparisonSellingPrice: saved.comparisonSellingPrice,
          });
        }
        setConnection("connected");
      })
      .catch(() => {
        if (active) setConnection("offline");
      })
      .finally(() => {
        if (active) initialized.current = true;
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized.current || !sessionId.current) return undefined;

    const timeout = window.setTimeout(() => {
      saveCalculation(sessionId.current, inputs)
        .then(() => setConnection("connected"))
        .catch(() => setConnection("offline"));
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [inputs]);

  function updateField(key, rawValue) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(value)) return;
    setInputs((current) => ({ ...current, [key]: Math.max(0, value) }));
  }

  const connectionText = {
    checking: "جارٍ الاتصال",
    connected: "متصل وقيد الحفظ",
    offline: "الحساب يعمل محليًا · تحقق من اتصال قاعدة البيانات",
  }[connection];

  return (
    <main className="stitch-pricing" dir="rtl" lang="ar">
      <header className="sp-header">
        <div className="sp-brand">
          <div className="sp-mark" aria-hidden="true"><span>س</span><i /></div>
          <div><strong>التسعير الذكي</strong><small>تسعير أوضح، ربح أفضل</small></div>
        </div>
        <div className="sp-header-side">
          <span className="sp-currency"><i /> الكويت <b>·</b> د.ك (KWD)</span>
          <span className={`sp-local connection-${connection}`} role="status" aria-live="polite" title={connectionText}>
            <i /> {connectionText}
          </span>
        </div>
      </header>

      <section className="sp-heading">
        <div className="sp-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.4"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h2"/></svg></div>
        <div><p className="sp-kicker">حاسبة تسعير المنتجات</p><h1>حاسبة تسعير المنتج</h1><p className="sp-subtitle">أدخل تكاليفك، وشاهد السعر والربح المتوقعين مباشرة.</p></div>
      </section>

      <div className="sp-workspace">
        <section className="sp-form-card" aria-labelledby="sp-costs-title">
          <div className="sp-form-head">
            <div><span className="sp-section-symbol" aria-hidden="true">▤</span><h2 id="sp-costs-title">تكاليف المنتج</h2></div>
            <span className="sp-step">١ / ٢</span>
          </div>
          <p className="sp-help">أدخل المصاريف اللازمة لكل قطعة حتى لا يفوتك أي بند.</p>

          <div className="sp-fields">
            {FIELDS.map(({ key, label, number, note }) => (
              <label className="sp-field" key={key}>
                <span className="sp-field-heading"><span className="sp-field-name">{label}</span><span className="sp-field-note">{note}</span></span>
                <span className="sp-input-shell">
                  <span className="sp-currency-label">د.ك</span>
                  <input aria-label={label} type="number" min="0" max="1000000" step="0.001" inputMode="decimal" value={inputs[key]} onChange={(event) => updateField(key, event.target.value)} />
                  <span className="sp-field-number">{number}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="sp-cost-total">
            <div><span className="sp-total-label">إجمالي تكلفة القطعة</span><small>مجموع تكاليفك المباشرة والتشغيلية</small></div>
            <Money value={results.totalCost} />
          </div>

          <div className="sp-margin">
            <div className="sp-margin-heading"><div><label htmlFor="sp-margin-range">هامش الربح المستهدف</label><small>السعر يتغير تلقائيًا مع الهامش</small></div><output htmlFor="sp-margin-range">{formatKwd(inputs.targetMarginPercent).replace(/\.000$/, "")}%</output></div>
            <div className="sp-presets" aria-label="قيم الهامش السريعة">
              {[25, 35, 50, 65].map((value) => <button type="button" className={inputs.targetMarginPercent === value ? "is-active" : ""} key={value} onClick={() => updateField("targetMarginPercent", String(value))}>{value}%</button>)}
            </div>
            <input id="sp-margin-range" className="sp-slider" aria-label="هامش الربح المستهدف" type="range" min="0" max="90" step="1" value={inputs.targetMarginPercent} onChange={(event) => updateField("targetMarginPercent", event.target.value)} />
            <div className="sp-range-labels"><span>٠٪</span><span>٩٠٪</span></div>
          </div>
        </section>

        <section className="sp-results" aria-label="نتائج التسعير">
          <article className="sp-price-card">
            <div className="sp-result-top"><span>سعر البيع المقترح</span><span className="sp-margin-tag">هامش {inputs.targetMarginPercent}٪</span></div>
            <p className="sp-result-caption">بحسب هامشك المستهدف</p>
            <Money value={results.suggestedSellingPrice} className="sp-price" />
            <div className="sp-key-stats">
              <div className="sp-stat-cost"><span>التكلفة الكلية للقطعة</span><Money value={results.totalCost} /></div>
              <div className="sp-stat-profit"><span>صافي الربح للقطعة</span><Money value={results.suggestedProfit} /></div>
            </div>
            <div className="sp-distribution">
              <div className="sp-distribution-head"><span>توزيع السعر</span><span>{inputs.targetMarginPercent}٪ ربح</span></div>
              <div className="sp-distribution-track" role="img" aria-label={`التكلفة ${100 - inputs.targetMarginPercent} بالمئة والربح ${inputs.targetMarginPercent} بالمئة`}><span style={{ width: `${100 - inputs.targetMarginPercent}%` }} /><i style={{ width: `${inputs.targetMarginPercent}%` }} /></div>
              <div className="sp-distribution-legend"><span><i className="sp-legend-cost" /> التكلفة</span><span><i className="sp-legend-profit" /> الربح</span></div>
            </div>
          </article>

          <article className="sp-compare-card">
            <div className="sp-compare-heading"><div><span className="sp-compare-step">مقارنة سريعة</span><h2>ماذا لو غيّرت سعر البيع؟</h2></div><span className="sp-compare-mark" aria-hidden="true">↔</span></div>
            <p className="sp-compare-help">غيّر السعر وشاهد الربح والهامش المتوقعين فورًا.</p>
            <label className="sp-compare-field"><span>سعر البيع للمقارنة</span><span className="sp-input-shell"><span className="sp-currency-label">د.ك</span><input aria-label="سعر البيع للمقارنة" type="number" min="0" max="1000000" step="0.001" inputMode="decimal" value={inputs.comparisonSellingPrice} onChange={(event) => updateField("comparisonSellingPrice", event.target.value)} /></span></label>
            <div className="sp-compare-stats">
              <div><span>الربح المتوقع</span><Money value={results.comparisonProfit} className={results.comparisonProfit < 0 ? "is-negative" : ""} /></div>
              <div><span>هامش الربح</span><strong className={results.comparisonMargin < 0 ? "is-negative" : ""}>{formatKwd(results.comparisonMargin)}٪</strong></div>
            </div>
          </article>
          <p className="sp-formula">هامش الربح = (سعر البيع − إجمالي التكلفة) ÷ سعر البيع</p>
        </section>
      </div>
      <footer className="sp-footer"><span>جميع الحسابات بالدينار الكويتي (د.ك)</span><span className="sp-footer-dot" /> تتحدث النتائج تلقائيًا</footer>
    </main>
  );
}
