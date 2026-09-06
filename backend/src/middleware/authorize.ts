import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { UserRole } from '../modules/auth/auth.types';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        ApiError.forbidden(
          `Action forbidden. Required role(s): ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
          'FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
}
