import { Request, Response, NextFunction } from 'express';
import { notificationsService, NotFoundError } from './notifications.service';
import { notificationQuerySchema, notificationIdParamSchema } from './notifications.schemas';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';

export class NotificationsController {
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;

      const parsedQuery = notificationQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        throw ApiError.badRequest('Invalid query parameters', 'VALIDATION_ERROR', parsedQuery.error.format());
      }

      const result = await notificationsService.getNotifications(orgId, userId, parsedQuery.data);
      sendSuccess(res, result, { message: 'Notifications retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;

      const result = await notificationsService.getUnreadCount(orgId, userId);
      sendSuccess(res, result, { message: 'Unread count retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;

      const parsedParams = notificationIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        throw ApiError.badRequest('Invalid notification id parameter');
      }

      const updated = await notificationsService.markAsRead(orgId, userId, parsedParams.data.id);
      sendSuccess(res, updated, { message: 'Notification marked as read' });
    } catch (err) {
      if (err instanceof NotFoundError) {
        next(ApiError.notFound(err.message));
        return;
      }
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;

      const result = await notificationsService.markAllAsRead(orgId, userId);
      sendSuccess(res, result, { message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;

      const parsedParams = notificationIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        throw ApiError.badRequest('Invalid notification id parameter');
      }

      await notificationsService.deleteNotification(orgId, userId, parsedParams.data.id);
      sendSuccess(res, { deleted: true }, { message: 'Notification deleted successfully' });
    } catch (err) {
      if (err instanceof NotFoundError) {
        next(ApiError.notFound(err.message));
        return;
      }
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
