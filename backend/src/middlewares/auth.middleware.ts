import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Load full user and populate roleId so middleware can check role name reliably
    const user = await User.findById(decoded.id || decoded._id).select('-password').populate('roleId');
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    // keep role name on the request (comes from JWT or populated roleId)
    const roleNameFromToken = decoded.roleName || decoded.role;
    (user as any).roleName = roleNameFromToken || (user.roleId && (user.roleId as any).name) || undefined;
    (user as any).role = (user as any).roleName || undefined;

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const roleCandidate =
    req.user.role || req.user.roleName || (req.user.roleId && (req.user.roleId.name || req.user.roleId));
  if (roleCandidate && (roleCandidate === 'admin' || roleCandidate === 'superadmin')) return next();
  return res.status(403).json({ message: 'Admin privileges required' });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // support multiple user shapes: `role`, `roleName`, or populated `roleId.name`
    const userRole =
      req.user.role ||
      req.user.roleName ||
      (req.user.roleId && (req.user.roleId.name || req.user.roleId));

    if (userRole && userRole === role) return next();
    return res.status(403).json({ message: `Require role: ${role}` });
  };
};
