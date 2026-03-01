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
import { authLimiter } from "../middlewares/rateLimiter.middleware";

const router = Router();

// Traditional registration and login
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// OTP-based registration
router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/register-with-otp", authLimiter, verifyOtpAndRegister);

router.get('/permissions', protect, getPermissions);
router.get("/users", protect, getUsers);
router.put("/users/:id", protect, updateUser);

// Assign role to users (requires roles:manage permission)
router.patch('/users/:id/role', protect, requirePermission('roles:manage'), assignRole);

export default router;
