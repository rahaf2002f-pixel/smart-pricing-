import { Router } from "express";
import mongoose from "mongoose";
import PricingProduct from "../models/PricingProduct.js";
import { notifyProduct } from "../services/notifications.js";
import { workspaceFilter } from "../middleware/account.js";
import {
  calculateProductPricing,
  validateProductInput,
} from "../services/products.js";

const router = Router();
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireDatabase(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    message: "قاعدة البيانات غير متصلة. أضف MONGODB_URI ثم أعد تشغيل التطبيق.",
  });
  return false;
}

function validSession(req, res) {
  if (SESSION_ID_PATTERN.test(req.params.sessionId)) return true;
  res.status(400).json({ message: "معرّف الجلسة غير صالح." });
  return false;
}

function serialize(product) {
  return {
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    category: product.category,
    purchaseCost: product.purchaseCost,
    packagingCost: product.packagingCost,
    deliveryCost: product.deliveryCost,
    paymentFee: product.paymentFee,
    paymentFeeType: product.paymentFeeType ?? "fixed",
    paymentFeeAmount: product.paymentFeeAmount ?? product.paymentFee,
    marketingCost: product.marketingCost,
    operationalCost: product.operationalCost,
    customCosts: product.customCosts,
    batchQuantity: product.batchQuantity,
    targetMarginPercent: product.targetMarginPercent,
    totalCost: product.totalCost,
    batchTotalCost: product.batchTotalCost,
    suggestedSellingPrice: product.suggestedSellingPrice,
    sellingPrice: product.sellingPrice,
    expectedProfit: product.expectedProfit,
    batchExpectedProfit: product.batchExpectedProfit,
    marginPercent: product.marginPercent,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseProduct(body) {
  const result = validateProductInput(body);
  if (result.errors) return result;
  return { ...result, computed: calculateProductPricing(result.values) };
}

router.get("/:sessionId", async (req, res, next) => {
  if (!validSession(req, res) || !requireDatabase(res)) return;
  try {
    const products = await PricingProduct.find(workspaceFilter(req))
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ products: products.map(serialize) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:sessionId", async (req, res, next) => {
  if (!validSession(req, res) || !requireDatabase(res)) return;
  const { values, computed, errors } = parseProduct(req.body);
  if (errors) {
    return res.status(400).json({ message: "تحقق من بيانات المنتج وتكاليفه.", errors });
  }

  try {
    const product = await PricingProduct.create({
      ...workspaceFilter(req),
      ...values,
      ...computed,
    });
    await notifyProduct(req.user._id, product, "product_created", values);
    return res.status(201).json({ product: serialize(product) });
  } catch (error) {
    return next(error);
  }
});

router.put("/:sessionId/:productId", async (req, res, next) => {
  if (!validSession(req, res) || !requireDatabase(res)) return;
  if (!mongoose.isValidObjectId(req.params.productId)) {
    return res.status(400).json({ message: "معرّف المنتج غير صالح." });
  }
  const { values, computed, errors } = parseProduct(req.body);
  if (errors) {
    return res.status(400).json({ message: "تحقق من بيانات المنتج وتكاليفه.", errors });
  }

  try {
    const product = await PricingProduct.findOneAndUpdate(
      { _id: req.params.productId, ...workspaceFilter(req) },
      { $set: { ...values, ...computed } },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return res.status(404).json({ message: "المنتج غير موجود." });
    await notifyProduct(req.user._id, product, "product_updated", values);
    return res.json({ product: serialize(product) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:sessionId/:productId", async (req, res, next) => {
  if (!validSession(req, res) || !requireDatabase(res)) return;
  if (!mongoose.isValidObjectId(req.params.productId)) {
    return res.status(400).json({ message: "معرّف المنتج غير صالح." });
  }

  try {
    const result = await PricingProduct.deleteOne({
      _id: req.params.productId,
      ...workspaceFilter(req),
    });
    if (result.deletedCount === 0) return res.status(404).json({ message: "المنتج غير موجود." });
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
