import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import User from "../models/user.model";
import Order from "../models/order.model";
import { Audit } from "../models/audit.model";
import { recordAudit } from "./audit.service";
import { success, fail } from "../utils/response";

const riderKycRequiredFields = [
  'fullName',
  'dateOfBirth',
  'phoneNumber',
  'aadhaarNumber',
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlNumber',
  'dlExpiryDate',
  'dlFrontImage',
  'vehicleNumber',
  'vehicleType',
  'rcFrontImage',
  'insuranceImage',
] as const;

const isRiderKycProfileComplete = (profile: any): boolean =>
  riderKycRequiredFields.every((field) => typeof profile?.[field] === 'string' && profile[field].trim().length > 0);

// Get all roles
export const getAllRoles = async (_req: Request, res: Response) => {
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
export const getAllPermissions = async (_req: Request, res: Response) => {
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
    
    /**
     * AUDIT: Log role creation for compliance and security audit trails
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'role_create',
      resource: 'role',
      resourceId: String(role._id),
      after: role.toObject(),
      meta: { permissions: permissionIds?.length ?? 0 },
    }).catch(() => {}); // non-blocking
    
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

    const before = await Role.findById(id);
    const role = await Role.findByIdAndUpdate(id, update, { new: true }).populate('permissions');
    if (!role) return fail(res, 'Role not found', 404);

    /**
     * AUDIT: Log role updates for compliance and security audit trails
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'role_update',
      resource: 'role',
      resourceId: id,
      before: before?.toObject(),
      after: role.toObject(),
      meta: { updatedFields: Object.keys(update) },
    }).catch(() => {}); // non-blocking

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

    /**
     * AUDIT: Log role deletion for compliance tracking
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'role_delete',
      resource: 'role',
      resourceId: id,
      before: role.toObject(),
      meta: { deletedName: role.name },
    }).catch(() => {}); // non-blocking

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
// List all users with their roles
export const listUsersWithRoles = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", role, status, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const superAdminRole = await Role.findOne({ name: 'superadmin' }).select('_id').lean();
    const superAdminRoleId = superAdminRole?._id;

    const query: any = {};

    // ---------------- ROLE FILTER ----------------
    if (role) {
      const roleQuery = String(role).trim();
      let roleDoc = null;

      // If ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(roleQuery)) {
        roleDoc = await Role.findById(roleQuery).select("_id");
      }

      // If role name
      roleDoc ??= await Role.findOne({
        name: roleQuery.toLowerCase(),
      }).select("_id");

      if (!roleDoc) {
        return success(
          res,
          { users: [], total: 0, page: Number(page), limit: Number(limit) },
          "Users fetched"
        );
      }

      // Never return superadmin users in this endpoint
      if (superAdminRoleId && roleDoc._id.toString() === superAdminRoleId.toString()) {
        return success(
          res,
          { users: [], total: 0, page: Number(page), limit: Number(limit) },
          "Users fetched"
        );
      }

      query.roleId = roleDoc._id;
    }

    // Exclude superadmin from any non-expanded list
    if (!query.roleId && superAdminRoleId) {
      query.roleId = { $ne: superAdminRoleId };
    }

    // ---------------- STATUS FILTER ----------------
    if (status === "active") {
      query.isActive = true;
    }

    if (status === "inactive") {
      query.isActive = false;
    }

    // ---------------- SEARCH FILTER ----------------
    if (search !== undefined) {
      const s = String(search || "").trim();
      if (s.length > 0) {
        // escape regex special chars to avoid injection and unintended patterns
        const escapeRegex = (str: string) => str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        const regex = new RegExp(escapeRegex(s), "i");

        query.$or = [
          { name: regex },
          { email: regex },
          { phone: regex },
        ];
      }
    }

    // ---------------- FETCH USERS ----------------
    const users = await User.find(query)
      .populate("roleId")
      .select("-password")
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    return success(
      res,
      { users, total, page: Number(page), limit: Number(limit) },
      "Users fetched"
    );
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

export const listRiderKycQueue = async (req: Request, res: Response) => {
  try {
    const {status = 'pending', page = '1', limit = '20'} = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const riderRole = await Role.findOne({name: 'rider'}).select('_id').lean();
    if (!riderRole?._id) {
      return success(res, {users: [], total: 0, page: Number(page), limit: Number(limit)}, 'KYC queue fetched');
    }

    const query: any = {roleId: riderRole._id};
    if (status && status !== 'all') {
      if (status === 'incomplete') {
        query.$or = [
          {kycStatus: {$in: ['pending', 'not_submitted', 'rejected']}},
          {kycStatus: {$exists: false}},
          {kycStatus: null},
          {kycStatus: ''},
        ];
      } else if (status === 'not_submitted') {
        query.$or = [
          {kycStatus: 'not_submitted'},
          {kycStatus: {$exists: false}},
          {kycStatus: null},
          {kycStatus: ''},
        ];
      } else {
        query.kycStatus = status;
      }
    }

    const users = await User.find(query)
      .populate('roleId')
      .populate('kycReviewedBy', 'name email')
      .select('-password')
      .sort({updatedAt: -1})
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    return success(res, {users, total, page: Number(page), limit: Number(limit)}, 'KYC queue fetched');
  } catch (err: any) {
    return fail(res, err.message || 'KYC queue fetch failed', 500);
  }
};

export const reviewRiderKyc = async (req: Request, res: Response) => {
  try {
    let {id} = req.params as any;
    if (Array.isArray(id)) id = id[0];
    const riderId = String(id || '');

    if (!riderId) {
      return fail(res, 'Rider ID is required', 400);
    }

    const {status, reason} = req.body as {status?: 'approved' | 'rejected'; reason?: string};

    if (!status || !['approved', 'rejected'].includes(status)) {
      return fail(res, 'status must be approved or rejected', 400);
    }

    if (status === 'rejected' && !String(reason || '').trim()) {
      return fail(res, 'Reject reason is required', 400);
    }

    const before = await User.findById(riderId).select('kycStatus kycRejectReason riderProfile').lean();
    if (!before) {
      return fail(res, 'Rider not found', 404);
    }

    if (status === 'approved' && !isRiderKycProfileComplete((before as any).riderProfile)) {
      return fail(res, 'Rider profile is incomplete. Approve not allowed until all KYC fields are submitted.', 400);
    }

    const updated = await User.findByIdAndUpdate(
      riderId,
      {
        kycStatus: status,
        kycRejectReason: status === 'rejected' ? String(reason).trim() : '',
        kycReviewedAt: new Date(),
        kycReviewedBy: (req as any).user?._id || null,
      },
      {new: true}
    )
      .populate('roleId')
      .populate('kycReviewedBy', 'name email')
      .select('-password');

    await Audit.create({
      actorId: (req as any).user?._id || null,
      action: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
      resource: 'rider_kyc',
      resourceId: riderId,
      before,
      after: {kycStatus: status, kycRejectReason: status === 'rejected' ? String(reason).trim() : ''},
      meta: {reviewedAt: new Date().toISOString()},
    });

    return success(res, updated, `Rider KYC ${status}`);
  } catch (err: any) {
    return fail(res, err.message || 'KYC review failed', 500);
  }
};

// Superadmin: update user's isActive (activate/deactivate)
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') return fail(res, 'isActive must be boolean', 400);

    const user = await User.findById(id).populate('roleId');
    if (!user) return fail(res, 'User not found', 404);

    const isSuperAdmin =
      user.email === 'superadmin@example.com' ||
      (user.roleId && (user.roleId as any)?.name === 'superadmin');
    if (isSuperAdmin) {
      return fail(res, 'Cannot change status of superadmin user', 403);
    }

    /**
     * AUDIT: Log user status changes for security compliance
     */
    const before = user.toObject ? user.toObject() : user;
    const updatedUser = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    
    recordAudit({
      actorId: (req as any).user?.id,
      action: isActive ? 'user_activate' : 'user_deactivate',
      resource: 'user',
      resourceId: id,
      before: { isActive: (before as any).isActive },
      after: { isActive },
      meta: { userEmail: (before as any).email },
    }).catch(() => {}); // non-blocking
    
    return success(res, updatedUser, 'User status updated');
  } catch (err: any) {
    return fail(res, err.message || 'Update failed', 500);
  }
};

