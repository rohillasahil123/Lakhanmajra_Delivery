import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../utils/logger';

/**
 * Request/Response Logging Middleware
 * Logs all HTTP requests with timing and status codes
 * Includes request correlation ID for tracing
 */

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const correlationId = req.get('x-correlation-id') || generateCorrelationId();

  // Attach correlation ID to request for use in services
  (req as any).correlationId = correlationId;

  // Capture the original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    logRequest(req.method, req.path, status, duration, {
      correlationId,
      query: Object.keys(req.query).length ? req.query : undefined,
      userId: (req as any).user?._id,
    });

    // Call the original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Generate a unique correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCorrelationId(req: Request): string {
  return (req as any).correlationId || 'unknown';
}
