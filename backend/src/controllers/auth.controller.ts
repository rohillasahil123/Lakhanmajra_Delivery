import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getRoleByName, assignRoleToUser, getUserWithRole, getUserPermissions } from "../services/role.service";

const JWT_SECRET = process.env.JWT_SECRET as string;

/* ================= OTP STORAGE (In-Memory) ================= */
interface OtpStore {
  [key: string]: {
    otp: string;
    expiresAt: number;
    attempts: number;
    userData?: { name: string; email: string; phone: string };
  };
}

const otpStore: OtpStore = {};

// Generate random 4-digit OTP
const generateOtp = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const generateInternalPassword = (): string => {
  return `otp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

// Clear expired OTPs
const clearExpiredOtps = () => {
  const now = Date.now();
  for (const key in otpStore) {
    if (otpStore[key].expiresAt < now) {
      delete otpStore[key];
    }
  }
};

/* ================= SEND OTP ================= */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length < 10) {
      return res.status(400).json({ message: "Valid phone number is required" });
    }

    clearExpiredOtps();

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore[phone] = {
      otp,
      expiresAt,
      attempts: 0,
    };

    // Show OTP in terminal (for development, will replace with SMS later)
    console.log(`\n🔐 OTP for ${phone}: ${otp}`);
    console.log(`⏰ Expires in 10 minutes\n`);

    res.json({
      message: "OTP sent successfully",
      phone: `${phone.slice(0, -4)}****`,
      expiresIn: "10 minutes",
      // For development only - remove in production
      // otp,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ================= VERIFY OTP & REGISTER ================= */
export const verifyOtpAndRegister = async (req: Request, res: Response) => {
  try {
    const { phone, otp, name, email, village } = req.body;

    if (!phone || !otp || !name || !email || !village) {
      return res.status(400).json({ message: "All fields are required" });
    }

    clearExpiredOtps();

    // Check if OTP exists
    if (!otpStore[phone]) {
      return res.status(400).json({ message: "OTP not found. Please request a new OTP" });
    }

    const storedOtp = otpStore[phone];

    // Check if OTP expired
    if (storedOtp.expiresAt < Date.now()) {
      delete otpStore[phone];
      return res.status(400).json({ message: "OTP expired. Please request a new OTP" });
    }

    // Check attempt limit
    if (storedOtp.attempts >= 3) {
      delete otpStore[phone];
      return res.status(400).json({ message: "Too many attempts. Please request a new OTP" });
    }

    // Verify OTP
    if (storedOtp.otp !== otp) {
      storedOtp.attempts += 1;
      return res.status(400).json({ message: "Invalid OTP. Please try again" });
    }

    // OTP is valid - check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      delete otpStore[phone];
      return res.status(400).json({ message: "User already registered with this email or phone" });
    }

    // Create new user
    const userRole = await getRoleByName("user");
    if (!userRole) {
      return res.status(500).json({ message: "Default user role not found" });
    }

    const hashedPassword = await bcrypt.hash(generateInternalPassword(), 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      village,
      password: hashedPassword,
      roleId: userRole._id,
    });

    // Delete OTP after successful registration
    delete otpStore[phone];

    // Generate token
    const role = userRole as any;
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, roleId: newUser.roleId, roleName: role?.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const safeUser = await User.findById(newUser._id).select("-password").populate("roleId");

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        village: newUser.village,
        role: role?.name || "user",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

/* ================= VERIFY OTP ONLY ================= */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    clearExpiredOtps();

    if (!otpStore[phone]) {
      return res.status(400).json({ message: "OTP not found" });
    }

    const storedOtp = otpStore[phone];

    if (storedOtp.expiresAt < Date.now()) {
      delete otpStore[phone];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts += 1;
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const existingUser = await User.findOne({ phone }).populate("roleId");

    if (existingUser) {
      delete otpStore[phone];

      const role = existingUser.roleId as any;
      const token = jwt.sign(
        {
          id: existingUser._id,
          email: existingUser.email,
          roleId: existingUser.roleId,
          roleName: role?.name,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "OTP verified. Login successful",
        verified: true,
        isExistingUser: true,
        token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          village: (existingUser as any).village,
          role: role?.name || "user",
        },
      });
    }

    res.json({
      message: "OTP verified successfully",
      phone,
      verified: true,
      isExistingUser: false,
    });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};

/* ================= REGISTER ================= */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, village } = req.body;

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
      village,
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
        address: (user as any).address || '',
        deliveryInstructions: (user as any).deliveryInstructions || '',
        latitude: (user as any).latitude,
        longitude: (user as any).longitude,
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
    const userId = req.user?.id || req.user?._id;
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
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, deliveryInstructions, latitude, longitude } = req.body;

    const requesterId = String(req.user?.id || req.user?._id || '');
    const requesterRole = String(req.user?.role || req.user?.roleName || req.user?.roleId?.name || '').toLowerCase();
    const isAdminUser = requesterRole === 'admin' || requesterRole === 'superadmin';

    if (!isAdminUser && requesterId !== String(id)) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const updates: any = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof email === 'string') updates.email = email.trim().toLowerCase();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (typeof address === 'string') updates.address = address.trim();
    if (typeof deliveryInstructions === 'string') updates.deliveryInstructions = deliveryInstructions.trim();
    if (typeof latitude === 'number' && Number.isFinite(latitude)) updates.latitude = latitude;
    if (typeof longitude === 'number' && Number.isFinite(longitude)) updates.longitude = longitude;

    if (updates.phone && updates.phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(updated);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Update failed' });
  }
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
