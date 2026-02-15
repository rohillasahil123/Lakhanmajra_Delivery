import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole,
  getUsersByRole,
  listUsersWithRoles,
  updateUserStatus,
  getUserSummary,
  getDashboardMetrics,
  getAuditLogs,
} from "../controllers/admin.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { adminListOrders, assignOrderToRider, adminUpdateOrderStatus, adminGetOrderById } from "../controllers/order.controller";

const router = Router();

// All authenticated users can view
router.get("/permissions", protect, getAllPermissions);
router.get("/roles", protect, getAllRoles);
router.get("/roles/:id", protect, getRoleById);

// Orders (admin views)
router.get('/orders', protect, requirePermission('orders:view'), adminListOrders);
router.get('/orders/:id', protect, requirePermission('orders:view'), adminGetOrderById);
router.get('/metrics', protect, requirePermission('reports:view'), getDashboardMetrics);
router.patch('/orders/:id/assign', protect, requirePermission('orders:assign'), assignOrderToRider);
router.patch('/orders/:id/status', protect, requirePermission('orders:update'), adminUpdateOrderStatus);

// Role management (requires roles:manage permission)
router.post('/roles', protect, requirePermission('roles:manage'), createRole);
router.patch('/roles/:id', protect, requirePermission('roles:manage'), updateRole);
router.delete('/roles/:id', protect, requirePermission('roles:manage'), deleteRole);
router.get('/roles/:id/users', protect, requirePermission('users:view'), getUsersByRole);

router.get('/users', protect, requirePermission('users:view'), listUsersWithRoles);
router.get('/users/summary', protect, requirePermission('users:view'), getUserSummary);

// Superadmin: activate / deactivate user
router.patch('/users/:id/status', protect, requireRole('superadmin'), updateUserStatus);

// Audit logs (admin / reports:view)
router.get('/audit', protect, requirePermission('reports:view'), getAuditLogs);

export default router;
