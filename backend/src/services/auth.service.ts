import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { getRoleByName, assignRoleToUser, getUserWithRole, getUserPermissions } from "./role.service";

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
const verifiedOtps: Set<string> = new Set();

const normalizePhoneForOtp = (rawPhone?: string): string => {
	if (!rawPhone) return "";
	const digits = String(rawPhone).replace(/\D/g, "");
	// Normalize to 10-digit mobile so all requests are consistent
	if (digits.startsWith("91") && digits.length > 10) {
		return digits.slice(digits.length - 10);
	}
	return digits.slice(digits.length - 10);
};

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
		if (otpStore[key] && otpStore[key].expiresAt < now) {
			delete otpStore[key];
		}
	}
};

/**
 * SECURITY: IP-based rate limiting for OTP requests
 * Prevent brute force attacks by limiting OTP requests per IP
 * Max 3 OTP requests per IP in 10 minute window
 */
interface RateLimitEntry {
	attempts: number;
	resetAt: number;
}

const otpRateLimiter: { [key: string]: RateLimitEntry } = {};
const OTP_RATE_LIMIT_ATTEMPTS = 3;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const checkOtpRateLimit = (ip: string | undefined): { allowed: boolean; message: string } => {
	if (!ip) ip = "unknown";

	const now = Date.now();
	const limiter = otpRateLimiter[ip];

	// If no entry or window expired, reset
	if (!limiter || limiter.resetAt < now) {
		otpRateLimiter[ip] = { attempts: 1, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS };
		return { allowed: true, message: "OTP request allowed" };
	}

	// Check if limit exceeded
	if (limiter.attempts >= OTP_RATE_LIMIT_ATTEMPTS) {
		const remainingSeconds = Math.ceil((limiter.resetAt - now) / 1000);
		return {
			allowed: false,
			message: `Too many OTP requests. Try again in ${remainingSeconds} seconds`,
		};
	}

	// Increment and allow
	limiter.attempts++;
	return { allowed: true, message: "OTP request allowed" };
};

/* ================= SEND OTP ================= */
export const sendOtp = async (req: Request, res: Response) => {
	try {
		const { phone } = req.body;
		const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

		// Check rate limiting
		const rateLimitCheck = checkOtpRateLimit(clientIp);
		if (!rateLimitCheck.allowed) {
			console.warn('⚠️ Auth: OTP rate limit exceeded', {
				ip: clientIp,
				phone: phone?.slice?.(-4),
			});
			return res.status(429).json({
				message: rateLimitCheck.message,
				code: "OTP_RATE_LIMITED",
			});
		}

		const normalizedPhone = normalizePhoneForOtp(phone);

		if (!normalizedPhone || normalizedPhone.length < 10) {
			console.warn('⚠️ Auth: Invalid phone format', {
				ip: clientIp,
				phone: phone?.slice?.(-4),
			});
			return res.status(400).json({
				message: "Valid 10-digit phone number is required",
				code: "INVALID_PHONE",
			});
		}

		clearExpiredOtps();
		// Reset previous verify state for this phone (ensures fresh OTP in every cycle)
		verifiedOtps.delete(normalizedPhone);

		// Generate OTP (4 digits)
		const otp = generateOtp();
		const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

		// Store OTP with attempt tracking
		otpStore[normalizedPhone] = {
			otp,
			expiresAt,
			attempts: 0, // Track failed verification attempts
		};

		// Log OTP (development only - hide in production for security)
		if (process.env.NODE_ENV === "development") {
			console.log(`\n🔐 [DEV] OTP for ${normalizedPhone}: ${otp}`);
			console.log(`⏰ Expires in ${Math.round((expiresAt - Date.now())/1000)} seconds\n`);
		} else {
			console.log(`✅ OTP sent for phone: ${normalizedPhone}`);
		}

		return res.json({
			message: "OTP sent successfully",
			phone: `${normalizedPhone.slice(0, 6)}****`,
			expiresIn: "10 minutes",
			code: "OTP_SENT",
		});
	} catch (err) {
		console.error('❌ Auth: Failed to send OTP', {
			error: (err as Error)?.message,
		});
		return res.status(500).json({
			message: "Failed to send OTP. Please try again.",
			code: "OTP_SEND_FAILED",
		});
	}
};

