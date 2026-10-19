import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCalculatorInputs, sanitizeNumericInput, updateCalculatorInputs } from "./calculatorInputs.js";

const defaults = {
  purchaseCost: 4.5,
  packagingCost: 0.85,
  deliveryCost: 1.5,
  paymentFee: 0.25,
  paymentFeeType: "fixed",
  targetMarginPercent: 50,
  comparisonSellingPrice: 16.2,
};

test("keeps a cleared numeric field empty while treating it as zero for saving", () => {
  const next = updateCalculatorInputs(defaults, "purchaseCost", "");

  assert.equal(next.purchaseCost, "");
  assert.equal(normalizeCalculatorInputs(next).purchaseCost, 0);
});

test("preserves decimal input text while normalizing it to a number for persistence", () => {
  const partial = updateCalculatorInputs(defaults, "purchaseCost", "4.");
  const complete = updateCalculatorInputs(partial, "purchaseCost", "4.75");

  assert.equal(partial.purchaseCost, "4.");
  assert.equal(complete.purchaseCost, "4.75");
  assert.equal(normalizeCalculatorInputs(complete).purchaseCost, 4.75);
});

test("limits percentage payment fees and reduces an incompatible target margin", () => {
  const percentage = { ...defaults, paymentFeeType: "percentage", targetMarginPercent: "50" };
  const next = updateCalculatorInputs(percentage, "paymentFee", "95");

  assert.equal(next.paymentFee, "95");
  assert.ok(Number(next.targetMarginPercent) <= 4.99);
});

test("sanitizes negative amounts and keeps a cleared amount editable", () => {
  assert.equal(sanitizeNumericInput("-5"), "0");
  assert.equal(sanitizeNumericInput(""), "");
  assert.equal(sanitizeNumericInput("2.", { max: 10 }), "2.");
});

test("keeps quantity positive and whole-numbered", () => {
  assert.equal(sanitizeNumericInput("0", { min: 1, integer: true }), "1");
  assert.equal(sanitizeNumericInput("3.8", { min: 1, integer: true }), "3");
});
