import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import User from "../models/user.model";
import { Types } from "mongoose";

export const createRole = async (
  name: string,
  description: string,
  permissionIds: string[]
) => {
  const role = await Role.create({
    name: name.toLowerCase(),
    description,
    permissions: permissionIds,
  });
  return role.populate("permissions");
};

export const getRoleById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) return null;
  const role = await Role.findById(id).populate("permissions");
  return role;
};

export const getRoleByName = async (name: string) => {
  const role = await Role.findOne({ name: name.toLowerCase() }).populate("permissions");
  return role;
};

export const getAllRoles = async () => {
  const roles = await Role.find({ isActive: true }).populate("permissions");
  return roles;
};

export const assignRoleToUser = async (userId: string, roleId: string) => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(roleId)) return null;
  const user = await User.findByIdAndUpdate(userId, { roleId }, { new: true }).populate("roleId");
  return user;
};

export const getUserWithRole = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).populate({
    path: "roleId",
    populate: { path: "permissions" },
  });
  return user;
};

export const getUserPermissions = async (userId: string) => {
  const user = await getUserWithRole(userId);
  if (!user || !user.roleId) return [];
  const role = user.roleId as any;
  const permissions = role.permissions || [];
  return permissions.map((p: any) => p.name);
};

export const createPermission = async (name: string, description: string, resource: string, action: string) => {
  const permission = await Permission.create({ name, description, resource, action });
  return permission;
};

export const getPermissionsByResource = async (resource: string) => {
  const permissions = await Permission.find({ resource });
  return permissions;
};
