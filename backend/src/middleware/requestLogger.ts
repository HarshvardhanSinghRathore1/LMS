import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.requestId || 'unknown-id';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const logLine = `[${requestId}] ${method} ${originalUrl} ${statusCode} ${duration}ms`;

    if (statusCode >= 500) {
      console.error(`🔴 ${logLine}`);
    } else if (statusCode >= 400) {
      console.warn(`🟡 ${logLine}`);
    } else {
      console.log(`🟢 ${logLine}`);
    }
  });

  next();
}
