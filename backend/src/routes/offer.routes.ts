import { Router } from "express";
import {
  createOffer,
  deleteOffer,
  getOffers,
  listAllOffers,
  updateOffer,
} from "../controllers/offer.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";
import { upload, handleUploadError } from "../middlewares/upload.middleware";

const router = Router();

router.get("/", getOffers);

router.get("/admin", protect, requireRole("superadmin"), listAllOffers);
router.post(
  "/admin",
  protect,
  requireRole("superadmin"),
  upload.single("image"),
  handleUploadError,
  createOffer
);
router.patch(
  "/admin/:id",
  protect,
  requireRole("superadmin"),
  upload.single("image"),
  handleUploadError,
  updateOffer
);
router.delete("/admin/:id", protect, requireRole("superadmin"), deleteOffer);

export default router;
