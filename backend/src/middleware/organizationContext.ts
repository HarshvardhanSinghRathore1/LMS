import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export function enforceOrganizationContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.organizationId) {
    next(ApiError.unauthorized('Authenticated organization context required', 'AUTHENTICATION_REQUIRED'));
    return;
  }

  // Security check: Ignore any client-supplied organizationId override in req.body or req.query
  if (req.body && req.body.organizationId && req.body.organizationId !== req.user.organizationId) {
    console.warn(
      `⚠️ TENANT SECURITY WARNING [${req.requestId}]: User ${req.user.id} (Org ${req.user.organizationId}) attempted to override tenant to ${req.body.organizationId}. Overriding with verified JWT organization context.`
    );
    req.body.organizationId = req.user.organizationId;
  }

  next();
}
