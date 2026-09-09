import { pool } from '../../config/database';
import { PoolClient } from 'pg';
import {
  AuditLogRecord,
  AppendAuditPayload,
  AuditFilters,
} from './audit.types';

export class AuditRepository {
  async appendAuditLog(
    payload: AppendAuditPayload,
    client?: PoolClient
  ): Promise<AuditLogRecord> {
    const executor = client || pool;
    const query = `
      INSERT INTO audit_logs (
        organization_id,
        actor_id,
        actor_email,
        actor_role,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      payload.organizationId,
      payload.actorId || null,
      payload.actorEmail || null,
      payload.actorRole || null,
      payload.action,
      payload.resourceType,
      payload.resourceId || null,
      JSON.stringify(payload.details || {}),
      payload.ipAddress || null,
      payload.userAgent || null,
    ];
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async appendAuditLogTransactional(
    payload: AppendAuditPayload,
    client: PoolClient
  ): Promise<AuditLogRecord> {
    return this.appendAuditLog(payload, client);
  }

  async findAuditLogs(
    orgId: string,
    filters: AuditFilters
  ): Promise<{ logs: AuditLogRecord[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(filters.resourceId);
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const listQuery = `
      SELECT *
      FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;
    const listParams = [...params, limit, offset];
    const { rows } = await pool.query(listQuery, listParams);

    return {
      logs: rows,
      total,
      page,
      limit,
    };
  }

  async findAuditLogsForExport(
    orgId: string,
    filters: Omit<AuditFilters, 'page' | 'limit'>,
    maxLimit: number = 10000
  ): Promise<AuditLogRecord[]> {
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(filters.resourceId);
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT *
      FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex++};
    `;
    const listParams = [...params, maxLimit];
    const { rows } = await pool.query(query, listParams);
    return rows;
  }
}

export const auditRepository = new AuditRepository();
