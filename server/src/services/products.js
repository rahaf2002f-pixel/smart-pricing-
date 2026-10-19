export const PRODUCT_COST_FIELDS = [
  "purchaseCost",
  "packagingCost",
  "deliveryCost",
  "paymentFee",
  "marketingCost",
  "operationalCost",
];

const MAX_COST = 1_000_000;
const MAX_CUSTOM_COSTS = 20;

export function validateProductInput(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { values: null, errors: { body: "أرسل بيانات المنتج بصيغة صحيحة." } };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    errors.name = "أدخل اسمًا للمنتج لا يتجاوز 120 حرفًا.";
  }

  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  if (sku.length > 40) errors.sku = "رمز المنتج لا يتجاوز 40 حرفًا.";

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (category.length > 80) errors.category = "التصنيف لا يتجاوز 80 حرفًا.";

  const values = {
    name,
    sku,
    category: category || "بدون تصنيف",
  };

  for (const field of PRODUCT_COST_FIELDS) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > MAX_COST) {
      errors[field] = "أدخل تكلفة من صفر إلى 1,000,000.";
    } else {
      values[field] = value;
    }
  }

  const batchQuantity = body.batchQuantity;
  if (
    typeof batchQuantity !== "number" ||
    !Number.isInteger(batchQuantity) ||
    batchQuantity < 1 ||
    batchQuantity > MAX_COST
  ) {
    errors.batchQuantity = "أدخل كمية صحيحة من قطعة واحدة إلى 1,000,000.";
  } else {
    values.batchQuantity = batchQuantity;
  }

  const targetMarginPercent = body.targetMarginPercent;
  if (
    typeof targetMarginPercent !== "number" ||
    !Number.isFinite(targetMarginPercent) ||
    targetMarginPercent < 0 ||
    targetMarginPercent > 90
  ) {
    errors.targetMarginPercent = "يجب أن يكون هامش الربح بين 0٪ و90٪.";
  } else {
    values.targetMarginPercent = targetMarginPercent;
  }

  if (body.sellingPrice !== undefined && body.sellingPrice !== null) {
    if (
      typeof body.sellingPrice !== "number" ||
      !Number.isFinite(body.sellingPrice) ||
      body.sellingPrice < 0 ||
      body.sellingPrice > MAX_COST
    ) {
      errors.sellingPrice = "أدخل سعر بيع من صفر إلى 1,000,000.";
    } else {
      values.sellingPrice = body.sellingPrice;
    }
  }

  const customCosts = body.customCosts ?? [];
  if (!Array.isArray(customCosts) || customCosts.length > MAX_CUSTOM_COSTS) {
    errors.customCosts = `يمكن إضافة حتى ${MAX_CUSTOM_COSTS} بنود تكلفة.`;
  } else {
    values.customCosts = customCosts.map((item, index) => {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      const amount = item?.amount;
      if (!label || label.length > 80) {
        errors[`customCosts.${index}.label`] = "اكتب اسم بند التكلفة بحد أقصى 80 حرفًا.";
      }
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > MAX_COST) {
        errors[`customCosts.${index}.amount`] = "أدخل تكلفة من صفر إلى 1,000,000.";
      }
      return { label, amount };
    });
  }

  return Object.keys(errors).length
    ? { values: null, errors }
    : { values, errors: null };
}

export function calculateProductPricing(inputs) {
  const customTotal = inputs.customCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalCost =
    PRODUCT_COST_FIELDS.reduce((sum, field) => sum + inputs[field], 0) + customTotal;
  const margin = inputs.targetMarginPercent / 100;
  const suggestedSellingPrice = margin === 0 ? totalCost : totalCost / (1 - margin);
  const sellingPrice = inputs.sellingPrice ?? suggestedSellingPrice;
  const expectedProfit = sellingPrice - totalCost;
  const marginPercent = sellingPrice === 0 ? 0 : (expectedProfit / sellingPrice) * 100;

  return {
    totalCost,
    batchTotalCost: totalCost * inputs.batchQuantity,
    suggestedSellingPrice,
    sellingPrice,
    expectedProfit,
    batchExpectedProfit: expectedProfit * inputs.batchQuantity,
    marginPercent,
  };
}
