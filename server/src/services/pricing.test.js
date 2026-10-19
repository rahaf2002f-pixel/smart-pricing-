import test from "node:test";
import assert from "node:assert/strict";
import { calculatePricing, validatePricingInputs } from "./pricing.js";

const sample = {
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  targetMarginPercent: 50,
  comparisonSellingPrice: 16.2,
};

test("calculates total cost, target-margin price, and comparison profit", () => {
  const result = calculatePricing(sample);
  assert.equal(result.totalCost, 7.1);
  assert.equal(result.suggestedSellingPrice, 14.2);
  assert.ok(Math.abs(result.suggestedProfit - 7.1) < 1e-10);
  assert.ok(Math.abs(result.comparisonProfit - 9.1) < 1e-10);
  assert.ok(Math.abs(result.comparisonMarginPercent - (9.1 / 16.2) * 100) < 1e-10);
});

test("supports zero target margin and zero comparison price", () => {
  const result = calculatePricing({
    ...sample,
    targetMarginPercent: 0,
    comparisonSellingPrice: 0,
  });
  assert.equal(result.suggestedSellingPrice, result.totalCost);
  assert.equal(result.suggestedProfit, 0);
  assert.equal(result.comparisonMarginPercent, 0);
});

test("solves the target price and comparison profit with percentage payment fees", () => {
  const inputs = {
    ...sample,
    paymentFee: 3,
    paymentFeeType: "percentage",
    targetMarginPercent: 40,
    comparisonSellingPrice: 20,
  };
  const result = calculatePricing(inputs);
  const expectedPrice = 6.85 / (1 - 0.4 - 0.03);
  assert.ok(Math.abs(result.suggestedSellingPrice - expectedPrice) < 1e-10);
  assert.ok(Math.abs(result.suggestedProfit / result.suggestedSellingPrice * 100 - 40) < 1e-10);
  assert.ok(Math.abs(result.comparisonTotalCost - 7.45) < 1e-10);
  assert.ok(Math.abs(result.comparisonProfit - 12.55) < 1e-10);
});

test("rejects negative costs and margins over the supported limit", () => {
  assert.ok(validatePricingInputs({ ...sample, packagingCost: -0.1 }).errors);
  assert.ok(validatePricingInputs({ ...sample, targetMarginPercent: 91 }).errors);
  assert.equal(validatePricingInputs(sample).errors, null);
  assert.ok(validatePricingInputs({
    ...sample,
    paymentFee: 10,
    paymentFeeType: "percentage",
    targetMarginPercent: 90,
  }).errors);
});
