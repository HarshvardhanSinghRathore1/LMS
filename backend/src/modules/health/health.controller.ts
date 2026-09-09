import { Request, Response, NextFunction } from 'express';
import { healthService } from './health.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { AIProviderFactory } from '../../providers/aiProviderFactory';

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

  async checkAiHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeInfo = AIProviderFactory.getActiveProvider();
      const allProviders = AIProviderFactory.getAllProviderStatuses();

      sendSuccess(
        res,
        {
          status: 'healthy',
          service: 'capacity-connect-ai',
          provider: activeInfo.activeName,
          activeProvider: {
            name: activeInfo.activeName.toUpperCase(),
            isConfigured: activeInfo.isConfigured,
          },
          providers: allProviders,
          embedding: {
            provider: 'huggingface',
            model: 'BAAI/bge-small-en-v1.5',
            dimension: 384,
            status: 'ready',
          },
          pgvector: {
            enabled: true,
            status: 'ready',
          },
          contextService: {
            enabled: Boolean(process.env.GRAPHITI_URL),
            status: process.env.GRAPHITI_URL ? 'available' : 'unavailable',
            url: process.env.GRAPHITI_URL || 'http://localhost:8000',
          },
        },
        {
          message: 'Capacity Connect AI service is healthy',
          statusCode: 200,
        }
      );
    } catch (err) {
      next(err);
    }
  }
}

export const healthController = new HealthController();
