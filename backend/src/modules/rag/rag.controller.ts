import { Request, Response, NextFunction } from 'express';
import { ragService } from './rag.service';
import {
  searchQuerySchema,
  chatMessageSchema,
  createContextFactSchema,
} from './rag.schemas';
import { ApiError } from '../../utils/apiError';

export class RAGController {
  /**
   * 1. Trigger Course Content Ingestion (ADMIN, TRAINER)
   */
  async indexCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) throw ApiError.unauthorized('Authentication required');

      const { courseId } = req.params;
      if (!courseId) throw ApiError.badRequest('courseId route parameter is required');

      const summary = await ragService.indexCourse(organizationId, courseId);

      res.status(200).json({
        success: true,
        message: 'Course indexed into vector knowledge base successfully',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 2. Get Course Indexing Status (ADMIN, TRAINER)
   */
  async getCourseIndexStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) throw ApiError.unauthorized('Authentication required');

      const { courseId } = req.params;
      if (!courseId) throw ApiError.badRequest('courseId parameter is required');

      const status = await ragService.getCourseIndexStatus(organizationId, courseId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 3. List Knowledge Index Overview (ADMIN, TRAINER)
   */
  async listKnowledgeIndex(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) throw ApiError.unauthorized('Authentication required');

      const overview = await ragService.listKnowledgeIndex(organizationId);

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 4. Multi-Tenant Semantic Vector Search
   */
  async semanticSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!organizationId || !userId || !userRole) {
        throw ApiError.unauthorized('Authentication required');
      }

      const input = searchQuerySchema.parse(req.body);
      const results = await ragService.semanticSearch(organizationId, userId, userRole, input);

      res.status(200).json({
        success: true,
        data: {
          query: input.query,
          courseId: input.courseId,
          totalResults: results.length,
          results,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 5. Context-Aware Grounded Chat
   */
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!organizationId || !userId || !userRole) {
        throw ApiError.unauthorized('Authentication required');
      }

      const input = chatMessageSchema.parse(req.body);
      const chatResponse = await ragService.chat(organizationId, userId, userRole, input);

      res.status(200).json({
        success: true,
        data: chatResponse,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 6. Get Learner Context Profile
   */
  async getContextProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const callerUserId = req.user?.id;
      const callerRole = req.user?.role;
      if (!organizationId || !callerUserId || !callerRole) {
        throw ApiError.unauthorized('Authentication required');
      }

      const targetUserId = (req.query.userId as string) || callerUserId;
      const profile = await ragService.getLearnerContextProfile(
        organizationId,
        targetUserId,
        callerUserId,
        callerRole
      );

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 7. Add Learner Context Fact
   */
  async createContextFact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const callerUserId = req.user?.id;
      const callerRole = req.user?.role;
      if (!organizationId || !callerUserId || !callerRole) {
        throw ApiError.unauthorized('Authentication required');
      }

      const input = createContextFactSchema.parse(req.body);
      const fact = await ragService.createContextFact(
        organizationId,
        callerUserId,
        callerRole,
        input
      );

      res.status(201).json({
        success: true,
        message: 'Learner context fact recorded successfully',
        data: fact,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 8. Deactivate Learner Context Fact
   */
  async deactivateContextFact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const callerUserId = req.user?.id;
      const callerRole = req.user?.role;
      if (!organizationId || !callerUserId || !callerRole) {
        throw ApiError.unauthorized('Authentication required');
      }

      const { id } = req.params;
      if (!id) throw ApiError.badRequest('Fact ID is required');

      const deactivated = await ragService.deactivateContextFact(
        organizationId,
        callerUserId,
        callerRole,
        id
      );

      res.status(200).json({
        success: true,
        message: 'Context fact deactivated successfully',
        data: deactivated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 9. List User Conversations
   */
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) throw ApiError.unauthorized('Authentication required');

      const convos = await ragService.listConversations(organizationId, userId);

      res.status(200).json({
        success: true,
        data: convos,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 10. Get Conversation by ID with Messages
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) throw ApiError.unauthorized('Authentication required');

      const { id } = req.params;
      if (!id) throw ApiError.badRequest('Conversation ID is required');

      const result = await ragService.getConversation(organizationId, userId, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const ragController = new RAGController();
