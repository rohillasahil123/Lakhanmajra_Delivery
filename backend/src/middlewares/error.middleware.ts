import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logger";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logError("Error", err);
  
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  const details = err?.details || undefined;
  
  res.status(status).json({ 
    success: false, 
    message, 
    ...(details && { details })
  });
};

// Catch 404 errors
export const notFound = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ success: false, message: "Route not found" });
};
