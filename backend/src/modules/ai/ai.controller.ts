import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { generateNotesSchema, generateMcqsSchema, reviewItemSchema, tutorChatSchema, aiQuerySchema } from './ai.schemas';

export class AIController {
  /**
   * POST /api/v1/ai/generate-notes
   */
  async generateNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const creatorId = req.user!.id;
      const input = generateNotesSchema.parse(req.body);

      const result = await aiService.generateNotes(organizationId, creatorId, input);

      res.status(201).json({
        success: true,
        data: result,
        message: 'AI study notes generated successfully in PENDING_REVIEW status',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai/generate-mcqs
   */
  async generateMcqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const creatorId = req.user!.id;
      const input = generateMcqsSchema.parse(req.body);

      const items = await aiService.generateMcqs(organizationId, creatorId, input);

      res.status(201).json({
        success: true,
        data: items,
        message: `Successfully generated ${items.length} MCQ item(s) in PENDING_REVIEW status`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ai/generated-items
   */
  async listGeneratedItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const query = aiQuerySchema.parse(req.query);

      const { items, total } = await aiService.listGeneratedItems(organizationId, query);

      res.status(200).json({
        success: true,
        data: items,
        meta: {
          total,
          page: query.page || 1,
          limit: query.limit || 20,
        },
        message: 'Retrieved AI generated items',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai/generated-items/:id/review
   */
  async reviewGeneratedItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const reviewerId = req.user!.id;
      const itemId = req.params.id;
      const input = reviewItemSchema.parse(req.body);

      const result = await aiService.reviewGeneratedItem(organizationId, reviewerId, itemId, input);

      res.status(200).json({
        success: true,
        data: result.item,
        importedQuestionId: result.importedQuestionId,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai/tutor/chat
   */
  async chatWithTutor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const input = tutorChatSchema.parse(req.body);

      const response = await aiService.chatWithTutor(organizationId, userRole, userId, input);

      res.status(200).json({
        success: true,
        data: response,
        message: 'AI Tutor response generated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ai/tutor/conversations
   */
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const conversations = await aiService.listConversations(organizationId, userId);

      res.status(200).json({
        success: true,
        data: conversations,
        message: 'Retrieved tutor conversation threads',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
