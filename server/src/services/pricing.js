export const COST_FIELDS = [
  "purchaseCost",
  "packagingCost",
  "deliveryCost",
  "paymentFee",
];

const INPUT_FIELDS = [
  ...COST_FIELDS,
  "targetMarginPercent",
  "comparisonSellingPrice",
];

export function validatePricingInputs(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { values: null, errors: { body: "أرسل بيانات الحاسبة بصيغة صحيحة." } };
  }

  for (const field of INPUT_FIELDS) {
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

  if (Object.keys(errors).length) return { values: null, errors };

  return {
    values: Object.fromEntries(INPUT_FIELDS.map((field) => [field, body[field]])),
    errors: null,
  };
}

export function calculatePricing(inputs) {
  const totalCost = COST_FIELDS.reduce((sum, field) => sum + inputs[field], 0);
  const margin = inputs.targetMarginPercent / 100;
  const suggestedSellingPrice =
    margin === 0 ? totalCost : totalCost / (1 - margin);
  const suggestedProfit = suggestedSellingPrice - totalCost;
  const comparisonProfit = inputs.comparisonSellingPrice - totalCost;
  const comparisonMarginPercent =
    inputs.comparisonSellingPrice === 0
      ? 0
      : (comparisonProfit / inputs.comparisonSellingPrice) * 100;

  return {
    totalCost,
    suggestedSellingPrice,
    suggestedProfit,
    comparisonProfit,
    comparisonMarginPercent,
  };
}