/* ================= VERIFY OTP & REGISTER ================= */
export const verifyOtpAndRegister = async (req: Request, res: Response) => {
	try {
		const { phone, otp, name, email, village, verificationToken } = req.body;

		// Validate all required fields
		if (!phone || !otp || !name || !email || !village || !verificationToken) {
			return res.status(400).json({
				message: "All fields are required",
				code: "MISSING_FIELDS",
			});
		}

		// Validate OTP format (should be 4 digits)
		if (!/^\d{4}$/.test(String(otp).trim())) {
			return res.status(400).json({
				message: "OTP must be a 4-digit number",
				code: "INVALID_OTP_FORMAT",
			});
		}

		const normalizedPhone = normalizePhoneForOtp(phone);
		if (!normalizedPhone || normalizedPhone.length < 10) {
			return res.status(400).json({
				message: "Valid phone number is required",
				code: "INVALID_PHONE",
			});
		}

		let tokenData: any;
		try {
			tokenData = jwt.verify(verificationToken, JWT_SECRET) as { phone?: string };
		} catch (err) {
			console.warn('⚠️ Auth: Invalid or expired verification token', {
				error: (err as Error)?.message,
			});
			return res.status(401).json({
				message: "Invalid or expired verification token",
				code: "INVALID_TOKEN",
			});
		}

		const tokenPhone = normalizePhoneForOtp(tokenData?.phone);
		if (tokenPhone !== normalizedPhone) {
			console.warn('⚠️ Auth: OTP verification mismatch', {
				tokenPhone,
				normalizedPhone,
			});
			return res.status(400).json({
				message: "OTP verification mismatch. Please request a new OTP",
				code: "PHONE_MISMATCH",
			});
		}

		clearExpiredOtps();

		const storedOtp = otpStore[normalizedPhone];
		if (storedOtp) {
			if (storedOtp.expiresAt < Date.now()) {
				delete otpStore[normalizedPhone];
				console.warn('⚠️ Auth: OTP expired', { phone: normalizedPhone });
				return res.status(400).json({
					message: "OTP expired. Please request a new OTP",
					code: "OTP_EXPIRED",
				});
			}

			if (storedOtp.otp !== otp) {
				storedOtp.attempts += 1;
				const remainingAttempts = 5 - storedOtp.attempts;

				// Security: Max 5 failed attempts
				if (storedOtp.attempts >= 5) {
					delete otpStore[normalizedPhone];
					console.warn('⚠️ Auth: OTP brute force attempt detected', {
						phone: normalizedPhone,
						attempts: storedOtp.attempts,
					});
					return res.status(429).json({
						message: "Too many failed OTP attempts. Please request a new OTP",
						code: "OTP_MAX_ATTEMPTS",
					});
				}

				console.warn('⚠️ Auth: Invalid OTP', {
					phone: normalizedPhone,
					attempts: storedOtp.attempts,
					remainingAttempts,
				});
				return res.status(400).json({
					message: `Invalid OTP. ${remainingAttempts} attempts remaining`,
					code: "INVALID_OTP",
					attemptsRemaining: remainingAttempts,
				});
			}
		}

		// Existing user by phone
		const normalizedPhoneSearch = normalizePhoneForOtp(normalizedPhone);
		const existingByPhone = await User.findOne({
			$or: [
				{ phone: normalizedPhoneSearch },
				{ phone: `91${normalizedPhoneSearch}` },
				{ phone: `+91${normalizedPhoneSearch}` },
			],
		}).populate("roleId");

		if (existingByPhone) {
			delete otpStore[normalizedPhone];
			verifiedOtps.delete(normalizedPhone);

			const role = (existingByPhone as any).roleId;
			const token = jwt.sign(
				{
					id: existingByPhone._id,
					email: existingByPhone.email,
					roleId: existingByPhone.roleId,
					roleName: (role as any)?.name,
				},
				JWT_SECRET,
				{ expiresIn: "7d" }
			);

			const xsrfToken = jwt.sign({ type: 'csrf', timestamp: Date.now() }, JWT_SECRET, { expiresIn: "1h" });

			res.cookie('token', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 7 * 24 * 60 * 60 * 1000,
				path: '/',
			});

			res.cookie('XSRF-TOKEN', xsrfToken, {
				httpOnly: false,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 1000,
				path: '/',
			});

			return res.status(200).json({
				message: "Existing user logged in successfully.",
				isExistingUser: true,
				token,
				user: {
					id: existingByPhone._id,
					name: existingByPhone.name,
					email: existingByPhone.email,
					phone: existingByPhone.phone,
					village: (existingByPhone as any).village,
					role: (role as any)?.name || "user",
				},
			});
		}

		const existingByEmail = await User.findOne({ email });
		if (existingByEmail) {
			return res.status(409).json({ message: "Email already registered. Please login." });
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
			phone: normalizedPhone,
			village,
			password: hashedPassword,
			roleId: userRole._id,
		});

		// Clear OTP state after success
		delete otpStore[normalizedPhone];
		verifiedOtps.delete(normalizedPhone);

		const role = userRole as any;
		const token = jwt.sign({ id: newUser._id, email: newUser.email, roleId: newUser.roleId, roleName: role?.name }, JWT_SECRET, { expiresIn: "7d" });
		const xsrfToken = jwt.sign({ type: 'csrf', timestamp: Date.now() }, JWT_SECRET, { expiresIn: "1h" });

		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
			path: '/',
		});

		res.cookie('XSRF-TOKEN', xsrfToken, {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 1000,
			path: '/',
		});

		return res.status(201).json({
			message: "User registered successfully",
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
		return res.status(500).json({ message: "Registration failed" });
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

		const normalizedPhone = normalizePhoneForOtp(phone);
		if (!normalizedPhone || normalizedPhone.length < 10) {
			return res.status(400).json({ message: "OTP not found" });
		}

		const storedOtp = otpStore[normalizedPhone];
		const isPhoneVerified = verifiedOtps.has(normalizedPhone);

		if (!storedOtp && !isPhoneVerified) {
			return res.status(400).json({ message: "OTP not found" });
		}

		if (storedOtp && !isPhoneVerified) {
			if (storedOtp.expiresAt < Date.now()) {
				delete otpStore[normalizedPhone];
				verifiedOtps.delete(normalizedPhone);
				return res.status(400).json({ message: "OTP expired" });
			}

			if (storedOtp.otp !== otp) {
				storedOtp.attempts += 1;
				return res.status(400).json({ message: "Invalid OTP" });
			}

			verifiedOtps.add(normalizedPhone);
		}

		if (!isPhoneVerified && storedOtp) {
			verifiedOtps.add(normalizedPhone);
		}

		const existingUser = await User.findOne({
			$or: [
				{ phone: normalizedPhone },
				{ phone: `91${normalizedPhone}` },
				{ phone: `+91${normalizedPhone}` },
			],
		}).populate("roleId");

		if (existingUser) {
			delete otpStore[normalizedPhone];
			verifiedOtps.delete(normalizedPhone);

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

			const xsrfToken = jwt.sign({ type: 'csrf', timestamp: Date.now() }, JWT_SECRET, { expiresIn: "1h" });

			res.cookie('token', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 7 * 24 * 60 * 60 * 1000,
				path: '/',
			});

			res.cookie('XSRF-TOKEN', xsrfToken, {
				httpOnly: false,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 1000,
				path: '/',
			});

			return res.json({
				message: "OTP verified. Login successful",
				verified: true,
				isExistingUser: true,
				verificationToken: jwt.sign({ phone: normalizedPhone }, JWT_SECRET, { expiresIn: "15m" }),
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

		return res.json({
			message: "OTP verified successfully",
			phone: normalizedPhone,
			verified: true,
			isExistingUser: false,
			verificationToken: jwt.sign({ phone: normalizedPhone }, JWT_SECRET, { expiresIn: "15m" }),
		});
	} catch (err) {
		return res.status(500).json({ message: "OTP verification failed" });
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
		return res.status(201).json({ message: "User registered successfully", user: safeUser });
	} catch (err) {
		return res.status(500).json({ message: "Register failed" });
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

		// Generate XSRF token for CSRF protection
		const xsrfToken = jwt.sign(
			{ type: 'csrf', timestamp: Date.now() },
			JWT_SECRET,
			{ expiresIn: "1h" }
		);

		/**
		 * SECURITY: Set httpOnly cookie instead of returning token in response body
		 * This prevents XSS attacks from stealing the authentication token
		 */
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
			path: '/',
		});

		/**
		 * SECURITY: Set XSRF token in separate cookie for CSRF protection
		 * Frontend will read this and send it back in X-CSRF-Token header
		 */
		res.cookie('XSRF-TOKEN', xsrfToken, {
			httpOnly: false, // Frontend needs to read this via JavaScript
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 1000, // 1 hour
			path: '/',
		});

		/**
		 * Return user data but NOT the token
		 * Token is now in httpOnly cookie, inaccessible to JavaScript
		 */
		return res.status(200).json({
			message: "Login successful",
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
		return res.status(500).json({ message: "Login failed" });
	}
};

/* ================= GET LOGGED IN USER ================= */
export const getUsers = async (req: any, res: Response) => {
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
export const getPermissions = async (req: any, res: Response) => {
	try {
		const perms = await getUserPermissions(req.user!.id);
		return res.json({ permissions: perms });
	} catch (err) {
		return res.status(500).json({ message: "Failed to fetch permissions" });
	}
};

/* ================= UPDATE USER ================= */
export const updateUser = async (req: any, res: Response) => {
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

		if (updates.phone && updates.phone.replaceAll(/\D/g, '').length < 10) {
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
		return res.json({ message: "User deleted successfully" });
	} catch (err) {
		return res.status(500).json({ message: "Delete failed" });
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

		return res.json({ message: "User role updated", user });
	} catch (err: any) {
		return res.status(500).json({ message: "Update failed", error: err.message });
	}
}

/* ================= LOGOUT ================= */
export const logout = async (_req: Request, res: Response) => {
	try {
		/**
		 * SECURITY: Clear authentication cookies
		 * This logs out the user by removing httpOnly tokens
		 */
		res.clearCookie('token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			path: '/',
		});

		res.clearCookie('XSRF-TOKEN', {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			path: '/',
		});

		res.status(200).json({
			message: "Logged out successfully",
			success: true,
		});
	} catch (err) {
		res.status(500).json({ message: "Logout failed" });
	}
};
