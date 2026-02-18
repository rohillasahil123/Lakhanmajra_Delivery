import { Request, Response } from "express";
import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import User from "../models/user.model";
import Order from "../models/order.model";
import { Product } from "../models/product.model";
import { Audit } from "../models/audit.model";
import { success, fail } from "../utils/response";

// Get all roles
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find({ isActive: true }).populate("permissions");
    return success(res, roles, "Roles fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// Get single role with permissions
export const getRoleById = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const role = await Role.findById(id).populate("permissions");
    if (!role) return fail(res, "Role not found", 404);
    return success(res, role, "Role fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// Get all permissions
export const getAllPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await Permission.find();
    return success(res, permissions, "Permissions fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// Create role with permissions (superadmin only)
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name || !description) {
      return fail(res, "name and description are required", 400);
    }

    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) {
      return fail(res, "Role already exists", 400);
    }

    const role = await Role.create({
      name: name.toLowerCase(),
      description,
      permissions: permissionIds || [],
    });

    await role.populate("permissions");
    return success(res, role, "Role created", 201);
  } catch (err: any) {
    return fail(res, err.message || "Create failed", 500);
  }
};

// Update role (name, description, permissions)
export const updateRole = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { name, description, permissionIds } = req.body;

    const update: any = { description };
    if (Array.isArray(permissionIds)) update.permissions = permissionIds;
    if (name) update.name = name.toLowerCase();

    // if name provided ensure uniqueness
    if (name) {
      const existing = await Role.findOne({ name: name.toLowerCase(), _id: { $ne: id } });
      if (existing) return fail(res, 'Role name already exists', 400);
    }

    const role = await Role.findByIdAndUpdate(id, update, { new: true }).populate('permissions');
    if (!role) return fail(res, 'Role not found', 404);

    return success(res, role, 'Role updated');
  } catch (err: any) {
    return fail(res, err.message || 'Update failed', 500);
  }
};

// Delete role (will prevent deleting core roles or roles that have assigned users)
export const deleteRole = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const role = await Role.findById(id);
    if (!role) return fail(res, 'Role not found', 404);

    // protect built-in roles
    if (['superadmin', 'user', 'admin'].includes(role.name)) {
      return fail(res, 'Cannot delete built-in role', 400);
    }

    const usersWithRole = await User.countDocuments({ roleId: role._id });
    if (usersWithRole > 0) {
      return fail(res, 'Role is assigned to users; reassign users before deleting', 400);
    }

    await Role.findByIdAndDelete(id);
    return success(res, null, 'Role deleted');
  } catch (err: any) {
    return fail(res, err.message || 'Delete failed', 500);
  }
};

// Get users assigned to a role (paginated)
export const getUsersByRole = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { page = '1', limit = '50' } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find({ roleId: id }).select('-password').skip(skip).limit(Number(limit));
    const total = await User.countDocuments({ roleId: id });

    return success(res, { users, total, page: Number(page), limit: Number(limit) }, 'Users by role fetched');
  } catch (err: any) {
    return fail(res, err.message || 'Fetch failed', 500);
  }
};

// List all users with their roles
export const listUsersWithRoles = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find({ isActive: true })
      .populate("roleId")
      .select("-password")
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments({ isActive: true });

    return success(res, { users, total, page: Number(page), limit: Number(limit) }, "Users fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// Superadmin: update user's isActive (activate/deactivate)
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') return fail(res, 'isActive must be boolean', 400);

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    if (!user) return fail(res, 'User not found', 404);

    return success(res, user, 'User status updated');
  } catch (err: any) {
    return fail(res, err.message || 'Update failed', 500);
  }
};

// Superadmin: summary counts by role
export const getUserSummary = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find({ isActive: true });
    const summary: any = {};

    for (const r of roles) {
      const count = await User.countDocuments({ roleId: r._id });
      summary[r.name] = count;
    }

    const total = await User.countDocuments({});
    return success(res, { summary, total }, 'User summary fetched');
  } catch (err: any) {
    return fail(res, err.message || 'Fetch failed', 500);
  }
};

