import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthRequest extends Request {
  user?: any;
  isAuthenticated?: boolean;
  sessionId?: string;
}

/**
 * SECURITY: Extract user role from a single source of truth
 * Priority: Populated roleId (database) > JWT token
 * 
 * This ensures consistent role resolution and prevents role escalation attacks
 * by always trusting the database as the source of truth
 */
const extractUserRole = (user: any, tokenData: any): string => {
  // Primary source: Populated roleId from database
  if (user?.roleId) {
    const roleName = (user.roleId as any)?.name || '';
    if (roleName) {
      return String(roleName).trim().toLowerCase();
    }
  }

  // Fallback: Role from JWT token (for cases where roleId is not populated)
  const tokenRole = tokenData?.roleName || tokenData?.role;
  if (tokenRole) {
    return String(tokenRole).trim().toLowerCase();
  }

  // Default: Unknown role
  console.warn('⚠️ Auth: Unable to extract user role, defaulting to empty string', {
    userId: user?._id,
    hasRoleId: !!user?.roleId,
    hasTokenRole: !!(tokenData?.roleName || tokenData?.role),
  });

  return '';
};

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

    // Use single source of truth for role extraction
    const userRole = extractUserRole(user, decoded);

    if (!userRole) {
      console.error('❌ Auth: User has no valid role', {
        userId: user._id,
        email: user.email,
      });
      return res.status(403).json({ message: 'User has no valid role assigned' });
    }

    // Attach both forms of role name for backward compatibility (prefer roleId from DB)
    (user as any).roleName = userRole;
    (user as any).role = userRole;

    req.user = user;
    return next();
  } catch (err) {
    console.error('❌ Auth: JWT verification failed', {
      error: (err as Error)?.message,
      token: token?.slice(0, 20) + '...',
    });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  // Extract role consistently using the same logic as protect middleware
  const userRole = req.user.role || req.user.roleName || '';
  
  if (userRole && (userRole === 'admin' || userRole === 'superadmin')) {
    return next();
  }
  
  console.warn('⚠️ Auth: Admin access denied', {
    userId: req.user._id,
    userRole: userRole,
  });
  
  return res.status(403).json({ message: 'Admin privileges required' });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // User role is already normalized in protect middleware
    const userRole = req.user.role || req.user.roleName || '';
    const requiredRole = role.trim().toLowerCase();

    if (userRole && userRole === requiredRole) {
      return next();
    }

    console.warn('⚠️ Auth: Role check failed', {
      userId: req.user._id,
      userRole: userRole,
      requiredRole: requiredRole,
    });

    return res.status(403).json({ 
      message: `This action requires ${requiredRole} role` 
    });
  };
};
