import { Router } from "express";
import {
  register,
  login,
  getUsers,
  updateUser,
  deleteUser,
  assignRole,
  getPermissions,
} from "../controllers/auth.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get('/permissions', protect, getPermissions);
router.get("/users", protect, getUsers);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);

// Assign role to users (requires roles:manage permission)
router.patch('/users/:id/role', protect, requirePermission('roles:manage'), assignRole);

export default router;
