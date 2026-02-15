import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

interface JwtPayload {
  id: string;
}

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;
    let sessionId: string | undefined;

    // Check for JWT token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for session ID (for guest users)
    if (req.headers['x-session-id']) {
      sessionId = req.headers['x-session-id'] as string;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.user = await User.findById(decoded.id).select('-password');
        req.isAuthenticated = !!req.user;
      } catch (err) {
        // Token invalid, treat as guest
        req.isAuthenticated = false;
      }
    } else {
      req.isAuthenticated = false;
    }

    // Set session ID for guest users
    if (!req.isAuthenticated && sessionId) {
      req.sessionId = sessionId;
    } else if (!req.isAuthenticated) {
      // Generate new session ID if not provided
      req.sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    next();
  } catch (error) {
    next(error);
  }
};