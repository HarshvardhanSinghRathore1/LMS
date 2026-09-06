import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { AIProviderFactory } from '../../providers/aiProviderFactory';

export class AIController {
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await aiService.getAIHealth();
      sendSuccess(res, health, { message: 'AI Infrastructure status retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statuses = AIProviderFactory.getAllProviderStatuses();
      const active = AIProviderFactory.getActiveProvider();
      sendSuccess(res, { activeProvider: active.activeName, providers: statuses });
    } catch (err) {
      next(err);
    }
  }

  async testAI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, organizationId, learnerId } = req.body;
      if (!query || !organizationId || !learnerId) {
        sendError(res, 400, 'BAD_REQUEST', 'Missing query, organizationId, or learnerId in body', null, req.requestId);
        return;
      }

      const result = await aiService.testAIFusion(query, organizationId, learnerId);
      sendSuccess(res, result, { message: 'AI RAG fusion test completed' });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
