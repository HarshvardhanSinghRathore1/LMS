import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { sendError } from '../utils/apiResponse';
import { config } from '../config/env';

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.code, err.message, err.details, requestId);
    return;
  }

  console.error(`[${requestId || 'ERROR'}] Unhandled Exception:`, err);

  const message = config.env.isProduction ? 'An unexpected internal error occurred' : err.message;
  const details = config.env.isProduction ? null : { stack: err.stack };

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message, details, requestId);
}
