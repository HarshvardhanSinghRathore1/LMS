import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply auth + tenant isolation middleware
router.use(authenticate);
router.use(enforceOrganizationContext);

// GET /api/v1/notifications
router.get('/', notificationsController.listNotifications.bind(notificationsController));

// GET /api/v1/notifications/unread-count
router.get('/unread-count', notificationsController.getUnreadCount.bind(notificationsController));

// PATCH /api/v1/notifications/mark-all-read
router.patch('/mark-all-read', notificationsController.markAllAsRead.bind(notificationsController));

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', notificationsController.markAsRead.bind(notificationsController));

// DELETE /api/v1/notifications/:id
router.delete('/:id', notificationsController.deleteNotification.bind(notificationsController));

export default router;
