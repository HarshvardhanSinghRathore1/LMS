import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schemas';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { config } from '../../config/env';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env.isProduction,
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid registration parameters', parsed.error.format(), req.requestId);
        return;
      }

      const result = await authService.register(parsed.data);

      res.cookie('cc_refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        { statusCode: 201, message: 'Account registered successfully' }
      );
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid login parameters', parsed.error.format(), req.requestId);
        return;
      }

      const result = await authService.login(parsed.data);

      res.cookie('cc_refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        { statusCode: 200, message: 'Logged in successfully' }
      );
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenRaw = req.cookies?.cc_refresh_token || req.body?.refreshToken;

      const result = await authService.refresh(refreshTokenRaw);

      res.cookie('cc_refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      res.clearCookie('cc_refresh_token', REFRESH_COOKIE_OPTIONS);
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenRaw = req.cookies?.cc_refresh_token || req.body?.refreshToken;
      await authService.logout(refreshTokenRaw);

      res.clearCookie('cc_refresh_token', REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {}, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required', null, req.requestId);
        return;
      }

      const user = await authService.getMe(req.user.id);
      sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async testAdmin(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { message: 'ADMIN role access granted', user: req.user });
  }

  async testTrainer(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { message: 'TRAINER or ADMIN role access granted', user: req.user });
  }

  async testTrainee(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { message: 'TRAINEE, TRAINER, or ADMIN role access granted', user: req.user });
  }
}

export const authController = new AuthController();
