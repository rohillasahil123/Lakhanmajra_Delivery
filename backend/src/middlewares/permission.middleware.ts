import { Request, Response, NextFunction } from "express";
import { getUserPermissions } from "../services/role.service";

export interface AuthRequest extends Request {
  user?: any;
  permissions?: string[];
}

export const requirePermission = (requiredPermission: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || req.user?._id?.toString?.();
      if (!req.user || !userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const roleCandidate =
        req.user.role ||
        req.user.roleName ||
        (req.user.roleId && (req.user.roleId.name || req.user.roleId));
      const normalizedRole =
        typeof roleCandidate === "string" ? roleCandidate.toLowerCase() : "";

      if (normalizedRole === "superadmin") {
        req.permissions = ["*"];
        return next();
      }

      const permissions = await getUserPermissions(userId);
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
