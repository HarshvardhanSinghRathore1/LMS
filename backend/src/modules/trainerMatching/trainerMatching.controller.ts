import { Request, Response, NextFunction } from 'express';
import { TrainerMatchingService } from './trainerMatching.service';
import {
  createTrainerProfileSchema,
  updateTrainerProfileSchema,
  addExpertiseSchema,
  createSessionRequestSchema,
  getMatchesQuerySchema,
} from './trainerMatching.schemas';
import { ApiError } from '../../utils/apiError';
import { ConflictError, NotFoundError, ForbiddenError } from './trainerMatching.repository';

export class TrainerMatchingController {
  constructor(private service: TrainerMatchingService = new TrainerMatchingService()) {}

  private handleError(error: any): ApiError {
    if (error instanceof ConflictError) {
      return ApiError.conflict(error.message);
    }
    if (error instanceof NotFoundError) {
      return ApiError.notFound(error.message);
    }
    if (error instanceof ForbiddenError) {
      return ApiError.forbidden(error.message);
    }
    return error;
  }

  getTrainerMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const query = getMatchesQuerySchema.parse(req.query);

      const matches = await this.service.getTrainerMatches(
        req.user.organizationId,
        req.user.id,
        query.competencyId,
        query.limit
      );

      res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getTrainerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const profile = await this.service.getTrainerProfileByUser(
        req.user.id,
        req.user.organizationId
      );

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  createTrainerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const parsed = createTrainerProfileSchema.parse(req.body);

      const profile = await this.service.createTrainerProfile(
        req.user.id,
        req.user.organizationId,
        parsed
      );

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Trainer profile created successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  updateTrainerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const parsed = updateTrainerProfileSchema.parse(req.body);

      const profile = await this.service.updateTrainerProfile(
        req.user.id,
        req.user.organizationId,
        parsed
      );

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Trainer profile updated successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getTrainerExpertise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const expertise = await this.service.getTrainerExpertise(
        req.user.id,
        req.user.organizationId
      );

      res.status(200).json({
        success: true,
        data: expertise,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  addTrainerExpertise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const parsed = addExpertiseSchema.parse(req.body);

      const expertise = await this.service.addTrainerExpertise(
        req.user.id,
        req.user.organizationId,
        parsed.competencyId,
        parsed.proficiencyLevel,
        parsed.yearsExperience
      );

      res.status(201).json({
        success: true,
        data: expertise,
        message: 'Competency expertise mapped successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  removeTrainerExpertise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { competencyId } = req.params;
      if (!competencyId) throw ApiError.badRequest('Competency ID required');

      await this.service.removeTrainerExpertise(
        req.user.id,
        req.user.organizationId,
        competencyId
      );

      res.status(200).json({
        success: true,
        message: 'Competency expertise removed successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  createSessionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const parsed = createSessionRequestSchema.parse(req.body);

      const session = await this.service.createSessionRequest(
        req.user.organizationId,
        req.user.id,
        parsed
      );

      res.status(201).json({
        success: true,
        data: session,
        message: 'Session request submitted successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getTraineeSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const sessions = await this.service.getTraineeSessions(
        req.user.organizationId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getTrainerSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const sessions = await this.service.getTrainerSessions(
        req.user.organizationId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  acceptSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { id } = req.params;

      const session = await this.service.updateSessionStatus(
        id,
        req.user.organizationId,
        req.user.id,
        'TRAINER',
        'ACCEPTED'
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session request accepted',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  declineSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { id } = req.params;

      const session = await this.service.updateSessionStatus(
        id,
        req.user.organizationId,
        req.user.id,
        'TRAINER',
        'DECLINED'
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session request declined',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  completeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { id } = req.params;

      const session = await this.service.updateSessionStatus(
        id,
        req.user.organizationId,
        req.user.id,
        'TRAINER',
        'COMPLETED'
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session marked as completed',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  cancelSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { id } = req.params;

      const actorRole: 'TRAINER' | 'TRAINEE' =
        req.user.role === 'TRAINER' ? 'TRAINER' : 'TRAINEE';

      const session = await this.service.updateSessionStatus(
        id,
        req.user.organizationId,
        req.user.id,
        actorRole,
        'CANCELLED'
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session request cancelled',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };
}

export const trainerMatchingController = new TrainerMatchingController();
