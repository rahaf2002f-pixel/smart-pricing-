import { Router } from "express";
import mongoose from "mongoose";
import PricingCalculation from "../models/PricingCalculation.js";
import {
  calculatePricing,
  validatePricingInputs,
} from "../services/pricing.js";

const router = Router();
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function requireDatabase(res) {
  if (isDatabaseReady()) return true;
  res.status(503).json({
    message: "قاعدة البيانات غير متصلة. أضف MONGODB_URI ثم أعد تشغيل التطبيق.",
  });
  return false;
}

function serialize(document) {
  return {
    sessionId: document.sessionId,
    purchaseCost: document.purchaseCost,
    packagingCost: document.packagingCost,
    deliveryCost: document.deliveryCost,
    paymentFee: document.paymentFee,
    paymentFeeType: document.paymentFeeType ?? "fixed",
    targetMarginPercent: document.targetMarginPercent,
    comparisonSellingPrice: document.comparisonSellingPrice,
    totalCost: document.totalCost,
    suggestedSellingPrice: document.suggestedSellingPrice,
    suggestedProfit: document.suggestedProfit,
    comparisonProfit: document.comparisonProfit,
    comparisonMarginPercent: document.comparisonMarginPercent,
    updatedAt: document.updatedAt,
  };
}

router.get("/calculations/:sessionId", async (req, res, next) => {
  if (!SESSION_ID_PATTERN.test(req.params.sessionId)) {
    return res.status(400).json({ message: "معرّف الحساب غير صالح." });
  }
  if (!requireDatabase(res)) return;

  try {
    const calculation = await PricingCalculation.findOne({
      sessionId: req.params.sessionId,
    }).lean();
    if (!calculation) {
      return res.status(404).json({ message: "لا يوجد حساب محفوظ بعد." });
    }
    return res.json(serialize(calculation));
  } catch (error) {
    return next(error);
  }
});

router.put("/calculations/:sessionId", async (req, res, next) => {
  if (!SESSION_ID_PATTERN.test(req.params.sessionId)) {
    return res.status(400).json({ message: "معرّف الحساب غير صالح." });
  }
  if (!requireDatabase(res)) return;

  const { values, errors } = validatePricingInputs(req.body);
  if (errors) {
    return res.status(400).json({
      message: "تحقق من قيم التكاليف والأسعار.",
      errors,
    });
  }

  try {
    const computed = calculatePricing(values);
    const calculation = await PricingCalculation.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { $set: { ...values, ...computed } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
    return res.json(serialize(calculation));
  } catch (error) {
    return next(error);
  }
});

export default router;
