import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventKey: { type: String, required: true, maxlength: 180 },
  code: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
  target: { type: String, required: true },
  level: { type: String, enum: ["success", "info", "warning", "danger"], required: true },
  readAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ userId: 1, eventKey: 1 }, { unique: true });
schema.index({ userId: 1, deletedAt: 1, _id: -1 });
export default mongoose.model("Notification", schema);
