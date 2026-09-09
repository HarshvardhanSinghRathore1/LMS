import { PoolClient } from 'pg';

export type DomainEventType =
  | 'USER_REGISTERED'
  | 'USER_ROLE_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'COURSE_PUBLISHED'
  | 'COURSE_ARCHIVED'
  | 'ENROLLMENT_CREATED'
  | 'COURSE_PROGRESS_UPDATED'
  | 'COURSE_COMPLETED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_PUBLISHED'
  | 'ASSESSMENT_EVALUATED'
  | 'COMPETENCY_CREATED'
  | 'COMPETENCY_UPDATED'
  | 'COURSE_COMPETENCY_MAPPED'
  | 'SKILL_GAP_IDENTIFIED'
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_ACCEPTED'
  | 'RECOMMENDATION_DISMISSED'
  | 'TRAINER_PROFILE_CREATED'
  | 'TRAINER_PROFILE_UPDATED'
  | 'TRAINER_EXPERTISE_UPDATED'
  | 'TRAINER_SESSION_REQUESTED'
  | 'TRAINER_SESSION_ACCEPTED'
  | 'TRAINER_SESSION_DECLINED'
  | 'TRAINER_SESSION_COMPLETED'
  | 'TRAINER_SESSION_CANCELLED'
  | 'CERTIFICATE_ISSUED'
  | 'SNAPSHOT_INVALIDATED';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ACTION_REQUIRED'
  | 'ACHIEVEMENT';

export type AuditResourceType =
  | 'USER'
  | 'COURSE'
  | 'MODULE'
  | 'LESSON'
  | 'ENROLLMENT'
  | 'ASSESSMENT'
  | 'COMPETENCY'
  | 'RECOMMENDATION'
  | 'TRAINER_PROFILE'
  | 'TRAINER_SESSION'
  | 'CERTIFICATE'
  | 'ANALYTICS_SNAPSHOT';

export interface EventActor {
  id?: string;
  email?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DomainEvent<T = Record<string, any>> {
  type: DomainEventType;
  organizationId: string;
  actor?: EventActor;
  payload: T;
  timestamp?: Date;
}
