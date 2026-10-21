import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export default mongoose.model("AuthSession", authSessionSchema);
