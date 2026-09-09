import { PoolClient } from 'pg';
import { auditRepository } from './audit.repository';
import {
  AuditLogRecord,
  AppendAuditPayload,
  AuditFilters,
  AuditExportFormat,
  AuditAction,
  AuditResourceType,
} from './audit.types';
import { DomainEvent } from '../../events/event.types';

export class AuditService {
  async appendAuditLog(
    payload: AppendAuditPayload,
    client?: PoolClient
  ): Promise<AuditLogRecord> {
    // Sanitize details to guarantee no secrets/tokens/keys are ever logged
    const sanitizedDetails = this.sanitizeDetails(payload.details);
    return auditRepository.appendAuditLog(
      {
        ...payload,
        details: sanitizedDetails,
      },
      client
    );
  }

  async appendAuditLogTransactional(
    payload: AppendAuditPayload,
    client: PoolClient
  ): Promise<AuditLogRecord> {
    return this.appendAuditLog(payload, client);
  }

  async getAuditLogs(
    orgId: string,
    filters: AuditFilters
  ): Promise<{ logs: AuditLogRecord[]; total: number; page: number; limit: number }> {
    return auditRepository.findAuditLogs(orgId, filters);
  }

  async exportAuditLogs(
    orgId: string,
    format: AuditExportFormat,
    filters: Omit<AuditFilters, 'page' | 'limit'>
  ): Promise<{ contentType: string; filename: string; data: string }> {
    const logs = await auditRepository.findAuditLogsForExport(orgId, filters, 10000);

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `audit_logs_${new Date().toISOString().slice(0, 10)}.json`,
        data: JSON.stringify(logs, null, 2),
      };
    }

    // CSV format with formula injection protection
    const csvRows = this.generateSafeCsv(logs);
    return {
      contentType: 'text/csv',
      filename: `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      data: csvRows,
    };
  }

  /**
   * Escape and sanitize cell values to protect against CSV formula injection
   */
  private sanitizeCsvValue(val: any): string {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);

    // If starts with dangerous spreadsheet formula triggers, prefix with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes and wrap in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  private generateSafeCsv(logs: AuditLogRecord[]): string {
    const headers = [
      'ID',
      'Created At',
      'Actor ID',
      'Actor Email',
      'Actor Role',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Details',
    ];

    const lines = [headers.join(',')];

    for (const log of logs) {
      const row = [
        this.sanitizeCsvValue(log.id),
        this.sanitizeCsvValue(log.created_at),
        this.sanitizeCsvValue(log.actor_id),
        this.sanitizeCsvValue(log.actor_email),
        this.sanitizeCsvValue(log.actor_role),
        this.sanitizeCsvValue(log.action),
        this.sanitizeCsvValue(log.resource_type),
        this.sanitizeCsvValue(log.resource_id),
        this.sanitizeCsvValue(log.ip_address),
        this.sanitizeCsvValue(log.user_agent),
        this.sanitizeCsvValue(log.details),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Strip sensitive fields (passwords, tokens, keys) from details
   */
  private sanitizeDetails(details?: Record<string, any>): Record<string, any> {
    if (!details || typeof details !== 'object') return {};

    const sensitiveKeys = new Set([
      'password',
      'password_hash',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'jwt',
      'secret',
      'apiKey',
      'answerKey',
      'answers',
    ]);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(details)) {
      if (!sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Automatic domain event mapper for audit logging
   */
  async handleDomainEvent(event: DomainEvent, client?: PoolClient): Promise<AuditLogRecord | null> {
    const orgId = event.organizationId;
    const actor = event.actor;
    const data = event.payload;

    let action: AuditAction | null = null;
    let resourceType: AuditResourceType = 'USER';
    let resourceId: string | null = null;
    let details: Record<string, any> = { ...data };

    switch (event.type) {
      case 'USER_REGISTERED':
        action = 'USER_REGISTERED';
        resourceType = 'USER';
        resourceId = data.userId;
        break;
      case 'USER_LOGIN':
        action = 'USER_LOGIN';
        resourceType = 'USER';
        resourceId = data.userId;
        break;
      case 'USER_LOGOUT':
        action = 'USER_LOGOUT';
        resourceType = 'USER';
        resourceId = data.userId;
        break;
      case 'USER_ROLE_UPDATED':
        action = 'USER_ROLE_UPDATED';
        resourceType = 'USER';
        resourceId = data.userId;
        break;
      case 'COURSE_CREATED':
        action = 'COURSE_CREATED';
        resourceType = 'COURSE';
        resourceId = data.courseId;
        break;
      case 'COURSE_UPDATED':
        action = 'COURSE_UPDATED';
        resourceType = 'COURSE';
        resourceId = data.courseId;
        break;
      case 'COURSE_PUBLISHED':
        action = 'COURSE_PUBLISHED';
        resourceType = 'COURSE';
        resourceId = data.courseId;
        break;
      case 'COURSE_ARCHIVED':
        action = 'COURSE_ARCHIVED';
        resourceType = 'COURSE';
        resourceId = data.courseId;
        break;
      case 'ENROLLMENT_CREATED':
        action = 'ENROLLMENT_CREATED';
        resourceType = 'ENROLLMENT';
        resourceId = data.enrollmentId;
        break;
      case 'COURSE_COMPLETED':
        action = 'COURSE_COMPLETED';
        resourceType = 'ENROLLMENT';
        resourceId = data.enrollmentId;
        break;
      case 'ASSESSMENT_CREATED':
        action = 'ASSESSMENT_CREATED';
        resourceType = 'ASSESSMENT';
        resourceId = data.assessmentId;
        break;
      case 'ASSESSMENT_PUBLISHED':
        action = 'ASSESSMENT_PUBLISHED';
        resourceType = 'ASSESSMENT';
        resourceId = data.assessmentId;
        break;
      case 'ASSESSMENT_EVALUATED':
        action = 'ASSESSMENT_SUBMITTED';
        resourceType = 'ASSESSMENT';
        resourceId = data.assessmentId || data.attemptId;
        break;
      case 'COMPETENCY_CREATED':
        action = 'COMPETENCY_CREATED';
        resourceType = 'COMPETENCY';
        resourceId = data.competencyId;
        break;
      case 'COMPETENCY_UPDATED':
        action = 'COMPETENCY_UPDATED';
        resourceType = 'COMPETENCY';
        resourceId = data.competencyId;
        break;
      case 'COURSE_COMPETENCY_MAPPED':
        action = 'COURSE_COMPETENCY_MAPPED';
        resourceType = 'COURSE';
        resourceId = data.courseId;
        break;
      case 'RECOMMENDATION_CREATED':
        action = 'RECOMMENDATION_CREATED';
        resourceType = 'RECOMMENDATION';
        resourceId = data.recommendationId;
        break;
      case 'RECOMMENDATION_ACCEPTED':
        action = 'RECOMMENDATION_ACCEPTED';
        resourceType = 'RECOMMENDATION';
        resourceId = data.recommendationId;
        break;
      case 'RECOMMENDATION_DISMISSED':
        action = 'RECOMMENDATION_DISMISSED';
        resourceType = 'RECOMMENDATION';
        resourceId = data.recommendationId;
        break;
      case 'TRAINER_PROFILE_CREATED':
        action = 'TRAINER_PROFILE_CREATED';
        resourceType = 'TRAINER_PROFILE';
        resourceId = data.profileId;
        break;
      case 'TRAINER_PROFILE_UPDATED':
        action = 'TRAINER_PROFILE_UPDATED';
        resourceType = 'TRAINER_PROFILE';
        resourceId = data.profileId;
        break;
      case 'TRAINER_EXPERTISE_UPDATED':
        action = 'TRAINER_EXPERTISE_UPDATED';
        resourceType = 'TRAINER_PROFILE';
        resourceId = data.profileId;
        break;
      case 'TRAINER_SESSION_REQUESTED':
        action = 'SESSION_REQUESTED';
        resourceType = 'TRAINER_SESSION';
        resourceId = data.sessionId;
        break;
      case 'TRAINER_SESSION_ACCEPTED':
      case 'TRAINER_SESSION_DECLINED':
      case 'TRAINER_SESSION_COMPLETED':
      case 'TRAINER_SESSION_CANCELLED':
        action = 'SESSION_STATUS_CHANGED';
        resourceType = 'TRAINER_SESSION';
        resourceId = data.sessionId;
        break;
      case 'CERTIFICATE_ISSUED':
        action = 'CERTIFICATE_ISSUED';
        resourceType = 'CERTIFICATE';
        resourceId = data.certificateId || data.certificateCode;
        break;
      case 'SNAPSHOT_INVALIDATED':
        action = 'SNAPSHOT_INVALIDATED';
        resourceType = 'ANALYTICS_SNAPSHOT';
        resourceId = data.snapshotType || 'ORG_DASHBOARD';
        break;
      default:
        break;
    }

    if (action) {
      return this.appendAuditLog(
        {
          organizationId: orgId,
          actorId: actor?.id || null,
          actorEmail: actor?.email || null,
          actorRole: actor?.role || (actor?.id ? 'UNKNOWN' : 'SYSTEM'),
          action,
          resourceType,
          resourceId,
          details,
          ipAddress: actor?.ipAddress || null,
          userAgent: actor?.userAgent || null,
        },
        client
      );
    }

    return null;
  }
}

export const auditService = new AuditService();
