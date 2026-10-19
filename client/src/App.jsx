import { useEffect, useMemo, useRef, useState } from "react";
import pricingLogo from "./assets/pricing-logo.png";
import { normalizeCalculatorInputs, sanitizeNumericInput, updateCalculatorInputs } from "./calculatorInputs.js";
import {
  createProduct,
  deleteProduct,
  getCalculation,
  getPricingSettings,
  getProducts,
  requestPricingAdvice,
  saveCalculation,
  savePricingSettings,
  updateProduct,
} from "./services/pricingApi.js";

const DEFAULTS = {
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  paymentFeeType: "fixed",
  targetMarginPercent: 50,
  comparisonSellingPrice: 16.2,
};

const DEFAULT_SETTINGS = {
  defaultDeliveryFee: 0,
  defaultPaymentFee: 0,
  defaultPaymentFeeType: "fixed",
};

const FIELDS = [
  { key: "purchaseCost", label: "تكلفة شراء المنتج", number: "01", note: "من المورد" },
  { key: "deliveryCost", label: "تكلفة التوصيل", number: "02", note: "للعميل" },
  { key: "packagingCost", label: "تكلفة التغليف", number: "03", note: "لكل قطعة" },
  { key: "paymentFee", label: "رسوم الدفع الإلكتروني", number: "04", note: "للطلب" },
];

const SIDEBAR_GROUPS = [
  {
    title: "الرئيسية",
    items: [{ id: "start", label: "صفحة البداية", icon: "home" }],
  },
  {
    title: "التسعير والتحليل",
    items: [
      { id: "calculator", label: "حاسبة تسعير المنتج", icon: "calculator" },
      { id: "market-comparison", label: "مقارنة أسعار البيع", icon: "chart" },
      { id: "details", label: "التسعير التفصيلي", icon: "edit" },
      { id: "ai-advice", label: "اقتراحات الذكاء الاصطناعي", icon: "brain", accent: "orange" },
    ],
  },
  {
    title: "المنتجات",
    items: [{ id: "catalog", label: "كتالوج المنتجات", icon: "package" }],
  },
  {
    title: "إعدادات المتجر",
    items: [
      { id: "store-settings", label: "الرسوم الافتراضية", icon: "settings" },
      { id: "payment-settings", label: "رسوم الدفع وKNET", icon: "credit" },
    ],
  },
];

const EMPTY_PRODUCT = {
  name: "",
  sku: "",
  category: "",
  purchaseCost: "0",
  packagingCost: "0",
  deliveryCost: "0",
  paymentFee: "0",
  paymentFeeType: "fixed",
  marketingCost: "0",
  operationalCost: "0",
  customCosts: [],
  batchQuantity: "1",
  targetMarginPercent: "50",
  sellingPrice: "",
};

