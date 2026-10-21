import { createHash } from "node:crypto";
import Notification from "../models/Notification.js";
import { NOTIFICATION_DEFINITIONS } from "../../../shared/notifications.js";

export const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
export const notificationDay = () => new Date().toISOString().slice(0, 10);
export function publicNotification(item) {
  return { id: String(item._id), code: item.code, params: item.params || {}, target: item.target, level: item.level, readAt: item.readAt, createdAt: item.createdAt };
}
export async function recordNotification(userId, code, eventKey, params = {}, target) {
  if (!userId || !NOTIFICATION_DEFINITIONS[code]) return null;
  const definition = NOTIFICATION_DEFINITIONS[code];
  try {
    return await Notification.findOneAndUpdate({ userId, eventKey }, { $setOnInsert: {
      userId, eventKey, code, params, target: target || definition.target, level: definition.level, readAt: null, deletedAt: null,
    } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code === 11000) return Notification.findOne({ userId, eventKey });
    throw error;
  }
}
// A notification failure must not turn an already-committed product save into a
// failed request (which could cause the user to create a second product).
export async function notifySafely(...args) {
  try { return await recordNotification(...args); }
  catch (error) { console.error("Notification write unavailable:", error.name, error.code || ""); return null; }
}
export async function notifyProduct(userId, product, code, values) {
  const id = String(product._id), state = fingerprint(values);
  await notifySafely(userId, code, `${code}:${id}:${state}`, { name: product.name });
  if (product.expectedProfit < -0.000001) {
    await notifySafely(userId, "loss_warning", `loss:${id}:${state}`, { name: product.name });
  } else if (product.marginPercent + 0.01 < product.targetMarginPercent) {
    await notifySafely(userId, "margin_warning", `margin:${id}:${state}`, { name: product.name });
  }
}