// Superadmin: summary counts by role
export const getUserSummary = async (_req: Request, res: Response) => {
  try {
    const superAdminRole = await Role.findOne({ name: 'superadmin' }).select('_id').lean();
    const superAdminRoleId = superAdminRole?._id;

    const roles = await Role.find({ isActive: true, name: { $ne: 'superadmin' } });
    const summary: any = {};

    for (const r of roles) {
      const count = await User.countDocuments({ roleId: r._id });
      summary[r.name] = count;
    }

    const total = await User.countDocuments(superAdminRoleId ? { roleId: { $ne: superAdminRoleId } } : {});
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

      // revenue in range (all non-cancelled orders)
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // average delivery time in minutes for delivered orders in range
      Order.aggregate([
        { $match: { status: 'delivered', updatedAt: { $gte: start, $lte: end } } },
        { $project: { diffMinutes: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60] } } },
        { $group: { _id: null, avgMinutes: { $avg: '$diffMinutes' } } },
      ]),

      // active users: number of currently active users in system
      User.countDocuments({ isActive: true }),

      // orders by day
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // revenue by day
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: start, $lte: end } } },
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
    const activeUsers = typeof activeUsersAgg === 'number' ? activeUsersAgg : 0;

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

/* ================= CREATE USER (SUPERADMIN ONLY) ================= */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, roleId } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !roleId) {
      return fail(res, 'name, email, phone, password, and roleId are required', 400);
    }

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return fail(res, 'User with this email already exists', 400);
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return fail(res, 'Role not found', 404);
    }

    if (role.name === 'superadmin') {
      return fail(res, 'Cannot create superadmin user via this endpoint', 403);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      roleId,
      isActive: true,
    });

    // Return user with role populated (without password)
    await user.populate('roleId');
    const safeUser = { ...user.toObject(), password: undefined };

    /**
     * AUDIT: Log user creation for security compliance
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'user_create',
      resource: 'user',
      resourceId: String(user._id),
      after: { name, email, phone, roleId },
      meta: { role: (typeof roleId === 'string' ? roleId : roleId?._id) || roleId },
    }).catch(() => {}); // non-blocking

    return success(res, safeUser, 'User created successfully', 201);
  } catch (err: any) {
    return fail(res, err.message || 'User creation failed', 500);
  }
};

/* ================= UPDATE USER (SUPERADMIN ONLY) ================= */
export const updateUser = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const { name, email, phone, roleId } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return fail(res, 'User not found', 404);
    }

    // Prevent editing superadmin (except superadmin themselves)
    const userRole = await Role.findById(user.roleId).select('name');
    const isSuperAdmin =
      user.email === 'superadmin@example.com' ||
      userRole?.name === 'superadmin';

    if (isSuperAdmin) {
      return fail(res, 'Cannot edit superadmin user', 403);
    }

    // Build update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return fail(res, 'Role not found', 404);
      updateData.roleId = roleId;
    }
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existing) return fail(res, 'Email already in use', 400);
      updateData.email = email.toLowerCase();
    }

    // Update user
    const before = user.toObject ? user.toObject() : user;
    const updated = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .populate('roleId');

    /**
     * AUDIT: Log user updates for security compliance
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'user_update',
      resource: 'user',
      resourceId: id,
      before: { name: (before as any).name, email: (before as any).email, phone: (before as any).phone, roleId: (before as any).roleId },
      after: { name: updateData.name || (before as any).name, email: updateData.email || (before as any).email, phone: updateData.phone || (before as any).phone, roleId: updateData.roleId || (before as any).roleId },
      meta: { updatedFields: Object.keys(updateData) },
    }).catch(() => {}); // non-blocking

    return success(res, updated, 'User updated successfully');
  } catch (err: any) {
    return fail(res, err.message || 'User update failed', 500);
  }
};

/* ================= DELETE USER (SUPERADMIN ONLY) ================= */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return fail(res, 'User not found', 404);
    }

    // Prevent deletion of superadmin user
    if (user.email === 'superadmin@example.com' || user.roleId.toString() === (await Role.findOne({ name: 'superadmin' }))?._id.toString()) {
      return fail(res, 'Cannot delete superadmin user', 403);
    }

    /**
     * AUDIT: Log user deletion for compliance and security audit trails
     */
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'user_delete',
      resource: 'user',
      resourceId: id,
      before: user.toObject(),
      meta: { deletedName: user.name, deletedEmail: user.email, deletedPhone: user.phone },
    }).catch(() => {}); // non-blocking

    // Delete user
    await User.findByIdAndDelete(id);

    const stillExists = await User.findById(id);
    if (stillExists) {
      return fail(res, 'User could not be deleted from DB', 500);
    }

    return success(res, { deletedId: id }, 'User deleted successfully');
  } catch (err: any) {
    return fail(res, err.message || 'User deletion failed', 500);
  }
};