import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  getAllPermissions,
  createRole,
  updateRole,
  listUsersWithRoles,
} from "../controllers/admin.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// All authenticated users can view
router.get("/permissions", protect, getAllPermissions);
router.get("/roles", protect, getAllRoles);
router.get("/roles/:id", protect, getRoleById);

// Superadmin only
router.post("/roles", protect, requireRole("superadmin"), createRole);
router.patch("/roles/:id", protect, requireRole("superadmin"), updateRole);
router.get("/users", protect, requireRole("superadmin"), listUsersWithRoles);

export default router;
