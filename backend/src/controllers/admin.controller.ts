import { Request, Response } from "express";
import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import User from "../models/user.model";
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
    const { id } = req.params;
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

// Update role permissions (superadmin only)
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, permissionIds } = req.body;

    const role = await Role.findByIdAndUpdate(
      id,
      { description, permissions: permissionIds },
      { new: true }
    ).populate("permissions");

    if (!role) return fail(res, "Role not found", 404);
    return success(res, role, "Role updated");
  } catch (err: any) {
    return fail(res, err.message || "Update failed", 500);
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
