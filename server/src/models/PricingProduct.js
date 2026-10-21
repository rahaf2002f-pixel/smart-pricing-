import mongoose from "mongoose";

const customCostSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0, max: 1_000_000 },
  },
  { _id: false },
);

const pricingProductSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, immutable: true, index: true },
    sessionId: { type: String, required: true, immutable: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, default: "", trim: true, maxlength: 40 },
    category: { type: String, default: "بدون تصنيف", trim: true, maxlength: 80 },
    purchaseCost: { type: Number, required: true, min: 0, max: 1_000_000 },
    packagingCost: { type: Number, required: true, min: 0, max: 1_000_000 },
    deliveryCost: { type: Number, required: true, min: 0, max: 1_000_000 },
    paymentFee: { type: Number, required: true, min: 0, max: 1_000_000 },
    paymentFeeType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    paymentFeeAmount: { type: Number, default: 0, min: 0 },
    marketingCost: { type: Number, required: true, min: 0, max: 1_000_000 },
    operationalCost: { type: Number, required: true, min: 0, max: 1_000_000 },
    customCosts: { type: [customCostSchema], default: [] },
    batchQuantity: { type: Number, required: true, min: 1, max: 1_000_000 },
    targetMarginPercent: { type: Number, required: true, min: 0, max: 90 },
    totalCost: { type: Number, required: true, min: 0 },
    batchTotalCost: { type: Number, required: true, min: 0 },
    suggestedSellingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0, max: 1_000_000 },
    expectedProfit: { type: Number, required: true },
    batchExpectedProfit: { type: Number, required: true },
    marginPercent: { type: Number, required: true },
  },
  { timestamps: true },
);

pricingProductSchema.index({ sessionId: 1, updatedAt: -1 });

export default mongoose.model("PricingProduct", pricingProductSchema);
