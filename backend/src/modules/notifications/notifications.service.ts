import { PoolClient } from 'pg';
import { notificationsRepository } from './notifications.repository';
import {
  NotificationRecord,
  NotificationPayload,
  NotificationFilters,
  NotificationType,
} from './notifications.types';
import { DomainEvent } from '../../events/event.types';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class NotificationsService {
  async createNotification(
    payload: NotificationPayload,
    client?: PoolClient
  ): Promise<NotificationRecord> {
    const eventKey = payload.data?.eventKey;
    if (eventKey) {
      const existing = await notificationsRepository.findExistingNotificationByEventKey(
        payload.organizationId,
        payload.userId,
        eventKey,
        client
      );
      if (existing) {
        return existing;
      }
    }
    return notificationsRepository.createNotification(payload, client);
  }

  async createNotificationTransactional(
    payload: NotificationPayload,
    client: PoolClient
  ): Promise<NotificationRecord> {
    return this.createNotification(payload, client);
  }

  async getNotifications(
    orgId: string,
    userId: string,
    filters: NotificationFilters
  ): Promise<{ notifications: NotificationRecord[]; total: number; page: number; limit: number }> {
    return notificationsRepository.findNotificationsByUser(orgId, userId, filters);
  }

  async getUnreadCount(orgId: string, userId: string): Promise<{ unreadCount: number }> {
    const count = await notificationsRepository.countUnreadNotifications(orgId, userId);
    return { unreadCount: count };
  }

  async markAsRead(orgId: string, userId: string, id: string): Promise<NotificationRecord> {
    const updated = await notificationsRepository.markNotificationRead(orgId, userId, id);
    if (!updated) {
      throw new NotFoundError(`Notification with id ${id} not found`);
    }
    return updated;
  }

  async markAllAsRead(orgId: string, userId: string): Promise<{ updatedCount: number }> {
    const count = await notificationsRepository.markAllNotificationsRead(orgId, userId);
    return { updatedCount: count };
  }

  async deleteNotification(orgId: string, userId: string, id: string): Promise<void> {
    const deleted = await notificationsRepository.deleteNotification(orgId, userId, id);
    if (!deleted) {
      throw new NotFoundError(`Notification with id ${id} not found`);
    }
  }

  /**
   * Deterministic template mapping from domain events to notifications
   */
  async handleDomainEvent(event: DomainEvent, client?: PoolClient): Promise<NotificationRecord | null> {
    let payload: NotificationPayload | null = null;
    const orgId = event.organizationId;
    const data = event.payload;

    switch (event.type) {
      case 'ENROLLMENT_CREATED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'SUCCESS',
            title: 'Enrolled in Course',
            message: `You have successfully enrolled in "${data.courseTitle || 'your course'}".`,
            link: data.courseId ? `/courses/${data.courseId}` : '/my-learning',
            data: { eventKey: `enrollment_${data.enrollmentId || data.courseId}_${data.traineeId}` },
          };
        }
        break;

      case 'COURSE_COMPLETED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'ACHIEVEMENT',
            title: 'Course Completed! 🎉',
            message: `Congratulations! You have completed all requirements for "${data.courseTitle || 'the course'}".`,
            link: '/certificates',
            data: { eventKey: `course_completed_${data.courseId}_${data.traineeId}` },
          };
        }
        break;

      case 'ASSESSMENT_EVALUATED':
        if (data.traineeId) {
          const passed = data.passed ?? true;
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: passed ? 'SUCCESS' : 'WARNING',
            title: passed ? 'Assessment Passed' : 'Assessment Graded',
            message: passed
              ? `You passed the assessment for "${data.courseTitle || 'course'}" with a score of ${data.score}%.`
              : `Your assessment for "${data.courseTitle || 'course'}" was evaluated with a score of ${data.score}%.`,
            link: data.courseId ? `/courses/${data.courseId}` : '/assessments',
            data: { eventKey: `assessment_${data.attemptId || Date.now()}` },
          };
        }
        break;

      case 'SKILL_GAP_IDENTIFIED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'WARNING',
            title: 'Skill Gap Identified',
            message: `A skill gap was identified in "${data.competencyName || 'Competency'}". Recommended courses are available.`,
            link: '/recommendations',
            data: { eventKey: `skillgap_${data.competencyId}_${data.traineeId}` },
          };
        }
        break;

      case 'RECOMMENDATION_CREATED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'INFO',
            title: 'New Course Recommendation',
            message: `A new course recommendation "${data.courseTitle || 'Course'}" is available to boost your competency.`,
            link: '/recommendations',
            data: { eventKey: `recommendation_${data.courseId}_${data.traineeId}` },
          };
        }
        break;

      case 'TRAINER_SESSION_REQUESTED':
        if (data.trainerId) {
          payload = {
            organizationId: orgId,
            userId: data.trainerId,
            type: 'ACTION_REQUIRED',
            title: 'New Session Request',
            message: `A trainee has requested a capacity building session on "${data.competencyName || 'Competency'}".`,
            link: '/trainer-matching',
            data: { eventKey: `session_req_${data.sessionId}` },
          };
        }
        break;

      case 'TRAINER_SESSION_ACCEPTED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'SUCCESS',
            title: 'Session Request Accepted',
            message: `Your session request with trainer ${data.trainerName || 'Trainer'} was accepted!`,
            link: '/trainer-matching',
            data: { eventKey: `session_acc_${data.sessionId}` },
          };
        }
        break;

      case 'TRAINER_SESSION_DECLINED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'WARNING',
            title: 'Session Request Declined',
            message: `Your session request with trainer ${data.trainerName || 'Trainer'} was declined.`,
            link: '/trainer-matching',
            data: { eventKey: `session_dec_${data.sessionId}` },
          };
        }
        break;

      case 'TRAINER_SESSION_COMPLETED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'SUCCESS',
            title: 'Session Completed',
            message: `Your session on "${data.competencyName || 'Competency'}" with trainer ${data.trainerName || 'Trainer'} was marked completed.`,
            link: '/trainer-matching',
            data: { eventKey: `session_comp_${data.sessionId}` },
          };
        }
        break;

      case 'CERTIFICATE_ISSUED':
        if (data.traineeId) {
          payload = {
            organizationId: orgId,
            userId: data.traineeId,
            type: 'ACHIEVEMENT',
            title: 'Certificate Issued! 🎓',
            message: `Your verified certificate (${data.certificateCode}) for "${data.courseTitle}" is now available.`,
            link: `/certificates`,
            data: { eventKey: `cert_issued_${data.certificateCode}` },
          };
        }
        break;

      default:
        break;
    }

    if (payload) {
      return this.createNotification(payload, client);
    }
    return null;
  }
}

export const notificationsService = new NotificationsService();
