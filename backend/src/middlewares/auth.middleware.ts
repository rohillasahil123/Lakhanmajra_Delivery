import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthRequest extends Request {
  user?: any;
  isAuthenticated?: boolean;
  sessionId?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | null = null;

  /**
   * SECURITY: Get token from httpOnly cookie (preferred method)
   * Fallback to Authorization header for backward compatibility
   */
  // First, try to get token from httpOnly cookie
  const cookieToken = (req.cookies as any)?.token;
  if (cookieToken) {
    token = cookieToken;
  }

  // Fallback to Authorization header
  const authHeader = req.headers.authorization;
  if (!token && authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length > 1) {
      token = tokenParts[1] || null;
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Load full user and populate roleId so middleware can check role name reliably
    const user = await User.findById(decoded.id || decoded._id).select('-password').populate('roleId');
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    // keep role name on the request (comes from JWT or populated roleId)
    const roleNameFromToken = decoded.roleName || decoded.role;
    const derivedRole =
      String(roleNameFromToken || (user.roleId && (user.roleId as any).name) || '')
        .trim()
        .toLowerCase();

    (user as any).roleName = derivedRole;
    (user as any).role = derivedRole;

    req.user = user;
    return next();
  } catch (err) {
    console.error('JWT verify failed', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const roleCandidate =
    String(req.user.role || req.user.roleName || (req.user.roleId && (req.user.roleId.name || req.user.roleId)) || '')
      .trim()
      .toLowerCase();
  if (roleCandidate && (roleCandidate === 'admin' || roleCandidate === 'superadmin')) return next();
  return res.status(403).json({ message: 'Admin privileges required' });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userRole =
      String(req.user.role || req.user.roleName || (req.user.roleId && (req.user.roleId.name || req.user.roleId)) || '')
        .trim()
        .toLowerCase();

    if (userRole && userRole === role.toLowerCase()) return next();
    return res.status(403).json({ message: `Require role: ${role}` });
  };
};
