import { Router } from "express";
import {
  register,
  login,
  getUsers,
  updateUser,
  getPermissions,
  assignRole,
  sendOtp,
  verifyOtp,
  verifyOtpAndRegister,
} from "../controllers/auth.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

// Traditional registration and login
router.post("/register", register);
router.post("/login", login);

// OTP-based registration
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register-with-otp", verifyOtpAndRegister);

router.get('/permissions', protect, getPermissions);
router.get("/users", protect, getUsers);
router.put("/users/:id", protect, updateUser);

// Assign role to users (requires roles:manage permission)
router.patch('/users/:id/role', protect, requirePermission('roles:manage'), assignRole);

export default router;
