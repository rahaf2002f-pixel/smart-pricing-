import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  passwordHash: { type: String, required: true, select: false },
  workspaceId: { type: String, required: true, default: randomUUID, unique: true, immutable: true, select: false },
  profileCompleted: { type: Boolean, required: true, default: true },
  profileCompletedAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