// Dashboard / reporting metrics (aggregated)
export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const { range = '30', from, to } = req.query as any;
    const days = Math.max(1, Number(range) || 30);

    const end = to ? new Date(String(to)) : new Date();
    const start = from ? new Date(String(from)) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Parallel aggregations
    const [
      totalOrders,
      ordersInRange,
      ordersToday,
      pendingOrders,
      revenueAgg,
      avgDeliveryAgg,
      activeUsersAgg,
      ordersByDayAgg,
      revenueByDayAgg,
      statusBreakdownAgg,
      topProductsAgg,
      riderPerfAgg,
    ] = await Promise.all([
      // total orders (all time)
      Order.countDocuments({}),

      // orders in selected range
      Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),

      // orders today
      Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),

      // pending / processing
      Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),

      // revenue in range (paid orders)
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // average delivery time in minutes for delivered orders in range
      Order.aggregate([
        { $match: { status: 'delivered', updatedAt: { $gte: start, $lte: end } } },
        { $project: { diffMinutes: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60] } } },
        { $group: { _id: null, avgMinutes: { $avg: '$diffMinutes' } } },
      ]),

      // active users (unique users who placed orders in range)
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$userId' } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),

      // orders by day
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // revenue by day
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),

      // order status breakdown
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // top products in range
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', qty: { $sum: '$items.quantity' } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { productId: '$_id', qty: 1, name: '$product.name', images: '$product.images' } },
      ]),

      // rider performance (delivered orders)
      Order.aggregate([
        { $match: { status: 'delivered', assignedRiderId: { $ne: null }, updatedAt: { $gte: start, $lte: end } } },
        { $project: { assignedRiderId: 1, diffMinutes: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60] } } },
        { $group: { _id: '$assignedRiderId', delivered: { $sum: 1 }, avgMinutes: { $avg: '$diffMinutes' } } },
        { $sort: { delivered: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'rider' } },
        { $unwind: { path: '$rider', preserveNullAndEmptyArrays: true } },
        { $project: { riderId: '$_id', delivered: 1, avgMinutes: 1, name: '$rider.name' } },
      ]),
    ]);

    const revenue = (revenueAgg[0]?.total ?? 0);
    const avgDeliveryMinutes = avgDeliveryAgg[0]?.avgMinutes ?? null;
    const activeUsers = activeUsersAgg[0]?.count ?? 0;

    // build per-day arrays across the full range (fill zeros)
    const daysArr: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      daysArr.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const ordersByDayMap: Record<string, number> = {};
    for (const d of ordersByDayAgg) ordersByDayMap[d._id] = d.count;
    const revenueByDayMap: Record<string, number> = {};
    for (const r of revenueByDayAgg) revenueByDayMap[r._id] = r.total;

    const ordersByDay = daysArr.map((d) => ({ date: d, orders: ordersByDayMap[d] ?? 0 }));
    const revenueByDay = daysArr.map((d) => ({ date: d, revenue: revenueByDayMap[d] ?? 0 }));

    const statusBreakdown = statusBreakdownAgg.map((s) => ({ status: s._id, count: s.count }));
    const topProducts = topProductsAgg.map((p) => ({ productId: p.productId, name: p.name ?? 'Unknown', qty: p.qty, images: p.images ?? [] }));
    const riderPerformance = riderPerfAgg.map((r) => ({ riderId: r.riderId, name: r.name ?? 'Unknown', delivered: r.delivered, avgMinutes: Math.round(r.avgMinutes) }));

    return success(res, {
      totalOrders,
      ordersInRange,
      ordersToday,
      pendingOrders,
      revenue,
      avgDeliveryMinutes: avgDeliveryMinutes ? Math.round(avgDeliveryMinutes) : null,
      activeUsers,
      ordersByDay,
      revenueByDay,
      statusBreakdown,
      topProducts,
      riderPerformance,
    }, 'Metrics fetched');
  } catch (err: any) {
    return fail(res, err.message || 'Metrics fetch failed', 500);
  }
};
// Get audit logs (admin reporting)
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { resource, action, resourceId, page = '1', limit = '50' } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const filters: any = {};

    if (resource) filters.resource = resource;
    if (action) filters.action = action;
    if (resourceId) filters.resourceId = resourceId;

    const logs = await Audit.find(filters)
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Audit.countDocuments(filters);

    return success(res, { logs, total, page: Number(page), limit: Number(limit) }, 'Audit logs fetched');
  } catch (err: any) {
    return fail(res, err.message || 'Fetch failed', 500);
  }
};