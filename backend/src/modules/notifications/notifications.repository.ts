import { pool } from '../../config/database';
import { PoolClient } from 'pg';
import {
  NotificationRecord,
  NotificationPayload,
  NotificationFilters,
} from './notifications.types';

export class NotificationsRepository {
  async createNotification(
    payload: NotificationPayload,
    client?: PoolClient
  ): Promise<NotificationRecord> {
    const executor = client || pool;
    const query = `
      INSERT INTO notifications (
        organization_id,
        user_id,
        type,
        title,
        message,
        link,
        data,
        is_read,
        read_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NULL)
      RETURNING *;
    `;
    const values = [
      payload.organizationId,
      payload.userId,
      payload.type,
      payload.title,
      payload.message,
      payload.link || null,
      JSON.stringify(payload.data || {}),
    ];
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async createNotificationTransactional(
    payload: NotificationPayload,
    client: PoolClient
  ): Promise<NotificationRecord> {
    return this.createNotification(payload, client);
  }

  async findExistingNotificationByEventKey(
    orgId: string,
    userId: string,
    eventKey: string,
    client?: PoolClient
  ): Promise<NotificationRecord | null> {
    const executor = client || pool;
    const query = `
      SELECT *
      FROM notifications
      WHERE organization_id = $1
        AND user_id = $2
        AND data->>'eventKey' = $3
      LIMIT 1;
    `;
    const { rows } = await executor.query(query, [orgId, userId, eventKey]);
    return rows[0] || null;
  }

  async findNotificationsByUser(
    orgId: string,
    userId: string,
    filters: NotificationFilters
  ): Promise<{ notifications: NotificationRecord[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['organization_id = $1', 'user_id = $2'];
    const params: any[] = [orgId, userId];
    let paramIndex = 3;

    if (filters.isRead !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(filters.isRead);
    }

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(filters.type);
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `SELECT COUNT(*) AS total FROM notifications WHERE ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const listQuery = `
      SELECT *
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;
    const listParams = [...params, limit, offset];
    const { rows } = await pool.query(listQuery, listParams);

    return {
      notifications: rows,
      total,
      page,
      limit,
    };
  }

  async countUnreadNotifications(orgId: string, userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE organization_id = $1
        AND user_id = $2
        AND is_read = FALSE;
    `;
    const { rows } = await pool.query(query, [orgId, userId]);
    return parseInt(rows[0]?.unread_count || '0', 10);
  }

  async markNotificationRead(
    orgId: string,
    userId: string,
    id: string
  ): Promise<NotificationRecord | null> {
    const query = `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND organization_id = $2
        AND user_id = $3
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id, orgId, userId]);
    return rows[0] || null;
  }

  async markAllNotificationsRead(orgId: string, userId: string): Promise<number> {
    const query = `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = NOW()
      WHERE organization_id = $1
        AND user_id = $2
        AND is_read = FALSE;
    `;
    const { rowCount } = await pool.query(query, [orgId, userId]);
    return rowCount || 0;
  }

  async deleteNotification(orgId: string, userId: string, id: string): Promise<boolean> {
    const query = `
      DELETE FROM notifications
      WHERE id = $1
        AND organization_id = $2
        AND user_id = $3;
    `;
    const { rowCount } = await pool.query(query, [id, orgId, userId]);
    return (rowCount || 0) > 0;
  }

  async deleteOldNotifications(orgId: string, retentionDays: number = 90): Promise<number> {
    const query = `
      DELETE FROM notifications
      WHERE organization_id = $1
        AND created_at < NOW() - ($2 || ' days')::INTERVAL;
    `;
    const { rowCount } = await pool.query(query, [orgId, retentionDays]);
    return rowCount || 0;
  }
}

export const notificationsRepository = new NotificationsRepository();
