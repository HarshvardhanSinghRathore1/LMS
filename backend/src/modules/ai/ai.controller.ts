import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import {
  generateNotesSchema,
  generateMcqsSchema,
  reviewItemSchema,
  tutorChatSchema,
  aiQuerySchema,
  regenerateMcqSchema,
  updateGeneratedItemSchema,
} from './ai.schemas';

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
   * POST /api/v1/ai/generated-items/:id/regenerate
   */
  async regenerateSingleMcq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const creatorId = req.user!.id;
      const itemId = req.params.id;
      const input = regenerateMcqSchema.parse(req.body);

      const updated = await aiService.regenerateSingleMcq(organizationId, creatorId, itemId, input);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'MCQ regenerated successfully with fresh grounded question',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/ai/generated-items/:id
   */
  async updateGeneratedItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const itemId = req.params.id;
      const input = updateGeneratedItemSchema.parse(req.body);

      const updated = await aiService.updateGeneratedItem(
        organizationId,
        itemId,
        input.content,
        input.title,
        input.reviewNotes
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Generated item updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/ai/generated-items/:id
   */
  async deleteGeneratedItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const itemId = req.params.id;

      const result = await aiService.deleteGeneratedItem(organizationId, itemId);

      res.status(200).json({
        success: true,
        message: result.message,
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

  /**
   * GET /api/v1/ai/tutor/conversations/:id
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await aiService.getConversation(organizationId, userId, id);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Retrieved conversation messages',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/ai/tutor/conversations/:id
   */
  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await aiService.deleteConversation(organizationId, userId, id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
