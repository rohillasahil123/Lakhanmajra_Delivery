import { Router } from "express";
import {
  createNotification,
  deleteNotification,
  listAdminNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDeviceToken,
  unregisterDeviceToken,
  updateNotification,
} from "../controllers/notification.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";
import { upload, handleUploadError } from "../middlewares/upload.middleware";

const router = Router();

router.get("/me", protect, listMyNotifications);
router.patch("/:id/read", protect, markNotificationRead);
router.patch("/read-all", protect, markAllNotificationsRead);
router.post("/device-token", protect, registerDeviceToken);
router.delete("/device-token", protect, unregisterDeviceToken);

router.get("/admin", protect, requireRole("superadmin"), listAdminNotifications);
router.post(
  "/admin",
  protect,
  requireRole("superadmin"),
  upload.single("image"),
  handleUploadError,
  createNotification
);
router.patch(
  "/admin/:id",
  protect,
  requireRole("superadmin"),
  upload.single("image"),
  handleUploadError,
  updateNotification
);
router.delete("/admin/:id", protect, requireRole("superadmin"), deleteNotification);

export default router;
