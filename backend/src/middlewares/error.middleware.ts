import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);
  
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
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404).json({ success: false, message: "Route not found" });
};
