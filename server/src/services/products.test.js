import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateProductPricing,
  validateProductInput,
} from "./products.js";

const sample = {
  name: "عطر تجريبي",
  sku: "SKU-001",
  category: "عطور",
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  marketingCost: 0.5,
  operationalCost: 0.5,
  customCosts: [{ label: "ملصق", amount: 0.5 }],
  batchQuantity: 100,
  targetMarginPercent: 50,
};

test("validates product costs and calculates per-piece and batch profit", () => {
  const validated = validateProductInput(sample);
  assert.equal(validated.errors, null);

  const result = calculateProductPricing(validated.values);
  assert.equal(result.totalCost, 8.6);
  assert.equal(result.batchTotalCost, 860);
  assert.equal(result.suggestedSellingPrice, 17.2);
  assert.equal(result.expectedProfit, 8.6);
  assert.equal(result.batchExpectedProfit, 860);
  assert.equal(result.marginPercent, 50);
});

test("uses an entered selling price and supports a loss-making comparison", () => {
  const validated = validateProductInput({ ...sample, sellingPrice: 7 });
  assert.equal(validated.errors, null);

  const result = calculateProductPricing(validated.values);
  assert.equal(result.sellingPrice, 7);
  assert.ok(Math.abs(result.expectedProfit + 1.6) < 1e-10);
  assert.ok(result.marginPercent < 0);
});

test("rejects invalid quantities, costs, margin, and custom cost labels", () => {
  assert.ok(validateProductInput({ ...sample, batchQuantity: 0 }).errors);
  assert.ok(validateProductInput({ ...sample, marketingCost: -1 }).errors);
  assert.ok(validateProductInput({ ...sample, targetMarginPercent: 91 }).errors);
  assert.ok(validateProductInput({ ...sample, customCosts: [{ label: "", amount: 1 }] }).errors);
});
