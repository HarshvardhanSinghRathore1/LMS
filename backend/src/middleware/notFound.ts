import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  sendError(
    res,
    404,
    'ROUTE_NOT_FOUND',
    `The requested endpoint ${req.method} ${req.originalUrl} was not found`,
    null,
    req.requestId
  );
}
