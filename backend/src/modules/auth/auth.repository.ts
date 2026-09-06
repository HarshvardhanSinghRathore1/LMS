import { pool } from '../../config/database';
import { UserRecord, RefreshTokenRecord, UserRole } from './auth.types';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const sql = `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1;`;
    const { rows } = await pool.query<UserRecord>(sql, [normalizedEmail]);
    return rows[0] || null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const sql = `SELECT * FROM users WHERE id = $1 LIMIT 1;`;
    const { rows } = await pool.query<UserRecord>(sql, [id]);
    return rows[0] || null;
  }

  async findOrganizationByCode(code: string): Promise<{ id: string; name: string; code: string } | null> {
    const sql = `SELECT id, name, code FROM organizations WHERE UPPER(code) = UPPER($1) LIMIT 1;`;
    const { rows } = await pool.query(sql, [code.trim()]);
    return rows[0] || null;
  }

  async createUser(data: {
    organizationId: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<UserRecord> {
    const normalizedEmail = data.email.toLowerCase().trim();
    // Default role for public registration is strictly TRAINEE
    const role: UserRole = data.role && ['ADMIN', 'TRAINER', 'TRAINEE'].includes(data.role) ? data.role : 'TRAINEE';

    const sql = `
      INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const { rows } = await pool.query<UserRecord>(sql, [
      data.organizationId,
      data.firstName.trim(),
      data.lastName.trim(),
      normalizedEmail,
      data.passwordHash,
      role,
    ]);

    return rows[0];
  }

  async updateLastLogin(userId: string): Promise<void> {
    const sql = `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1;`;
    await pool.query(sql, [userId]);
  }

  async saveRefreshToken(data: {
    userId: string;
    tokenHash: string;
    tokenFamilyId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, token_family_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const { rows } = await pool.query<RefreshTokenRecord>(sql, [
      data.userId,
      data.tokenHash,
      data.tokenFamilyId,
      data.expiresAt,
    ]);

    return rows[0];
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const sql = `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1;`;
    const { rows } = await pool.query<RefreshTokenRecord>(sql, [tokenHash]);
    return rows[0] || null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    const sql = `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1;`;
    await pool.query(sql, [id]);
  }

  async revokeTokenFamily(tokenFamilyId: string): Promise<void> {
    const sql = `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_family_id = $1 AND revoked_at IS NULL;`;
    await pool.query(sql, [tokenFamilyId]);
  }
}

export const authRepository = new AuthRepository();
