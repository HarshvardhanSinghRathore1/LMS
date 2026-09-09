export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_ROLE_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'COURSE_PUBLISHED'
  | 'COURSE_ARCHIVED'
  | 'ENROLLMENT_CREATED'
  | 'COURSE_COMPLETED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_PUBLISHED'
  | 'ASSESSMENT_SUBMITTED'
  | 'COMPETENCY_CREATED'
  | 'COMPETENCY_UPDATED'
  | 'COURSE_COMPETENCY_MAPPED'
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_ACCEPTED'
  | 'RECOMMENDATION_DISMISSED'
  | 'TRAINER_PROFILE_CREATED'
  | 'TRAINER_PROFILE_UPDATED'
  | 'TRAINER_EXPERTISE_UPDATED'
  | 'SESSION_REQUESTED'
  | 'SESSION_STATUS_CHANGED'
  | 'CERTIFICATE_ISSUED'
  | 'SNAPSHOT_INVALIDATED';

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

export interface AuditLogRecord {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AppendAuditPayload {
  organizationId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditFilters {
  actorId?: string;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export type AuditExportFormat = 'csv' | 'json';
