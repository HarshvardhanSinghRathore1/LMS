import { Request, Response, NextFunction } from 'express';
import { healthService } from './health.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class HealthController {
  async checkHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await healthService.getHealthStatus();

      if (status.isHealthy) {
        sendSuccess(
          res,
          {
            status: 'healthy',
            service: status.service,
            database: status.databaseStatus,
          },
          {
            message: 'Capacity Connect API is healthy',
            statusCode: 200,
          }
        );
      } else {
        sendError(
          res,
          503,
          'SERVICE_DEGRADED',
          'Database connection unavailable',
          {
            service: status.service,
            database: status.databaseStatus,
            ...(status.errorDetails ? { error: status.errorDetails } : {}),
          },
          req.requestId
        );
      }
    } catch (err) {
      next(err);
    }
  }
}

export const healthController = new HealthController();
