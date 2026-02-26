import {NextFunction, Request, Response} from 'express';
import {protect, requireRole} from './auth.middleware';

export const verifyRiderToken = (req: Request, res: Response, next: NextFunction): void => {
  protect(req as any, res, (error?: any) => {
    if (error) {
      next(error);
      return;
    }

    requireRole('rider')(req as any, res, next);
  });
};