import { Request, Response, NextFunction } from "express";
import { getUserPermissions } from "../services/role.service";

export interface AuthRequest extends Request {
  user?: any;
  permissions?: string[];
}

export const requirePermission = (requiredPermission: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const permissions = await getUserPermissions(req.user.id);
      const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const hasPermission = required.some((p) => permissions.includes(p));

      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.permissions = permissions;
      next();
    } catch (err) {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};
