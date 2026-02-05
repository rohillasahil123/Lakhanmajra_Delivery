import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  // Accept role variations from JWT: `role`, `roleName`, or populated `roleId.name`
  const roleCandidate = req.user.role || req.user.roleName || (req.user.roleId && (req.user.roleId.name || req.user.roleId));
  if (roleCandidate && (roleCandidate === "admin" || roleCandidate === "superadmin")) return next();
  return res.status(403).json({ message: "Admin privileges required" });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role && req.user.role === role) return next();
    return res.status(403).json({ message: `Require role: ${role}` });
  };
};
