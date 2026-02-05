import { Router } from "express";
import {
  register,
  login,
  getUsers,
  updateUser,
  deleteUser,
  assignRole,
} from "../controllers/auth.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/users", protect, getUsers);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);

// Superadmin-only: assign role to users
router.patch("/users/:id/role", protect, requireRole("superadmin"), assignRole);

export default router;
