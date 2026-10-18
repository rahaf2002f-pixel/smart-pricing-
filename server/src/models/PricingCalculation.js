import mongoose from "mongoose";

const pricingCalculationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    purchaseCost: { type: Number, required: true, min: 0 },
    packagingCost: { type: Number, required: true, min: 0 },
    deliveryCost: { type: Number, required: true, min: 0 },
    paymentFee: { type: Number, required: true, min: 0 },
    targetMarginPercent: { type: Number, required: true, min: 0, max: 90 },
    comparisonSellingPrice: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    suggestedSellingPrice: { type: Number, required: true, min: 0 },
    suggestedProfit: { type: Number, required: true },
    comparisonProfit: { type: Number, required: true },
    comparisonMarginPercent: { type: Number, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("PricingCalculation", pricingCalculationSchema);
