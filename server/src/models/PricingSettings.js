import mongoose from "mongoose";

const pricingSettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, immutable: true, index: true },
    sessionId: { type: String, required: true, unique: true, immutable: true },
    defaultDeliveryFee: { type: Number, default: 0, min: 0, max: 1_000_000 },
    defaultPaymentFee: { type: Number, default: 0, min: 0, max: 1_000_000 },
    defaultPaymentFeeType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
  },
  { timestamps: true },
);

export default mongoose.model("PricingSettings", pricingSettingsSchema);
