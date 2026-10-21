import { Router } from "express";
import Notification from "../models/Notification.js";
import { publicNotification, recordNotification, notificationDay } from "../services/notifications.js";
import { NOTIFICATION_TARGETS } from "../../../shared/notifications.js";

const router = Router();
const validId = (id) => /^[a-f0-9]{24}$/i.test(id || "");
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", async (req, res, next) => {
  if (req.query.before && !validId(req.query.before)) return res.status(400).json({ message: "معرّف الإشعار غير صالح." });
  try {
    const owner = { userId: req.user._id, deletedAt: null };
    const notifications = await Notification.find({ ...owner, ...(req.query.before ? { _id: { $lt: req.query.before } } : {}) }).sort({ _id: -1 }).limit(30).lean();
    const unreadCount = await Notification.countDocuments({ ...owner, readAt: null });
    return res.json({ notifications: notifications.map(publicNotification), unreadCount, nextCursor: notifications.length === 30 ? String(notifications.at(-1)._id) : null });
  } catch (error) { return next(error); }
});
router.use((req, res, next) => {
  if (req.get("X-Smart-Pricing") !== "1") return res.status(403).json({ message: "طلب الإشعارات غير صالح." });
  next();
});
router.post("/client-events", async (req, res, next) => {
  const { code, target } = req.body || {};
  if (!["validation_error", "save_failed", "login_failed", "connection_error"].includes(code) || !NOTIFICATION_TARGETS.includes(target)) {
    return res.status(400).json({ message: "نوع الإشعار أو وجهته غير صالح." });
  }
  try {
    const item = await recordNotification(req.user._id, code, `client:${code}:${target}:${notificationDay()}`, {}, target);
    return res.json({ notification: item && !item.deletedAt ? publicNotification(item) : null });
  } catch (error) { return next(error); }
});
router.post("/demo", async (req, res, next) => {
  try {
    let item = await recordNotification(req.user._id, "demo", "demo-notification");
    if (req.body?.reset === true) {
      item = await Notification.findOneAndUpdate({ _id: item._id, userId: req.user._id }, { $set: { readAt: null, deletedAt: null } }, { returnDocument: "after" });
    }
    return res.json({ notification: item && !item.deletedAt ? publicNotification(item) : null });
  } catch (error) { return next(error); }
});
router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, deletedAt: null, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ success: true });
  } catch (error) { return next(error); }
});
router.use("/:id", (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "معرّف الإشعار غير صالح." });
  next();
});
router.patch("/:id/read", async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, deletedAt: null }, { $set: { readAt: new Date() } }, { returnDocument: "after" });
    if (!item) return res.status(404).json({ message: "الإشعار غير موجود." });
    return res.json({ notification: publicNotification(item) });
  } catch (error) { return next(error); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, deletedAt: null }, { $set: { deletedAt: new Date() } }, { returnDocument: "after" });
    if (!item) return res.status(404).json({ message: "الإشعار غير موجود." });
    return res.json({ success: true });
  } catch (error) { return next(error); }
});
export default router;
