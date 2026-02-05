import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getRoleByName, assignRoleToUser } from "../services/role.service";

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

    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      roleId: userRole._id,
    });

    res.status(201).json({ message: "User registered successfully" });
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
  const userId = req.user.id;

  const user = await User.findById(userId).populate("roleId").select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
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
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: "User deleted successfully" });
};

/* ================= ASSIGN ROLE TO USER (SUPERADMIN) ================= */
export const assignRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ message: "roleId is required" });
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
