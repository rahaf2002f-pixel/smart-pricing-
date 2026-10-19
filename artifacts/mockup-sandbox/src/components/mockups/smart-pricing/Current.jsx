import { useEffect, useMemo, useRef, useState } from "react";
import "./_group.css";
import { getCalculation, saveCalculation } from "./apiStub.js";

const DEFAULTS = {
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  targetMarginPercent: 50,
  comparisonSellingPrice: 16.2,
};

const FIELDS = [
  { key: "purchaseCost", label: "تكلفة شراء المنتج", icon: "01" },
  { key: "packagingCost", label: "تكلفة التغليف", icon: "02" },
  { key: "deliveryCost", label: "تكلفة التوصيل", icon: "03" },
  { key: "paymentFee", label: "رسوم الدفع الإلكتروني", icon: "04" },
];

function formatKwd(value) {
  return new Intl.NumberFormat("ar-KW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(value) ? value : 0);
}

function calculateLocally(inputs) {
  const totalCost = FIELDS.reduce((sum, field) => sum + inputs[field.key], 0);
  const margin = inputs.targetMarginPercent / 100;
  const suggestedSellingPrice = totalCost / (1 - margin);
  const suggestedProfit = suggestedSellingPrice - totalCost;
  const comparisonProfit = inputs.comparisonSellingPrice - totalCost;
  const comparisonMargin =
    inputs.comparisonSellingPrice > 0
      ? (comparisonProfit / inputs.comparisonSellingPrice) * 100
      : 0;

  return {
    totalCost,
    suggestedSellingPrice,
    suggestedProfit,
    comparisonProfit,
    comparisonMargin,
  };
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

function Money({ value, negative = false }) {
  return (
    <span className={negative ? "money money-negative" : "money"}>
      {formatKwd(value)}
      <small>د.ك</small>
    </span>
  );
}

function App() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [connection, setConnection] = useState("checking");
  const sessionId = useRef(null);
  const initialized = useRef(false);
  const results = useMemo(() => calculateLocally(inputs), [inputs]);

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

  function updateField(key, value) {
    if (value === "") {
      setInputs((current) => ({ ...current, [key]: 0 }));
      return;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setInputs((current) => ({ ...current, [key]: number }));
  }

  const connectionText = {
    checking: "جارٍ الاتصال",
    connected: "متصل وقيد الحفظ",
    offline: "الحساب يعمل محليًا · تحقق من اتصال قاعدة البيانات",
  }[connection];

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="التسعير الذكي، الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true">س</span>
          <span>
            <strong>التسعير الذكي</strong>
            <small>تسعير أوضح، ربح أفضل</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="currency-chip"><span aria-hidden="true">●</span> الدينار الكويتي · د.ك</span>
          <span className={`connection-chip connection-${connection}`} role="status">
            <span aria-hidden="true" />
            {connectionText}
          </span>
        </div>
      </header>

      <section className="intro">
        <div className="eyebrow"><span /> حاسبة تسعير المنتجات</div>
        <h1>اعرف تكلفة منتجك، وحدد سعره بثقة.</h1>
        <p>أدخل تكاليفك لتشاهد السعر المقترح والربح المتوقع، وقارن أثر تغيير سعر البيع.</p>
      </section>

      <div className="calculator-layout">
        <section className="panel costs-panel" aria-labelledby="costs-heading">
          <div className="panel-heading">
            <div>
              <span className="step-label">الخطوة ١</span>
              <h2 id="costs-heading">تكاليف المنتج</h2>
            </div>
            <span className="section-icon" aria-hidden="true">＋</span>
          </div>
          <p className="panel-hint">أضف المصاريف اللازمة لكل قطعة حتى لا يفوتك أي بند.</p>

          <div className="input-list">
            {FIELDS.map(({ key, label, icon }) => (
              <label className="field" key={key}>
                <span className="field-label">
                  <span className="field-index">{icon}</span>
                  {label}
                </span>
                <span className="input-wrap">
                  <input
                    aria-label={label}
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.001"
                    inputMode="decimal"
                    value={inputs[key]}
                    onChange={(event) => updateField(key, event.target.value)}
                  />
                  <span>د.ك</span>
                </span>
              </label>
            ))}
          </div>

          <div className="cost-total">
            <span>إجمالي تكلفة القطعة</span>
            <Money value={results.totalCost} />
          </div>

          <div className="margin-control">
            <div className="margin-heading">
              <label htmlFor="target-margin">هامش الربح المستهدف</label>
              <output htmlFor="target-margin">{inputs.targetMarginPercent}٪</output>
            </div>
            <input
              className="margin-slider"
              id="target-margin"
              aria-label="هامش الربح المستهدف"
              type="range"
              min="0"
              max="90"
              step="1"
              value={inputs.targetMarginPercent}
              onChange={(event) => updateField("targetMarginPercent", event.target.value)}
            />
            <div className="range-labels"><span>٠٪</span><span>٩٠٪</span></div>
            <p>السعر المقترح يتغير تلقائيًا مع الهامش.</p>
          </div>
        </section>

        <section className="results-column" aria-label="نتائج التسعير">
          <article className="suggestion-card">
            <div className="suggestion-top">
              <div>
                <span className="step-label">السعر المقترح</span>
                <h2>بحسب هامشك المستهدف</h2>
              </div>
              <span className="sparkle" aria-hidden="true">✳</span>
            </div>
            <Money value={results.suggestedSellingPrice} />
            <div className="suggestion-footer">
              <span>ربح متوقع</span>
              <strong><Money value={results.suggestedProfit} /></strong>
              <span className="margin-pill">{inputs.targetMarginPercent}٪ هامش</span>
            </div>
          </article>

          <article className="panel comparison-panel">
            <div className="panel-heading comparison-heading">
              <div>
                <span className="step-label">قارن السعر</span>
                <h2>ماذا لو غيّرت سعر البيع؟</h2>
              </div>
              <span className="section-icon compare-icon" aria-hidden="true">↔</span>
            </div>
            <p className="panel-hint">غيّر السعر وشاهد الربح والهامش المتوقعين فورًا.</p>
            <label className="field comparison-field">
              <span className="field-label">سعر البيع للمقارنة</span>
              <span className="input-wrap">
                <input
                  aria-label="سعر البيع للمقارنة"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.001"
                  inputMode="decimal"
                  value={inputs.comparisonSellingPrice}
                  onChange={(event) => updateField("comparisonSellingPrice", event.target.value)}
                />
                <span>د.ك</span>
              </span>
            </label>
            <div className="comparison-stats">
              <div>
                <span>الربح المتوقع</span>
                <Money
                  value={results.comparisonProfit}
                  negative={results.comparisonProfit < 0}
                />
              </div>
              <div>
                <span>هامش الربح</span>
                <strong className={results.comparisonMargin < 0 ? "negative-text" : ""}>
                  {formatKwd(results.comparisonMargin)}٪
                </strong>
              </div>
            </div>
          </article>
          <p className="calculation-note">هامش الربح = (سعر البيع − إجمالي التكلفة) ÷ سعر البيع</p>
        </section>
      </div>
      <footer className="footer-note">جميع الحسابات بالدينار الكويتي (د.ك)</footer>
    </main>
  );
}

export default App;
