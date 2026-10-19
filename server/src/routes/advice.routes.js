import { Router } from "express";
import { calculateProductPricing, calculateProfitAtPrice, validateProductInput } from "../services/products.js";

const router = Router();
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.1-flash-lite";

function getProviderErrorMessage(status) {
  if (status === 400 || status === 404) {
    return "رفض OpenRouter الطلب أو لم يتعرف على النموذج. تحقق من إعداد OPENROUTER_MODEL.";
  }
  if (status === 401) {
    return "لم يقبل OpenRouter مفتاح API. راجع المفتاح في Secrets ثم أعد تشغيل التطبيق.";
  }
  if (status === 402) {
    return "رصيد OpenRouter غير كافٍ لإكمال الطلب. أضف رصيدًا أو اختر نموذجًا مجانيًا.";
  }
  if (status === 403) {
    return "حساب OpenRouter لا يملك صلاحية استخدام النموذج المحدد.";
  }
  if (status === 429) {
    return "وصلت إلى حد طلبات OpenRouter مؤقتًا. انتظر قليلًا ثم أعد المحاولة.";
  }
  if (status >= 500) {
    return "خدمة OpenRouter أو مزود النموذج غير متاح الآن. أعد المحاولة لاحقًا.";
  }
  return "تعذر الحصول على اقتراح ذكي من OpenRouter. تحقق من إعداد النموذج ثم أعد المحاولة.";
}

router.post("/:sessionId", async (req, res) => {
  if (!SESSION_ID_PATTERN.test(req.params.sessionId)) {
    return res.status(400).json({ message: "معرّف الجلسة غير صالح." });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({
      code: "OPENROUTER_NOT_CONFIGURED",
      message: "أضف OPENROUTER_API_KEY في Secrets لتفعيل الاقتراحات الذكية. بقية الحسابات تعمل دون هذا المفتاح.",
    });
  }

  const request = req.body ?? {};
  const productInput = request.product && typeof request.product === "object"
    ? { ...request.product, name: request.product.name?.trim() || "المنتج" }
    : null;
  const validation = validateProductInput(productInput);
  if (validation.errors) {
    return res.status(400).json({ message: "تحقق من بيانات المنتج قبل طلب الاقتراح.", errors: validation.errors });
  }

  const discountPercent = request.discountPercent ?? 0;
  if (typeof discountPercent !== "number" || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return res.status(400).json({ message: "أدخل خصمًا من صفر إلى 100٪." });
  }

  const product = validation.values;
  const calculated = calculateProductPricing(product);
  const before = calculateProfitAtPrice(product, calculated.sellingPrice);
  const discountedPrice = calculated.sellingPrice * (1 - discountPercent / 100);
  const after = calculateProfitAtPrice(product, discountedPrice);
  const metrics = {
    currency: "KWD",
    targetMarginPercent: product.targetMarginPercent,
    suggestedSellingPrice: calculated.suggestedSellingPrice,
    sellingPrice: calculated.sellingPrice,
    paymentFeeType: product.paymentFeeType,
    paymentFee: product.paymentFee,
    paymentFeeAmount: before.paymentFeeAmount,
    totalCost: before.totalCost,
    expectedProfit: before.expectedProfit,
    marginPercent: before.marginPercent,
    discountPercent,
    discountedPrice,
    discountedPaymentFeeAmount: after.paymentFeeAmount,
    discountedTotalCost: after.totalCost,
    discountedProfit: after.expectedProfit,
    discountedMarginPercent: after.marginPercent,
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://replit.com",
        "X-Title": "Smart Pricing AI",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
        temperature: 0.35,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content: "أنت مساعد تسعير لمتجر صغير في الكويت. أجب بالعربية باختصار وبناءً على الأرقام المرفقة فقط. لا تعِد حساب الأرقام ولا تخترع أسعارًا أو رسومًا؛ الحسابات البرمجية نهائية. فسّر ملاءمة السعر والهامش وتأثير الخصم، وقدّم خطوة عملية واحدة لتقليل التكلفة أو تحسين الربح. وضّح إذا كان الخصم يجعل الربح سالبًا أو منخفضًا.",
          },
          {
            role: "user",
            content: `حلّل هذه النتائج الرقمية المحسوبة برمجيًا وقدّم نصيحة عربية موجزة:\n${JSON.stringify(metrics)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return res.status(502).json({ message: getProviderErrorMessage(response.status) });
    }
    const data = await response.json();
    const advice = data.choices?.[0]?.message?.content;
    if (typeof advice !== "string" || !advice.trim()) {
      return res.status(502).json({ message: "لم يصل اقتراح صالح من OpenRouter. أعد المحاولة." });
    }
    return res.json({ advice: advice.trim().slice(0, 2400), metrics });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return res.status(504).json({ message: "تأخر رد OpenRouter. أعد المحاولة بعد قليل." });
    }
    return res.status(502).json({ message: "تعذر الاتصال بخدمة الاقتراحات الآن. الحسابات الأساسية ما زالت متاحة." });
  }
});

export default router;
