export const COST_FIELDS = [
  "purchaseCost",
  "packagingCost",
  "deliveryCost",
  "paymentFee",
];

const NUMERIC_INPUT_FIELDS = [
  ...COST_FIELDS,
  "targetMarginPercent",
  "comparisonSellingPrice",
];

export function validatePricingInputs(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { values: null, errors: { body: "أرسل بيانات الحاسبة بصيغة صحيحة." } };
  }

  const paymentFeeType = body.paymentFeeType ?? "fixed";
  if (!["fixed", "percentage"].includes(paymentFeeType)) {
    errors.paymentFeeType = "اختر رسوم دفع ثابتة أو نسبة مئوية.";
  }

  for (const field of NUMERIC_INPUT_FIELDS) {
    const value = body[field];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1_000_000
    ) {
      errors[field] = "أدخل رقمًا من صفر إلى 1,000,000.";
    }
  }

  if (
    typeof body.targetMarginPercent === "number" &&
    (body.targetMarginPercent < 0 || body.targetMarginPercent > 90)
  ) {
    errors.targetMarginPercent = "يجب أن يكون هامش الربح بين 0٪ و90٪.";
  }

  if (
    paymentFeeType === "percentage" &&
    typeof body.paymentFee === "number" &&
    body.paymentFee > 100
  ) {
    errors.paymentFee = "يجب ألا تتجاوز رسوم الدفع 100٪.";
  }

  if (
    paymentFeeType === "percentage" &&
    typeof body.paymentFee === "number" &&
    typeof body.targetMarginPercent === "number" &&
    body.paymentFee + body.targetMarginPercent >= 100
  ) {
    errors.paymentFee = "اجمع الهامش ورسوم الدفع؛ يجب أن يكون مجموعهما أقل من 100٪.";
  }

  if (Object.keys(errors).length) return { values: null, errors };

  return {
    values: {
      ...Object.fromEntries(NUMERIC_INPUT_FIELDS.map((field) => [field, body[field]])),
      paymentFeeType,
    },
    errors: null,
  };
}

export function calculatePricing(inputs) {
  const paymentFeeType = inputs.paymentFeeType ?? "fixed";
  const baseCost = COST_FIELDS
    .filter((field) => field !== "paymentFee")
    .reduce((sum, field) => sum + inputs[field], 0);
  const margin = inputs.targetMarginPercent / 100;
  const paymentFeeRate = paymentFeeType === "percentage" ? inputs.paymentFee / 100 : 0;
  const fixedPaymentFee = paymentFeeType === "fixed" ? inputs.paymentFee : 0;
  const denominator = 1 - margin - paymentFeeRate;
  const suggestedSellingPrice = denominator > 0
    ? (baseCost + fixedPaymentFee) / denominator
    : 0;
  const suggested = calculatePricingAtPrice(inputs, suggestedSellingPrice, baseCost);
  const comparison = calculatePricingAtPrice(inputs, inputs.comparisonSellingPrice, baseCost);
  const comparisonMarginPercent =
    comparison.marginPercent;

  return {
    totalCost: suggested.totalCost,
    suggestedSellingPrice,
    suggestedProfit: suggested.profit,
    comparisonTotalCost: comparison.totalCost,
    comparisonProfit: comparison.profit,
    comparisonMarginPercent,
  };
}

function calculatePricingAtPrice(inputs, sellingPrice, baseCost) {
  const paymentFeeType = inputs.paymentFeeType ?? "fixed";
  const paymentFeeRate = paymentFeeType === "percentage" ? inputs.paymentFee / 100 : 0;
  const paymentFeeAmount = sellingPrice <= 0
    ? 0
    : paymentFeeType === "percentage"
      ? sellingPrice * paymentFeeRate
      : inputs.paymentFee;
  const totalCost = baseCost + paymentFeeAmount;
  return {
    totalCost,
    profit: sellingPrice - totalCost,
    marginPercent: sellingPrice === 0 ? 0 : ((sellingPrice - totalCost) / sellingPrice) * 100,
  };
}
