export function sanitizeNumericInput(rawValue, { min = 0, max = 1_000_000, integer = false } = {}) {
  if (rawValue === "") return "";
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;
  let safeValue = Math.min(max, Math.max(min, value));
  if (integer) safeValue = Math.floor(safeValue);
  return safeValue === value ? rawValue : String(safeValue);
}

export function updateCalculatorInputs(current, key, rawValue) {
  if (key === "paymentFeeType") {
    if (!["fixed", "percentage"].includes(rawValue)) return current;
    const rate = rawValue === "percentage" ? Number(current.paymentFee) || 0 : 0;
    const maxMargin = Math.max(0, Math.min(90, 99.99 - rate));
    const currentMargin = Number(current.targetMarginPercent) || 0;
    return {
      ...current,
      paymentFeeType: rawValue,
      targetMarginPercent: currentMargin > maxMargin
        ? String(maxMargin)
        : current.targetMarginPercent,
    };
  }

  let maxValue = 1_000_000;
  if (key === "targetMarginPercent") {
    const rate = current.paymentFeeType === "percentage" ? Number(current.paymentFee) || 0 : 0;
    maxValue = Math.max(0, Math.min(90, 99.99 - rate));
  }
  if (key === "paymentFee" && current.paymentFeeType === "percentage") maxValue = 99;

  const nextValue = sanitizeNumericInput(rawValue, { max: maxValue });
  if (nextValue === null) return current;

  const next = {
    ...current,
    [key]: nextValue,
  };

  if (key === "paymentFee" || key === "targetMarginPercent") {
    const rate = next.paymentFeeType === "percentage" ? Number(next.paymentFee) || 0 : 0;
    const maxMargin = Math.max(0, Math.min(90, 99.99 - rate));
    if ((Number(next.targetMarginPercent) || 0) > maxMargin) {
      next.targetMarginPercent = String(maxMargin);
    }
  }

  return next;
}

export function normalizeCalculatorInputs(inputs) {
  return Object.fromEntries(Object.entries(inputs).map(([key, value]) => [
    key,
    key === "paymentFeeType" ? value : Math.max(0, Number(value) || 0),
  ]));
}
