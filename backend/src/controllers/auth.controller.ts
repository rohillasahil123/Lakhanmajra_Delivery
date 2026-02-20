import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getRoleByName, assignRoleToUser, getUserWithRole, getUserPermissions } from "../services/role.service";

const JWT_SECRET = process.env.JWT_SECRET as string;

/* ================= REGISTER ================= */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const userRole = await getRoleByName("user");
    if (!userRole) {
      return res.status(500).json({ message: "Default user role not found. Please seed roles first." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      roleId: userRole._id,
    });

    const safeUser = await User.findById(created._id).select('-password').populate('roleId');
    res.status(201).json({ message: "User registered successfully", user: safeUser });
  } catch (err) {
    res.status(500).json({ message: "Register failed" });
  }
};

/* ================= LOGIN ================= */
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    }).populate("roleId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = user.roleId as any;
    const token = jwt.sign(
      { id: user._id, email: user.email, roleId: user.roleId, roleName: role?.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: role?.name || "user",
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= GET LOGGED IN USER ================= */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithRole(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const safeUser = (user as any).toObject ? { ...user.toObject(), password: undefined } : user;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ message: "Fetch failed" });
  }
};

/* ================= GET CURRENT USER PERMISSIONS ================= */
export const getPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const perms = await getUserPermissions(req.user!.id);
    return res.json({ permissions: perms });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch permissions" });
  }
};

/* ================= UPDATE USER ================= */
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email } = req.body;

  const updated = await User.findByIdAndUpdate(
    id,
    { name, email },
    { new: true }
  ).select("-password");

  res.json(updated);
};

/* ================= DELETE USER ================= */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deletion of superadmin user
    const user = await User.findById(id).populate("roleId");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const role = user.roleId as any;
    if (role?.name === "superadmin" || user.email === "superadmin@example.com") {
      return res.status(403).json({ message: "Cannot delete superadmin user" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};

/* ================= ASSIGN ROLE TO USER (SUPERADMIN) ================= */
export const assignRole = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    let { roleId } = req.body;

    // Ensure id and roleId are strings (not arrays)
    if (Array.isArray(id)) id = id[0];
    if (Array.isArray(roleId)) roleId = roleId[0];

    if (!roleId || typeof roleId !== 'string') {
      return res.status(400).json({ message: "roleId is required and must be a string" });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "id is required and must be a string" });
    }

    const user = await assignRoleToUser(id, roleId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User role updated", user });
  } catch (err: any) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
}