function formatKwd(value) {
  return new Intl.NumberFormat("en-KW", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    .format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(Number(value) || 0)}٪`;
}

function Money({ value, className = "" }) {
  return <span className={`sp-money ${className}`}><b>{formatKwd(value)}</b><small>د.ك</small></span>;
}

function Icon({ name }) {
  const paths = {
    calculator: <><rect x="5" y="3.5" width="14" height="17" rx="2.4" /><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h2" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /><path d="M9 21v-7h6v7" /></>,
    arrow: <><path d="M19 12H5m7 7-7-7 7-7" /></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /><path d="m5 2 .7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7L5 2Z" /></>,
    store: <><path d="M3 10.5 4.5 4h15l1.5 6.5" /><path d="M4 10v10h16V10M3 10.5c.5 1.8 3.2 2.5 4.5 0 1.3 2.5 4.2 2.5 5.5 0 1.3 2.5 4.2 2.5 5.5 0 1.3 2.5 4 1.8 4.5 0M9 20v-6h6v6" /></>,
    chart: <><path d="M3 20h18M5 16l4-5 3 2 6-8" /><path d="M15 5h3v3" /><circle cx="5" cy="16" r="1" /><circle cx="9" cy="11" r="1" /><circle cx="12" cy="13" r="1" /></>,
    brain: <><path d="M12 4a3 3 0 0 0-5.7 1.3A3.5 3.5 0 0 0 4 11a3.5 3.5 0 0 0 2.3 5.7A3 3 0 0 0 12 18V4Z" /><path d="M12 4a3 3 0 0 1 5.7 1.3A3.5 3.5 0 0 1 20 11a3.5 3.5 0 0 1-2.3 5.7A3 3 0 0 1 12 18M8 9h2m4 0h2m-8 4h2m4 0h2" /></>,
    credit: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18m-14 5h4" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5zM13.8 6.7l3.5 3.5" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9M8 5.2l8 4.6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function animatePricingLogo(event) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const logo = event.currentTarget.querySelector(".sp-mark") || event.currentTarget;
  logo.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.025)", offset: 0.5 },
      { transform: "scale(1)" },
    ],
    { duration: 420, easing: "ease-in-out" },
  );
}

function PricingArtwork() {
  return (
    <button className="sp-hero-artwork" type="button" aria-label="تحريك شعار التسعير الذكي" onClick={animatePricingLogo}>
      <span className="sp-art-halo" aria-hidden="true" />
      <span className="sp-art-frame" aria-hidden="true">
        <img src={pricingLogo} alt="" width="80" height="80" draggable="false" />
      </span>
    </button>
  );
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

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeEditorProduct(product = null) {
  if (!product) return { ...EMPTY_PRODUCT, customCosts: [] };
  const usesSuggestedPrice = Math.abs(Number(product.sellingPrice) - Number(product.suggestedSellingPrice)) < 0.0005;
  return {
    name: product.name ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
    purchaseCost: String(product.purchaseCost ?? 0),
    packagingCost: String(product.packagingCost ?? 0),
    deliveryCost: String(product.deliveryCost ?? 0),
    paymentFee: String(product.paymentFee ?? 0),
    paymentFeeType: product.paymentFeeType ?? "fixed",
    marketingCost: String(product.marketingCost ?? 0),
    operationalCost: String(product.operationalCost ?? 0),
    customCosts: (product.customCosts ?? []).map((item) => ({ label: item.label, amount: String(item.amount) })),
    batchQuantity: String(product.batchQuantity ?? 1),
    targetMarginPercent: String(product.targetMarginPercent ?? 50),
    sellingPrice: product.sellingPrice == null || usesSuggestedPrice ? "" : String(product.sellingPrice),
  };
}

function makeEmptyProduct(settings = DEFAULT_SETTINGS) {
  const feeType = settings.defaultPaymentFeeType ?? "fixed";
  const fee = Number(settings.defaultPaymentFee) || 0;
  const maxMargin = Math.max(0, Math.min(90, 99.99 - (feeType === "percentage" ? fee : 0)));
  return {
    ...EMPTY_PRODUCT,
    deliveryCost: String(settings.defaultDeliveryFee ?? 0),
    paymentFee: String(settings.defaultPaymentFee ?? 0),
    paymentFeeType: feeType,
    targetMarginPercent: String(Math.min(Number(EMPTY_PRODUCT.targetMarginPercent), maxMargin)),
    customCosts: [],
  };
}

function isUntouchedProduct(editor) {
  return editor.name === ""
    && editor.sku === ""
    && editor.category === ""
    && editor.purchaseCost === "0"
    && editor.packagingCost === "0"
    && editor.deliveryCost === "0"
    && editor.paymentFee === "0"
    && editor.paymentFeeType === "fixed"
    && editor.marketingCost === "0"
    && editor.operationalCost === "0"
    && editor.customCosts.length === 0
    && editor.batchQuantity === "1"
    && editor.targetMarginPercent === "50"
    && editor.sellingPrice === "";
}

function App() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [connection, setConnection] = useState("checking");
  const [sessionId, setSessionId] = useState("");
  const [products, setProducts] = useState([]);
  const [productsState, setProductsState] = useState("loading");
  const [pricingSettings, setPricingSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [advice, setAdvice] = useState("");
  const [adviceError, setAdviceError] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [activeSection, setActiveSection] = useState("start");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [marginFilter, setMarginFilter] = useState("all");
  const [catalogView, setCatalogView] = useState(() =>
    window.matchMedia("(max-width: 760px)").matches ? "grid" : "table"
  );
  const [catalogPage, setCatalogPage] = useState(1);
  const [editor, setEditor] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState("");
  const [productNotice, setProductNotice] = useState("");
  const initialized = useRef(false);
  const sessionRef = useRef(null);

  const results = useMemo(() => {
    const baseCost = FIELDS
      .filter((field) => field.key !== "paymentFee")
      .reduce((total, field) => total + Number(inputs[field.key] || 0), 0);
    const paymentFeeRate = inputs.paymentFeeType === "percentage"
      ? Number(inputs.paymentFee || 0) / 100
      : 0;
    const fixedPaymentFee = inputs.paymentFeeType === "fixed" ? Number(inputs.paymentFee || 0) : 0;
    const paymentFeeAt = (price) => price <= 0
      ? 0
      : inputs.paymentFeeType === "percentage"
        ? price * paymentFeeRate
        : fixedPaymentFee;
    const margin = Math.min(Number(inputs.targetMarginPercent) / 100, 0.9);
    const denominator = 1 - margin - paymentFeeRate;
    const suggestedSellingPrice = denominator > 0
      ? (baseCost + fixedPaymentFee) / denominator
      : 0;
    const totalCost = baseCost + paymentFeeAt(suggestedSellingPrice);
    const suggestedProfit = suggestedSellingPrice - totalCost;
    const comparisonTotalCost = baseCost + paymentFeeAt(Number(inputs.comparisonSellingPrice));
    const comparisonProfit = Number(inputs.comparisonSellingPrice) - comparisonTotalCost;
    const comparisonMargin = Number(inputs.comparisonSellingPrice) > 0
      ? (comparisonProfit / Number(inputs.comparisonSellingPrice)) * 100 : 0;
    return {
      baseCost,
      totalCost,
      suggestedSellingPrice,
      suggestedProfit,
      comparisonTotalCost,
      comparisonProfit,
      comparisonMargin,
      invalidTarget: denominator <= 0,
    };
  }, [inputs]);

  const editorBaseCost = useMemo(() => {
    const fixed = ["purchaseCost", "packagingCost", "deliveryCost", "marketingCost", "operationalCost"]
      .reduce((total, key) => total + (Number(editor[key]) || 0), 0);
    return fixed + editor.customCosts.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }, [editor]);
  const editorPaymentFeeRate = editor.paymentFeeType === "percentage" ? (Number(editor.paymentFee) || 0) / 100 : 0;
  const editorFixedPaymentFee = editor.paymentFeeType === "fixed" ? Number(editor.paymentFee) || 0 : 0;
  const editorMargin = Math.min(Math.max(Number(editor.targetMarginPercent) || 0, 0), 90) / 100;
  const editorPriceDenominator = 1 - editorMargin - editorPaymentFeeRate;
  const editorSuggested = editorPriceDenominator > 0
    ? (editorBaseCost + editorFixedPaymentFee) / editorPriceDenominator
    : 0;
  const editorSell = editor.sellingPrice === "" ? editorSuggested : Number(editor.sellingPrice) || 0;
  const getEditorPriceStats = (price) => {
    const paymentFeeAmount = price <= 0
      ? 0
      : editor.paymentFeeType === "percentage"
        ? price * editorPaymentFeeRate
        : editorFixedPaymentFee;
    const totalCost = editorBaseCost + paymentFeeAmount;
    const profit = price - totalCost;
    return { price, paymentFeeAmount, totalCost, profit, marginPercent: price > 0 ? (profit / price) * 100 : 0 };
  };
  const editorStats = getEditorPriceStats(editorSell);
  const editorCosts = editorStats.totalCost;
  const editorProfit = editorStats.profit;
  const discountValue = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountStats = getEditorPriceStats(editorSell * (1 - discountValue / 100));
  const editorBatch = Math.max(1, Math.floor(Number(editor.batchQuantity) || 1));
  const marginScenarios = [25, 40, Number(editor.targetMarginPercent) || 0, 65].map((margin, index) => {
    const safeMargin = Math.min(Math.max(margin, 0), 90);
    const denominator = 1 - safeMargin / 100 - editorPaymentFeeRate;
    const price = denominator > 0
      ? (editorBaseCost + editorFixedPaymentFee) / denominator
      : 0;
    const stats = getEditorPriceStats(price);
    return { id: index, margin: safeMargin, price, profit: stats.profit, selected: index === 2 };
  });

  useEffect(() => {
    let active = true;
    const id = getSessionId();
    sessionRef.current = id;
    setSessionId(id);
    Promise.all([getCalculation(id), getPricingSettings(id)])
      .then(([saved, savedSettings]) => {
        if (!active) return;
        setPricingSettings(savedSettings);
        setEditor((current) => isUntouchedProduct(current) ? makeEmptyProduct(savedSettings) : current);
        if (saved) setInputs({
          purchaseCost: saved.purchaseCost,
          packagingCost: saved.packagingCost,
          deliveryCost: saved.deliveryCost,
          paymentFee: saved.paymentFee,
          paymentFeeType: saved.paymentFeeType ?? "fixed",
          targetMarginPercent: saved.targetMarginPercent,
          comparisonSellingPrice: saved.comparisonSellingPrice,
        });
        else setInputs((current) => ({
          ...current,
          deliveryCost: savedSettings.defaultDeliveryFee,
          paymentFee: savedSettings.defaultPaymentFee,
          paymentFeeType: savedSettings.defaultPaymentFeeType,
          targetMarginPercent: Math.min(
            Number(current.targetMarginPercent) || 0,
            Math.max(0, Math.min(90, 99.99 - (savedSettings.defaultPaymentFeeType === "percentage" ? Number(savedSettings.defaultPaymentFee) || 0 : 0))),
          ),
        }));
        setConnection("connected");
      })
      .catch(() => { if (active) setConnection("offline"); })
      .finally(() => { if (active) initialized.current = true; });
    getProducts(id)
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setProductsState("loaded");
        setCatalogError("");
      })
      .catch((error) => {
        if (!active) return;
        setProductsState("error");
        setCatalogError(error.message || "تعذر تحميل المنتجات.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 760px)");
    const updateCatalogView = (event) => setCatalogView(event.matches ? "grid" : "table");
    compactViewport.addEventListener("change", updateCatalogView);
    return () => compactViewport.removeEventListener("change", updateCatalogView);
  }, []);

  useEffect(() => {
    const sections = ["start", "calculator", "market-comparison", "details", "store-settings", "payment-settings", "ai-advice", "catalog"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    let frameId = 0;
    const updateActiveSection = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const activationLine = (document.querySelector(".sp-header")?.offsetHeight ?? 51) + 32;
        const atPageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        const current = atPageBottom
          ? "catalog"
          : sections.reduce(
            (active, section) => section.getBoundingClientRect().top <= activationLine ? section.id : active,
            "start",
          );
        setActiveSection(current);
      });
    };
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!initialized.current || !sessionRef.current) return undefined;
    setConnection("saving");
    const timeout = window.setTimeout(() => {
      saveCalculation(sessionRef.current, normalizeCalculatorInputs(inputs))
        .then(() => setConnection("connected"))
        .catch(() => setConnection("offline"));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [inputs]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesSearch = !normalized || [product.name, product.sku, product.category]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized));
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const lowMargin = Number(product.marginPercent) < 35;
      const matchesMargin = marginFilter === "all" || (marginFilter === "review" ? lowMargin : !lowMargin);
      return matchesSearch && matchesCategory && matchesMargin;
    });
  }, [products, search, categoryFilter, marginFilter]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visiblePage = Math.min(catalogPage, pageCount);
  const pageProducts = filteredProducts.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, categoryFilter, marginFilter]);

  const catalogStats = useMemo(() => {
    const count = products.length;
    const averageSelling = count ? products.reduce((sum, product) => sum + Number(product.sellingPrice || 0), 0) / count : 0;
    const averageMargin = count ? products.reduce((sum, product) => sum + Number(product.marginPercent || 0), 0) / count : 0;
    const totalExpectedProfit = products.reduce((sum, product) => sum + Number(product.expectedProfit || 0), 0);
    return { count, averageSelling, averageMargin, totalExpectedProfit };
  }, [products]);
  const sidebarMargin = products.length
    ? catalogStats.averageMargin
    : results.suggestedSellingPrice > 0
      ? (results.suggestedProfit / results.suggestedSellingPrice) * 100
      : 0;
  const marginHealth = sidebarMargin >= 30 ? "صحي جدًا" : sidebarMargin >= 20 ? "مقبول" : "بحاجة للمراجعة";

  function updateCalculatorField(key, rawValue) {
    setInputs((current) => updateCalculatorInputs(current, key, rawValue));
  }

  function startEditorFromCalculator() {
    setEditingId(null);
    setProductError("");
    setProductNotice("");
    setEditor({
      ...makeEmptyProduct(pricingSettings),
      purchaseCost: String(inputs.purchaseCost),
      packagingCost: String(inputs.packagingCost),
      deliveryCost: String(inputs.deliveryCost),
      paymentFee: String(inputs.paymentFee),
      paymentFeeType: inputs.paymentFeeType,
      targetMarginPercent: String(inputs.targetMarginPercent),
    });
    scrollTo("details");
  }

  function startNewProduct(shouldScroll = false) {
    setEditingId(null);
    setEditor(makeEmptyProduct(pricingSettings));
    setProductError("");
    setProductNotice("");
    setDiscountPercent("0");
    setAdvice("");
    setAdviceError("");
    if (shouldScroll) scrollTo("details");
  }

  function editProduct(product) {
    setEditingId(product.id);
    setEditor(makeEditorProduct(product));
    setProductError("");
    setProductNotice("");
    scrollTo("details");
  }

  async function refreshProducts() {
    setProductsState("loading");
    try {
      const items = await getProducts(sessionRef.current);
      setProducts(items);
      setProductsState("loaded");
      setCatalogError("");
    } catch (error) {
      setProductsState("error");
      setCatalogError(error.message || "تعذر تحميل المنتجات.");
    }
  }

  function buildProductInput() {
    const number = (key) => Math.max(0, Number(editor[key]) || 0);
    const paymentFeeType = editor.paymentFeeType === "percentage" ? "percentage" : "fixed";
    const maxMargin = Math.max(0, Math.min(90, 99.99 - (paymentFeeType === "percentage" ? number("paymentFee") : 0)));
    const payload = {
      name: editor.name.trim(),
      sku: editor.sku.trim(),
      category: editor.category.trim() || "بدون تصنيف",
      purchaseCost: number("purchaseCost"),
      packagingCost: number("packagingCost"),
      deliveryCost: number("deliveryCost"),
      paymentFee: number("paymentFee"),
      paymentFeeType,
      marketingCost: number("marketingCost"),
      operationalCost: number("operationalCost"),
      customCosts: editor.customCosts.filter((item) => item.label.trim()).map((item) => ({
        label: item.label.trim(),
        amount: Math.max(0, Number(item.amount) || 0),
      })),
      batchQuantity: Math.max(1, Math.floor(Number(editor.batchQuantity) || 1)),
      targetMarginPercent: Math.min(maxMargin, Math.max(0, Number(editor.targetMarginPercent) || 0)),
    };
    if (editor.sellingPrice !== "") payload.sellingPrice = Math.max(0, Number(editor.sellingPrice) || 0);
    return payload;
  }

  async function saveStoreSettings(event) {
    event.preventDefault();
    if (!sessionRef.current) return;
    setSettingsStatus("جارٍ حفظ الإعدادات...");
    setSettingsError("");
    try {
      const saved = await savePricingSettings(sessionRef.current, {
        defaultDeliveryFee: Math.max(0, Number(pricingSettings.defaultDeliveryFee) || 0),
        defaultPaymentFee: Math.max(0, Number(pricingSettings.defaultPaymentFee) || 0),
        defaultPaymentFeeType: pricingSettings.defaultPaymentFeeType,
      });
      setPricingSettings(saved);
      setSettingsStatus("تم حفظ الرسوم الافتراضية، وستُستخدم للمنتجات الجديدة.");
    } catch (error) {
      setSettingsStatus("");
      setSettingsError(error.message || "تعذر حفظ إعدادات الرسوم.");
    }
  }

  function updatePricingSetting(key, rawValue) {
    setPricingSettings((current) => {
      if (key === "defaultPaymentFeeType") {
        const feeType = rawValue === "percentage" ? "percentage" : "fixed";
        const maxFee = feeType === "percentage" ? 99 : 1_000_000;
        const fee = sanitizeNumericInput(String(current.defaultPaymentFee ?? ""), { max: maxFee });
        return { ...current, defaultPaymentFeeType: feeType, defaultPaymentFee: fee ?? current.defaultPaymentFee };
      }
      const max = key === "defaultPaymentFee" && current.defaultPaymentFeeType === "percentage" ? 99 : 1_000_000;
      const value = sanitizeNumericInput(rawValue, { max });
      return value === null ? current : { ...current, [key]: value };
    });
  }

  async function askForPricingAdvice() {
    if (!sessionRef.current || adviceLoading) return;
    setAdvice("");
    setAdviceError("");
    setAdviceLoading(true);
    try {
      const result = await requestPricingAdvice(
        sessionRef.current,
        buildProductInput(),
        discountValue,
      );
      setAdvice(result.advice);
    } catch (error) {
      setAdviceError(error.message || "تعذر الحصول على اقتراح الآن.");
    } finally {
      setAdviceLoading(false);
    }
  }

  function updateEditor(key, value) {
    setEditor((current) => {
      const numericFields = ["purchaseCost", "packagingCost", "deliveryCost", "paymentFee", "marketingCost", "operationalCost", "batchQuantity", "targetMarginPercent", "sellingPrice"];
      let safeValue = value;
      if (numericFields.includes(key)) {
        let max = 1_000_000;
        let min = 0;
        let integer = false;
        if (key === "paymentFee" && current.paymentFeeType === "percentage") max = 99;
        if (key === "batchQuantity") {
          min = 1;
          integer = true;
        }
        if (key === "targetMarginPercent") {
          const rate = current.paymentFeeType === "percentage" ? Number(current.paymentFee) || 0 : 0;
          max = Math.max(0, Math.min(90, 99.99 - rate));
        }
        safeValue = sanitizeNumericInput(value, { min, max, integer });
        if (safeValue === null) return current;
      }
      const next = { ...current, [key]: safeValue };
      const feeType = next.paymentFeeType === "percentage" ? "percentage" : "fixed";
      const feeRate = feeType === "percentage" ? Math.min(99, Number(next.paymentFee) || 0) : 0;
      const maxMargin = Math.max(0, Math.min(90, 99.99 - feeRate));
      if (feeType === "percentage" && Number(next.paymentFee) > 99) next.paymentFee = "99";
      if (Number(next.targetMarginPercent) > maxMargin) next.targetMarginPercent = String(maxMargin);
      return next;
    });
  }

  async function submitProduct(event) {
    event.preventDefault();
    if (!sessionRef.current || savingProduct) return;
    setSavingProduct(true);
    setProductError("");
    setProductNotice("");
    try {
      const payload = buildProductInput();
      const saved = editingId
        ? await updateProduct(sessionRef.current, editingId, payload)
        : await createProduct(sessionRef.current, payload);
      setProducts((current) => editingId
        ? current.map((product) => product.id === saved.id ? saved : product)
        : [saved, ...current]);
      setProductsState("loaded");
      setEditingId(saved.id);
      setEditor(makeEditorProduct(saved));
      setProductNotice(editingId ? "تم تحديث بيانات المنتج وحسابه." : "تم حفظ المنتج وإضافته إلى الكتالوج.");
    } catch (error) {
      setProductError(error.message || "تعذر حفظ المنتج. راجع البيانات وحاول مجددًا.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`هل تريد حذف «${product.name}» من الكتالوج؟`)) return;
    try {
      await deleteProduct(sessionRef.current, product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingId === product.id) {
        setEditingId(null);
        setEditor(makeEmptyProduct(pricingSettings));
      }
      setCatalogError("");
    } catch (error) {
      setCatalogError(error.message || "تعذر حذف المنتج.");
    }
  }

  function exportCsv() {
    const headers = ["المنتج", "رمز المنتج", "التصنيف", "تكلفة الشراء", "إضافي", "إجمالي التكلفة", "سعر البيع", "ربح القطعة", "الهامش", "الكمية"];
    const rows = products.map((product) => [
      product.name, product.sku, product.category, product.purchaseCost,
      Number(product.totalCost) - Number(product.purchaseCost),
      product.totalCost, product.sellingPrice, product.expectedProfit, product.marginPercent, product.batchQuantity,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "smart-pricing-products.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function updateCustomCost(index, key, value) {
    if (key === "amount") {
      value = sanitizeNumericInput(value);
      if (value === null) return;
    }
    setEditor((current) => ({
      ...current,
      customCosts: current.customCosts.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  const connectionText = {
    checking: "جارٍ الاتصال",
    saving: "جارٍ حفظ الحسبة",
    connected: "الحسبة محفوظة",
    offline: "الحساب يعمل محليًا · تعذر الاتصال",
  }[connection];
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const calculatorMaxMargin = Math.max(
    0,
    Math.min(90, 99.99 - (inputs.paymentFeeType === "percentage" ? Number(inputs.paymentFee) || 0 : 0)),
  );
  const sidebarMarginText = formatPercent(sidebarMargin).replace("٪", "%");

  return (
    <div className="stitch-pricing" dir="rtl" lang="ar">
      <header className="sp-header">
        <a className="sp-brand" href="#start" aria-label="التسعير الذكي للمتاجر، الصفحة الرئيسية" onClick={animatePricingLogo}>
          <div className="sp-mark" aria-hidden="true"><Icon name="sparkles" /></div>
          <div><strong>التسعير الذكي للمتاجر</strong><small>Smart Pricing AI · GCC Engine</small></div>
        </a>
        <div className="sp-header-side">
          <a className="sp-account-chip" href="#catalog">
            <span className="sp-account-mark"><Icon name="package" /></span>
            <span><strong>{editor.name.trim() || "متجرك"}</strong><small>{editingId ? "منتجك الحالي" : "محاكي التسعير"}</small></span>
          </a>
          <a className="sp-notice" href="#store-settings" aria-label="إعدادات الرسوم والعملة" title="إعدادات الرسوم والعملة">
            <Icon name="settings" /><i />
          </a>
          <a className="sp-currency" href="#store-settings"><i /> الكويت · د.ك (KWD)</a>
          <span className={`sp-local connection-${connection}`} role="status" aria-live="polite" title={connectionText}>
            <i /><span className="sp-sr-only">{connectionText}</span>
          </span>
          <button className="sp-menu-toggle" type="button" aria-label={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
            <Icon name={sidebarOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>

      <aside className={`sp-sidebar${sidebarOpen ? " is-open" : ""}`} aria-label="التنقل داخل التسعير الذكي">
        <div className="sp-sidebar-content">
          {SIDEBAR_GROUPS.map(({ title, items }, groupIndex) => (
            <section className="sp-sidebar-group" key={title} aria-labelledby={`sidebar-group-${groupIndex}`}>
              <h2 className="sp-side-group-label" id={`sidebar-group-${groupIndex}`}><i />{title}</h2>
              <nav className="sp-side-nav" aria-label={title}>
                {items.map(({ id, label, icon, accent }) => {
                  const isActive = activeSection === id;
                  return (
                    <a key={id} className={`sp-side-link${isActive ? " is-active" : ""}${accent ? ` accent-${accent}` : ""}`} href={`#${id}`} aria-current={isActive ? "location" : undefined} onClick={() => setSidebarOpen(false)}>
                      <Icon name={icon} /><span>{label}</span>
                    </a>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>
        <div className="sp-side-foot">
          <span className="sp-margin-icon"><Icon name="chart" /></span>
          <div><small>{products.length ? "متوسط هامش الربح" : "هامش الحسبة الحالية"}</small><strong><bdi>{sidebarMarginText}</bdi><span>{marginHealth}</span></strong></div>
        </div>
      </aside>

      <main className="sp-main">
        <section className="sp-section sp-hero-section" id="start">
          <div className="sp-hero-card">
            <PricingArtwork />
            <span className="sp-hero-locale"><i /> متجر الكويت <b>·</b> KWD <i /></span>
            <h1>التسعير الذكي للمتاجر</h1>
            <p>احسب تكلفة وسعر بيع منتجك بدقة، مع كشف فوري لرسوم KNET وهامش الربح الصافي.</p>
            <div className="sp-benefits" aria-label="مميزات الحاسبة">
              <span><Icon name="chart" /> حساب فوري للأرباح <Icon name="sparkles" /></span>
              <span><Icon name="settings" /> كشف التكاليف وبوابات الدفع <Icon name="sparkles" /></span>
              <span><Icon name="package" /> سعر البيع الأمثل <Icon name="chart" /></span>
            </div>
            <a className="sp-primary-cta" href="#calculator">
              <Icon name="calculator" /><span>ابدأ التسعير الآن</span><Icon name="arrow" />
            </a>
          </div>
        </section>

        <section className="sp-section" id="calculator">
          <div className="sp-heading">
            <div className="sp-heading-main">
              <div className="sp-title-icon"><Icon name="calculator" /></div>
              <div><p className="sp-kicker">محرك التسعير · د.ك</p><h2>حاسبة تسعير المنتج</h2><p className="sp-subtitle">أدخل تكاليف القطعة وشاهد السعر والربح المتوقعين مباشرة.</p></div>
            </div>
            <div className="sp-heading-actions">
              <a className="sp-button sp-button-light" href="#catalog">قائمة المنتجات <Icon name="package" /></a>
              <a className="sp-button sp-button-light" href="#start">العودة للبداية <Icon name="arrow" /></a>
            </div>
          </div>

          <div className="sp-workspace">
            <section className="sp-form-card" aria-labelledby="sp-costs-title">
              <div className="sp-form-head">
                <div><span className="sp-section-symbol" aria-hidden="true">▤</span><h3 id="sp-costs-title">بنود التكاليف المباشرة والتشغيلية</h3></div>
                <span className="sp-step">01 / 02</span>
              </div>
              <p className="sp-help">أدخل المصاريف لكل قطعة لتكون حسبة السعر أقرب إلى واقع متجرك.</p>
              <div className="sp-fields">
                {FIELDS.map(({ key, label, number, note }) => (
                  <label className="sp-field" key={key}>
                    <span className="sp-field-heading"><span className="sp-field-name">{label}</span><span className="sp-field-note">{key === "paymentFee" && inputs.paymentFeeType === "percentage" ? "من سعر البيع" : note}</span></span>
                    <span className="sp-input-shell">
                      <span className="sp-currency-label">{key === "paymentFee" && inputs.paymentFeeType === "percentage" ? "%" : "د.ك"}</span>
                      <input aria-label={label} type="number" min="0" max={key === "paymentFee" && inputs.paymentFeeType === "percentage" ? "99" : "1000000"} step={key === "paymentFee" && inputs.paymentFeeType === "percentage" ? "0.01" : "0.001"} inputMode="decimal" value={inputs[key]} onChange={(event) => updateCalculatorField(key, event.target.value)} />
                      <span className="sp-field-number">{number}</span>
                    </span>
                    {key === "paymentFee" && (
                      <select className="sp-fee-type" aria-label="نوع رسوم الدفع في الحاسبة" value={inputs.paymentFeeType} onChange={(event) => updateCalculatorField("paymentFeeType", event.target.value)}>
                        <option value="fixed">رسوم ثابتة لكل طلب</option>
                        <option value="percentage">نسبة من سعر البيع</option>
                      </select>
                    )}
                  </label>
                ))}
              </div>
              <div className="sp-cost-total">
                <div><span className="sp-total-label">إجمالي تكلفة القطعة</span><small>مجموع البنود المدخلة أعلاه</small></div>
                <Money value={results.totalCost} />
              </div>
              <div className="sp-margin">
                <div className="sp-margin-heading"><div><label htmlFor="sp-margin-range">هامش الربح المستهدف</label><small>السعر المقترح يتغير تلقائيًا</small></div><output htmlFor="sp-margin-range">{formatPercent(inputs.targetMarginPercent)}</output></div>
                <div className="sp-presets" aria-label="قيم الهامش السريعة">
                  {[25, 35, 50, 65].map((value) => <button type="button" className={Number(inputs.targetMarginPercent) === value ? "is-active" : ""} key={value} onClick={() => updateCalculatorField("targetMarginPercent", String(value))}>{value}%</button>)}
                </div>
                <input id="sp-margin-range" className="sp-slider" aria-label="هامش الربح المستهدف" type="range" min="0" max={calculatorMaxMargin} step="1" value={Number(inputs.targetMarginPercent) || 0} onChange={(event) => updateCalculatorField("targetMarginPercent", event.target.value)} />
                <div className="sp-range-labels"><span>٠٪</span><span>{formatPercent(calculatorMaxMargin)}</span></div>
                {results.invalidTarget && <p className="sp-inline-warning" role="alert">لا يمكن بلوغ هذا الهامش مع نسبة رسوم الدفع الحالية. خفّض الرسوم أو الهامش.</p>}
              </div>
            </section>

            <section className="sp-results" aria-label="نتائج التسعير">
              <article className="sp-price-card">
                <div className="sp-result-top"><span>سعر البيع المقترح</span><span className="sp-margin-tag">هامش {formatPercent(inputs.targetMarginPercent)}</span></div>
                <p className="sp-result-caption">بحسب هامشك المستهدف</p>
                <Money value={results.suggestedSellingPrice} className="sp-price" />
                <div className="sp-key-stats">
                  <div className="sp-stat-cost"><span>التكلفة الكلية للقطعة</span><Money value={results.totalCost} /></div>
                  <div className="sp-stat-profit"><span>صافي الربح للقطعة</span><Money value={results.suggestedProfit} /></div>
                </div>
                <div className="sp-distribution">
                  <div className="sp-distribution-head"><span>توزيع السعر</span><span>{formatPercent(inputs.targetMarginPercent)} ربح</span></div>
                  <div className="sp-distribution-track" role="img" aria-label={`التكلفة ${100 - inputs.targetMarginPercent} بالمئة والربح ${inputs.targetMarginPercent} بالمئة`}><span style={{ width: `${100 - inputs.targetMarginPercent}%` }} /><i style={{ width: `${inputs.targetMarginPercent}%` }} /></div>
                  <div className="sp-distribution-legend"><span><i className="sp-legend-cost" /> التكلفة</span><span><i className="sp-legend-profit" /> الربح</span></div>
                </div>
              </article>
              <article className="sp-compare-card" id="market-comparison">
                <div className="sp-compare-heading"><div><span className="sp-kicker">مقارنة سريعة</span><h3>ماذا لو غيّرت سعر البيع؟</h3></div></div>
                <p className="sp-compare-help">غيّر السعر وشاهد الربح والهامش المتوقعين فورًا.</p>
                <label className="sp-compare-field"><span>سعر البيع للمقارنة</span><span className="sp-input-shell"><span className="sp-currency-label">د.ك</span><input aria-label="سعر البيع للمقارنة" type="number" min="0" step="0.001" inputMode="decimal" value={inputs.comparisonSellingPrice} onChange={(event) => updateCalculatorField("comparisonSellingPrice", event.target.value)} /></span></label>
                <input className="sp-slider sp-compare-slider" aria-label="حرّك سعر البيع للمقارنة" type="range" min="0" max={Math.max(20, Number(inputs.comparisonSellingPrice) || 0, results.suggestedSellingPrice * 2)} step="0.001" value={Number(inputs.comparisonSellingPrice) || 0} onChange={(event) => updateCalculatorField("comparisonSellingPrice", event.target.value)} />
                <div className="sp-compare-stats">
                  <div><span>إجمالي التكلفة</span><Money value={results.comparisonTotalCost} /></div>
                  <div><span>الربح المتوقع</span><Money value={results.comparisonProfit} className={results.comparisonProfit < 0 ? "is-negative" : ""} /></div>
                  <div><span>هامش الربح</span><strong className={results.comparisonMargin < 0 ? "is-negative" : ""}>{formatKwd(results.comparisonMargin)}٪</strong></div>
                </div>
              </article>
              <button className="sp-button sp-button-primary" type="button" onClick={startEditorFromCalculator}>أكمل بيانات المنتج واحفظه <Icon name="arrow" /></button>
              <p className="sp-formula">هامش الربح = (سعر البيع − إجمالي التكلفة) ÷ سعر البيع</p>
            </section>
          </div>
        </section>

        <section className="sp-section" id="details">
          <div className="sp-heading">
            <div className="sp-heading-main">
              <div className="sp-title-icon"><Icon name="package" /></div>
              <div><p className="sp-kicker">إعداد منتج · التكاليف الشاملة</p><h2>محرر التسعير التفصيلي</h2><p className="sp-subtitle">سجّل المنتج وكل ما يدخل في تكلفة القطعة والدفعة.</p></div>
            </div>
            <button className="sp-button sp-button-light" type="button" onClick={() => startNewProduct()}>منتج جديد <Icon name="plus" /></button>
          </div>

          <form className="sp-default-settings" id="store-settings" onSubmit={saveStoreSettings}>
            <div className="sp-default-settings-heading">
              <div><h3>رسوم متجرك الافتراضية</h3><p>تُستخدم تلقائيًا عند إنشاء منتج جديد، ويمكن تعديلها داخل كل منتج.</p></div>
              <span>إعدادات هذه الجلسة</span>
            </div>
            <div className="sp-editor-fields">
              <div className="sp-editor-field">
                <label htmlFor="default-delivery-fee">رسوم التوصيل الافتراضية</label>
                <div className="sp-unit-control"><input id="default-delivery-fee" type="number" min="0" step="0.001" value={pricingSettings.defaultDeliveryFee} onChange={(event) => updatePricingSetting("defaultDeliveryFee", event.target.value)} /><span>د.ك</span></div>
              </div>
              <div className="sp-editor-field" id="payment-settings">
                <label htmlFor="default-payment-fee">رسوم الدفع الافتراضية (KNET / MyFatoorah)</label>
                <div className="sp-default-payment-row">
                  <select aria-label="نوع رسوم الدفع الافتراضية" value={pricingSettings.defaultPaymentFeeType} onChange={(event) => updatePricingSetting("defaultPaymentFeeType", event.target.value)}>
                    <option value="fixed">قيمة ثابتة</option><option value="percentage">نسبة مئوية</option>
                  </select>
                  <div className="sp-unit-control"><input id="default-payment-fee" type="number" min="0" max={pricingSettings.defaultPaymentFeeType === "percentage" ? "99" : "1000000"} step={pricingSettings.defaultPaymentFeeType === "percentage" ? "0.01" : "0.001"} value={pricingSettings.defaultPaymentFee} onChange={(event) => updatePricingSetting("defaultPaymentFee", event.target.value)} /><span>{pricingSettings.defaultPaymentFeeType === "percentage" ? "%" : "د.ك"}</span></div>
                </div>
              </div>
            </div>
            <div className="sp-default-settings-actions">
              <button className="sp-button sp-button-light" type="submit">حفظ الرسوم الافتراضية</button>
              {settingsStatus && <span role="status">{settingsStatus}</span>}
              {settingsError && <span className="sp-inline-warning" role="alert">{settingsError}</span>}
            </div>
          </form>

          <div className="sp-section-intro">
            <div className="sp-product-context">
              <div className="sp-product-stamp" aria-hidden="true">SP</div>
              <div><h3>{editingId ? (editor.name || "تعديل المنتج") : "تفاصيل منتجك"}</h3><p>معلومات المنتج محفوظة ضمن جلسة متجرك الحالية فقط.</p></div>
            </div>
            <div className="sp-context-meta"><span>العملة: دينار كويتي (د.ك)</span><span>الدفعة: {editorBatch} قطعة</span></div>
          </div>

          {productError && <p className="sp-alert" role="alert">{productError}</p>}
          {productNotice && <p className="sp-alert sp-success" role="status">{productNotice}</p>}
          <div className="sp-editor-grid">
            <form className="sp-editor-form" onSubmit={submitProduct}>
              <section className="sp-editor-panel">
                <h3>تعريف المنتج</h3>
                <div className="sp-editor-fields">
                  <div className="sp-editor-field"><label htmlFor="product-name">اسم المنتج *</label><input id="product-name" required maxLength="120" value={editor.name} onChange={(event) => updateEditor("name", event.target.value)} placeholder="مثال: عطر أو سيروم الوجه" /></div>
                  <div className="sp-editor-field"><label htmlFor="product-sku">رمز المنتج</label><input id="product-sku" maxLength="40" value={editor.sku} onChange={(event) => updateEditor("sku", event.target.value)} placeholder="اختياري" /></div>
                  <div className="sp-editor-field"><label htmlFor="product-category">التصنيف</label><input id="product-category" maxLength="80" value={editor.category} onChange={(event) => updateEditor("category", event.target.value)} placeholder="عطور، عناية، إكسسوارات..." /></div>
                  <div className="sp-editor-field"><label htmlFor="product-batch">كمية الدفعة</label><div className="sp-unit-control"><input id="product-batch" required type="number" min="1" step="1" value={editor.batchQuantity} onChange={(event) => updateEditor("batchQuantity", event.target.value)} /><span>قطعة</span></div></div>
                </div>
              </section>
              <section className="sp-editor-panel">
                <h3>التكاليف لكل قطعة · د.ك</h3>
                <div className="sp-editor-fields">
                  {[
                    ["purchaseCost", "تكلفة الشراء"],
                    ["packagingCost", "التغليف والعلب"],
                    ["deliveryCost", "التوصيل"],
                    ["paymentFee", "رسوم الدفع"],
                    ["marketingCost", "التسويق والإعلانات"],
                    ["operationalCost", "التشغيل والتوالف"],
                  ].map(([key, label]) => (
                    key === "paymentFee" ? (
                      <div className="sp-editor-field sp-fee-editor-field" key={key}>
                        <label htmlFor="editor-paymentFee">رسوم الدفع</label>
                        <div className="sp-fee-editor-row">
                          <select aria-label="نوع رسوم الدفع للمنتج" value={editor.paymentFeeType} onChange={(event) => updateEditor("paymentFeeType", event.target.value)}>
                            <option value="fixed">ثابتة</option><option value="percentage">نسبة</option>
                          </select>
                          <div className="sp-unit-control"><input id="editor-paymentFee" type="number" min="0" max={editor.paymentFeeType === "percentage" ? "99" : "1000000"} step={editor.paymentFeeType === "percentage" ? "0.01" : "0.001"} value={editor.paymentFee} onChange={(event) => updateEditor("paymentFee", event.target.value)} /><span>{editor.paymentFeeType === "percentage" ? "%" : "د.ك"}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="sp-editor-field" key={key}><label htmlFor={`editor-${key}`}>{label}</label><div className="sp-unit-control"><input id={`editor-${key}`} type="number" min="0" step="0.001" value={editor[key]} onChange={(event) => updateEditor(key, event.target.value)} /><span>د.ك</span></div></div>
                    )
                  ))}
                </div>
                <div className="sp-margin">
                  <div className="sp-margin-heading"><div><label htmlFor="editor-margin">هامش الربح المستهدف</label><small>من ٠٪ إلى ٩٠٪</small></div><output htmlFor="editor-margin">{formatPercent(editor.targetMarginPercent)}</output></div>
                  <div className="sp-editor-fields" style={{ marginTop: 12 }}>
                    <div className="sp-editor-field"><label htmlFor="editor-margin">الهامش المقترح</label><input id="editor-margin" type="number" min="0" max={Math.max(0, Math.min(90, 99.99 - (editor.paymentFeeType === "percentage" ? Number(editor.paymentFee) || 0 : 0)))} step="1" value={editor.targetMarginPercent} onChange={(event) => updateEditor("targetMarginPercent", event.target.value)} /></div>
                    <div className="sp-editor-field"><label htmlFor="editor-selling">سعر البيع المعتمد (اختياري)</label><div className="sp-unit-control"><input id="editor-selling" type="number" min="0" step="0.001" value={editor.sellingPrice} onChange={(event) => updateEditor("sellingPrice", event.target.value)} placeholder="استخدم السعر المقترح" /><span>د.ك</span></div></div>
                  </div>
                </div>
                <div className="sp-scenario-block">
                  <div className="sp-scenario-heading"><div><h4>مقارنة سيناريوهات الهامش</h4><p>تأثير كل هامش على سعر وربح القطعة</p></div><span>حسب تكلفتك الحالية</span></div>
                  <div className="sp-scenario-list">
                    {marginScenarios.map((scenario) => (
                      <div className={`sp-scenario ${scenario.selected ? "is-selected" : ""}`} key={scenario.id}>
                        <div className="sp-scenario-label">
                          <strong>{formatPercent(scenario.margin)}</strong>
                          <small>{scenario.selected ? "الهامش المحدد" : "سيناريو للمقارنة"}</small>
                        </div>
                        <div><small>سعر البيع</small><b>{formatKwd(scenario.price)} <i>د.ك</i></b></div>
                        <div><small>ربح القطعة</small><b>{formatKwd(scenario.profit)} <i>د.ك</i></b></div>
                      </div>
                    ))}
                  </div>
                  <p className="sp-scenario-footnote">هذه مقارنة حسابية بين نسب الهامش، وليست توصية آلية.</p>
                </div>
              </section>
              <section className="sp-editor-panel">
                <h3>بنود تكلفة إضافية</h3>
                {editor.customCosts.map((item, index) => (
                  <div className="sp-custom-row" key={`custom-${index}`}>
                    <input aria-label={`اسم بند التكلفة ${index + 1}`} maxLength="80" value={item.label} onChange={(event) => updateCustomCost(index, "label", event.target.value)} placeholder="اسم البند" />
                    <input aria-label={`قيمة بند التكلفة ${index + 1}`} type="number" min="0" step="0.001" value={item.amount} onChange={(event) => updateCustomCost(index, "amount", event.target.value)} placeholder="0.000" />
                    <button className="sp-remove-custom" type="button" aria-label="حذف بند التكلفة" onClick={() => setEditor((current) => ({ ...current, customCosts: current.customCosts.filter((_, i) => i !== index) }))}>×</button>
                  </div>
                ))}
                <button className="sp-add-custom" type="button" onClick={() => setEditor((current) => ({ ...current, customCosts: [...current.customCosts, { label: "", amount: "0" }] }))} disabled={editor.customCosts.length >= 20}>+ إضافة بند تكلفة مخصص</button>
              </section>
              <section className="sp-editor-panel sp-discount-panel">
                <h3>محاكي الخصومات والعروض</h3>
                <p className="sp-discount-help">شاهد ربح الطلب بعد الخصم مع إعادة احتساب رسوم الدفع النسبية على سعره الجديد.</p>
                <label className="sp-editor-field" htmlFor="discount-percent">نسبة الخصم</label>
                <div className="sp-discount-control">
                  <input id="discount-percent" type="number" min="0" max="100" step="1" value={discountPercent} onChange={(event) => setDiscountPercent(sanitizeNumericInput(event.target.value, { max: 100 }) ?? discountPercent)} />
                  <span>%</span>
                  {[10, 20].map((value) => <button type="button" className={discountValue === value ? "is-active" : ""} key={value} onClick={() => setDiscountPercent(String(value))}>{value}%</button>)}
                </div>
                <input className="sp-slider" aria-label="نسبة الخصم" type="range" min="0" max="100" step="1" value={discountValue} onChange={(event) => setDiscountPercent(event.target.value)} />
                <div className="sp-discount-results">
                  <div><small>قبل الخصم · الربح لكل طلب</small><strong>{formatKwd(editorProfit)} د.ك</strong></div>
                  <div><small>بعد خصم {formatPercent(discountValue)} · سعر البيع</small><strong>{formatKwd(discountStats.price)} د.ك</strong></div>
                  <div className={discountStats.profit < 0 ? "is-negative" : ""}><small>الربح بعد الخصم</small><strong>{formatKwd(discountStats.profit)} د.ك</strong><span>الهامش {formatPercent(discountStats.marginPercent)}</span></div>
                </div>
              </section>
              <section className="sp-editor-panel sp-advice-panel" id="ai-advice">
                <div className="sp-advice-heading"><div><h3>اقتراحات الذكاء الاصطناعي</h3><p>التوصيات تشرح النتائج المحسوبة هنا ولا تستبدل الحسابات.</p></div><span>OpenRouter</span></div>
                <button className="sp-button sp-button-light" type="button" onClick={askForPricingAdvice} disabled={adviceLoading}>
                  {adviceLoading ? "جارٍ إعداد الاقتراح..." : "حلّل السعر والخصم"}
                </button>
                {adviceError && <p className="sp-alert" role="alert">{adviceError}</p>}
                {advice && <p className="sp-advice-result" role="status">{advice}</p>}
              </section>
              <div className="sp-editor-actions">
                <button className="sp-button sp-button-primary" type="submit" disabled={savingProduct || !sessionId}>
                  {savingProduct ? "جارٍ الحفظ..." : editingId ? "حفظ تعديلات المنتج" : "حفظ المنتج في الكتالوج"}
                </button>
                {editingId && <button className="sp-button sp-button-light" type="button" onClick={() => startNewProduct()}>إلغاء التعديل</button>}
              </div>
            </form>
            <aside className="sp-editor-summary">
              <div className="sp-editor-price">
                <small>السعر المحسوب للقطعة</small>
                <strong>{formatKwd(editorSell)} <small>د.ك</small></strong>
                <div><span>إجمالي تكلفة القطعة<b>{formatKwd(editorCosts)} د.ك</b></span><span>ربح القطعة<b>{formatKwd(editorProfit)} د.ك</b></span></div>
                <div><span>تكلفة الدفعة<b>{formatKwd(editorCosts * editorBatch)} د.ك</b></span><span>ربح الدفعة<b>{formatKwd(editorProfit * editorBatch)} د.ك</b></span></div>
              </div>
              <p className="sp-editor-hint">يُحسب السعر المقترح من هامش الربح المستهدف. أدخل سعرًا معتمدًا فقط إذا كان لديك سعر بيع مختلف تريد تسجيله.</p>
            </aside>
          </div>
        </section>

        <section className="sp-section" id="catalog">
          <div className="sp-catalog-top">
            <div className="sp-heading">
              <div className="sp-heading-main">
                <div className="sp-title-icon"><Icon name="package" /></div>
                <div><p className="sp-kicker">منتجات جلسة متجرك</p><h2>قائمة المنتجات والأسعار</h2><p className="sp-subtitle">تابع تكاليفك وسعر البيع وهامش الربح المحسوب لكل منتج.</p></div>
              </div>
            </div>
            <div className="sp-catalog-actions">
              <button className="sp-button sp-button-light" type="button" onClick={exportCsv} disabled={productsState !== "loaded" || products.length === 0}><Icon name="download" /> تصدير CSV</button>
              <button className="sp-button sp-button-light" type="button" onClick={() => window.print()} disabled={productsState !== "loaded" || products.length === 0}>طباعة / PDF</button>
              <button className="sp-button sp-button-primary" type="button" onClick={() => startNewProduct(true)}><Icon name="plus" /> تسعير منتج جديد</button>
            </div>
          </div>

          {catalogError && <p className="sp-alert" role="alert">{catalogError} <button className="sp-button sp-button-quiet" type="button" onClick={refreshProducts}>إعادة المحاولة <Icon name="refresh" /></button></p>}
          <div className="sp-kpis" aria-label="ملخص الكتالوج">
            <div className="sp-kpi"><label>إجمالي المنتجات</label><strong>{productsState === "loading" ? "—" : catalogStats.count}</strong></div>
            <div className="sp-kpi"><label>متوسط سعر البيع</label><strong>{productsState === "loading" ? "—" : formatKwd(catalogStats.averageSelling)}<small>د.ك</small></strong></div>
            <div className="sp-kpi sp-kpi-emphasis"><label>متوسط هامش الربح</label><strong>{productsState === "loading" ? "—" : formatPercent(catalogStats.averageMargin)}</strong></div>
            <div className="sp-kpi"><label>إجمالي ربح القطعة المتوقع</label><strong>{productsState === "loading" ? "—" : formatKwd(catalogStats.totalExpectedProfit)}<small>د.ك</small></strong></div>
          </div>
          <div className="sp-toolbar">
            <label className="sp-search"><Icon name="search" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الرمز..." aria-label="بحث المنتجات" /></label>
            <select aria-label="التصفية حسب التصنيف" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">كل التصنيفات</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
            <select aria-label="التصفية حسب هامش الربح" value={marginFilter} onChange={(event) => setMarginFilter(event.target.value)}>
              <option value="all">كل الهوامش</option><option value="review">يحتاج مراجعة · أقل من ٣٥٪</option><option value="healthy">هامش ٣٥٪ فأعلى</option>
            </select>
            <div className="sp-view-toggle" role="group" aria-label="طريقة عرض المنتجات">
              <button type="button" className={catalogView === "table" ? "is-active" : ""} aria-pressed={catalogView === "table"} onClick={() => setCatalogView("table")} title="عرض جدولي">جدول</button>
              <button type="button" className={catalogView === "grid" ? "is-active" : ""} aria-pressed={catalogView === "grid"} onClick={() => setCatalogView("grid")} title="عرض بطاقات">بطاقات</button>
            </div>
          </div>
          <div className="sp-table-wrap">
            {productsState === "loading" ? (
              <div className="sp-loading-list" role="status" aria-label="جارٍ تحميل المنتجات"><div className="sp-skeleton" /><div className="sp-skeleton" /><div className="sp-skeleton" /></div>
            ) : productsState === "error" ? (
              <div className="sp-empty"><span className="sp-empty-icon"><Icon name="refresh" /></span><h3>تعذر تحميل الكتالوج</h3><p>لم نتمكن من جلب منتجات جلسة متجرك. تحقق من الاتصال ثم أعد المحاولة.</p><button type="button" className="sp-button sp-button-light" onClick={refreshProducts}>إعادة تحميل المنتجات</button></div>
            ) : products.length === 0 ? (
              <div className="sp-empty"><span className="sp-empty-icon"><Icon name="package" /></span><h3>لا توجد منتجات محفوظة بعد</h3><p>احفظ أول منتج من محرر التسعير التفصيلي لتظهر تكاليفه وسعره هنا.</p><button type="button" className="sp-button sp-button-primary" onClick={() => startNewProduct(true)}>ابدأ بإضافة منتج <Icon name="plus" /></button></div>
            ) : filteredProducts.length === 0 ? (
              <div className="sp-empty"><span className="sp-empty-icon"><Icon name="search" /></span><h3>لا توجد نتائج مطابقة</h3><p>جرّب كلمة بحث أخرى أو غيّر عوامل التصفية.</p><button type="button" className="sp-button sp-button-light" onClick={() => { setSearch(""); setCategoryFilter("all"); setMarginFilter("all"); }}>مسح عوامل التصفية</button></div>
            ) : (
              catalogView === "table" ? (
                <table className="sp-table">
                  <thead><tr><th>المنتج</th><th>التصنيف</th><th className="sp-align-left">الشراء</th><th className="sp-align-left">إضافي</th><th className="sp-align-left">التكلفة</th><th className="sp-align-left">سعر البيع</th><th className="sp-align-left">الربح</th><th>الهامش</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {pageProducts.map((product) => {
                      const lowMargin = Number(product.marginPercent) < 35;
                      const additional = Number(product.totalCost) - Number(product.purchaseCost);
                      return (
                        <tr key={product.id}>
                          <td><div className="sp-product-cell"><strong>{product.name}</strong><small>{product.sku || "—"}</small></div></td>
                          <td><span className="sp-category-chip">{product.category || "بدون تصنيف"}</span></td>
                          <td className="sp-align-left">{formatKwd(product.purchaseCost)}</td>
                          <td className="sp-align-left">{formatKwd(additional)}</td>
                          <td className="sp-align-left"><strong>{formatKwd(product.totalCost)}</strong></td>
                          <td className="sp-align-left">{formatKwd(product.sellingPrice)}</td>
                          <td className="sp-align-left">{formatKwd(product.expectedProfit)}</td>
                          <td><span className={`sp-margin-chip ${lowMargin ? "low" : ""}`}>{formatPercent(product.marginPercent)}</span></td>
                          <td><span className={`sp-status ${lowMargin ? "review" : ""}`}>{lowMargin ? "يحتاج مراجعة" : "هامش جيد"}</span></td>
                          <td><div className="sp-row-actions">
                            <button className="sp-icon-button" type="button" title="تعديل المنتج" aria-label={`تعديل ${product.name}`} onClick={() => editProduct(product)}><Icon name="edit" /></button>
                            <button className="sp-icon-button delete" type="button" title="حذف المنتج" aria-label={`حذف ${product.name}`} onClick={() => removeProduct(product)}><Icon name="trash" /></button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="sp-product-grid">
                  {pageProducts.map((product) => {
                    const lowMargin = Number(product.marginPercent) < 35;
                    return (
                      <article className="sp-product-card" key={product.id}>
                        <div className="sp-product-card-head"><span className="sp-product-card-mark"><Icon name="package" /></span><span className={`sp-margin-chip ${lowMargin ? "low" : ""}`}>{formatPercent(product.marginPercent)}</span></div>
                        <h3>{product.name}</h3>
                        <div className="sp-product-card-meta"><span>{product.sku || "—"}</span><span className="sp-category-chip">{product.category || "بدون تصنيف"}</span></div>
                        <div className="sp-product-card-values">
                          <div><small>التكلفة</small><b>{formatKwd(product.totalCost)} د.ك</b></div>
                          <div><small>سعر البيع</small><b>{formatKwd(product.sellingPrice)} د.ك</b></div>
                          <div><small>ربح القطعة</small><b>{formatKwd(product.expectedProfit)} د.ك</b></div>
                          <div><small>الحالة</small><b className={lowMargin ? "review-text" : ""}>{lowMargin ? "يحتاج مراجعة" : "هامش جيد"}</b></div>
                        </div>
                        <div className="sp-product-card-actions">
                          <button className="sp-button sp-button-light" type="button" onClick={() => editProduct(product)}><Icon name="edit" /> تعديل</button>
                          <button className="sp-button sp-button-danger" type="button" onClick={() => removeProduct(product)}><Icon name="trash" /> حذف</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            )}
          </div>
          {productsState === "loaded" && filteredProducts.length > 0 && (
            <div className="sp-pagination">
              <span>عرض {(visiblePage - 1) * pageSize + 1}–{Math.min(visiblePage * pageSize, filteredProducts.length)} من {filteredProducts.length} منتج</span>
              <div>
                <button type="button" className="sp-page-button" aria-label="الصفحة السابقة" disabled={visiblePage <= 1} onClick={() => setCatalogPage(visiblePage - 1)}>السابق</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button type="button" key={page} className={`sp-page-button ${visiblePage === page ? "is-current" : ""}`} aria-current={visiblePage === page ? "page" : undefined} onClick={() => setCatalogPage(page)}>{page}</button>)}
                <button type="button" className="sp-page-button" aria-label="الصفحة التالية" disabled={visiblePage >= pageCount} onClick={() => setCatalogPage(visiblePage + 1)}>التالي</button>
              </div>
            </div>
          )}
          <div className="sp-print-only">
            <table className="sp-table sp-print-table">
              <thead><tr><th>المنتج</th><th>التصنيف</th><th>تكلفة الشراء</th><th>إجمالي التكلفة</th><th>سعر البيع</th><th>ربح القطعة</th><th>الهامش</th><th>الدفعة</th></tr></thead>
              <tbody>{products.map((product) => <tr key={`print-${product.id}`}><td>{product.name}{product.sku ? ` · ${product.sku}` : ""}</td><td>{product.category || "بدون تصنيف"}</td><td>{formatKwd(product.purchaseCost)}</td><td>{formatKwd(product.totalCost)}</td><td>{formatKwd(product.sellingPrice)}</td><td>{formatKwd(product.expectedProfit)}</td><td>{formatPercent(product.marginPercent)}</td><td>{product.batchQuantity}</td></tr>)}</tbody>
            </table>
          </div>
          <footer className="sp-footer"><span>جميع المبالغ بالدينار الكويتي (د.ك)</span><span className="sp-footer-dot" /> بيانات الكتالوج من المنتجات المحفوظة لهذه الجلسة</footer>
        </section>
      </main>
    </div>
  );
}

export default App;
