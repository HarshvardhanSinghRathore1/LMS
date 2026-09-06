import { Response } from 'express';

export interface ApiResponseOptions {
  message?: string;
  statusCode?: number;
  details?: any;
  meta?: any;
}

export function sendSuccess(res: Response, data: any = {}, options: ApiResponseOptions = {}): void {
  const statusCode = options.statusCode || 200;
  res.status(statusCode).json({
    success: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.meta ? { meta: options.meta } : {}),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: any = null,
  requestId?: string
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      ...(requestId ? { requestId } : {}),
    },
  });
}
