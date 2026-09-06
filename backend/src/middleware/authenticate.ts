import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.utils';
import { ApiError } from '../utils/apiError';
import { AuthenticatedUser } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    next(ApiError.unauthorized('Authentication token required', 'AUTHENTICATION_REQUIRED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED'));
    } else {
      next(ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN'));
    }
  }
}
