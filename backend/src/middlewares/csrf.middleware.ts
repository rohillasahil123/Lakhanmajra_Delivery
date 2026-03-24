import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * CSRF Token Verification Middleware
 * 
 * Protects against Cross-Site Request Forgery attacks by verifying CSRF tokens
 * on state-changing requests (POST, PUT, PATCH, DELETE)
 * 
 * SECURITY:
 * - Token must be valid and not expired
 * - Only verifies state-changing requests
 * - GET, HEAD, OPTIONS requests skip verification
 */
export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF verification for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  /**
   * Read CSRF token from:
   * 1. X-CSRF-Token header (preferred - sent by axios interceptor)
   * 2. XSRF-TOKEN cookie (fallback)
   */
  let csrfToken = req.headers['x-csrf-token'] as string;
  
  if (!csrfToken) {
    csrfToken = (req.cookies as any)?.['XSRF-TOKEN'];
  }

  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Possible CSRF attack detected.',
    });
  }

  try {
    /**
     * Verify the token is a valid JWT with type: 'csrf'
     * This ensures the token was issued by us and hasn't been tampered with
     */
    const decoded = jwt.verify(csrfToken, JWT_SECRET) as any;

    if (decoded.type !== 'csrf') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Token is valid, allow request to proceed
    next();
  } catch (err) {
    logError('CSRF token verification failed', err);
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token. Request rejected.',
    });
  }
};

export default verifyCsrfToken;
