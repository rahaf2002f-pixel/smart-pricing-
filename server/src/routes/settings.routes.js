import { Router } from "express";
import mongoose from "mongoose";
import PricingSettings from "../models/PricingSettings.js";
import { workspaceFilter } from "../middleware/account.js";

const router = Router();
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_SETTINGS = {
  defaultDeliveryFee: 0,
  defaultPaymentFee: 0,
  defaultPaymentFeeType: "fixed",
};

function validSession(req, res) {
  if (SESSION_ID_PATTERN.test(req.params.sessionId)) return true;
  res.status(400).json({ message: "معرّف الجلسة غير صالح." });
  return false;
}

function databaseReady(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({ message: "قاعدة البيانات غير متصلة. أضف MONGODB_URI ثم أعد تشغيل التطبيق." });
  return false;
}

function serialize(settings) {
  return {
    defaultDeliveryFee: settings?.defaultDeliveryFee ?? 0,
    defaultPaymentFee: settings?.defaultPaymentFee ?? 0,
    defaultPaymentFeeType: settings?.defaultPaymentFeeType ?? "fixed",
  };
}

router.get("/:sessionId", async (req, res, next) => {
  if (!validSession(req, res) || !databaseReady(res)) return;
  try {
    const settings = await PricingSettings.findOne(workspaceFilter(req)).lean();
    return res.json({ settings: settings ? serialize(settings) : EMPTY_SETTINGS });
  } catch (error) {
    return next(error);
  }
});

router.put("/:sessionId", async (req, res, next) => {
  if (!validSession(req, res) || !databaseReady(res)) return;
  const { defaultDeliveryFee, defaultPaymentFee, defaultPaymentFeeType } = req.body ?? {};
  const errors = {};
  for (const [field, value] of [
    ["defaultDeliveryFee", defaultDeliveryFee],
    ["defaultPaymentFee", defaultPaymentFee],
  ]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
      errors[field] = "أدخل قيمة من صفر إلى 1,000,000.";
    }
  }
  if (!["fixed", "percentage"].includes(defaultPaymentFeeType)) {
    errors.defaultPaymentFeeType = "اختر رسوم دفع ثابتة أو نسبة مئوية.";
  }
  if (defaultPaymentFeeType === "percentage" && defaultPaymentFee >= 100) {
    errors.defaultPaymentFee = "يجب أن تكون رسوم الدفع النسبية أقل من 100٪.";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "تحقق من إعدادات الرسوم.", errors });
  }

  try {
    const settings = await PricingSettings.findOneAndUpdate(
      workspaceFilter(req),
      { $set: { defaultDeliveryFee, defaultPaymentFee, defaultPaymentFeeType } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    return res.json({ settings: serialize(settings) });
  } catch (error) {
    return next(error);
  }
});

export default router;
