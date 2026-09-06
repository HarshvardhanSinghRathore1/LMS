import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingHeader = req.header('X-Request-ID') || req.header('x-request-id');
  const requestId = incomingHeader && validateUuid(incomingHeader) ? incomingHeader : uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
