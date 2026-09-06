import { pool } from '../config/database';
import { config } from '../config/env';
import { hashPassword } from '../modules/auth/auth.utils';

async function seedAdmin() {
  console.log('🌱 Starting Capacity Connect Admin Provisioning Seed...');

  const orgCode = config.auth.adminSeedOrgCode || 'ORG001';
  const adminEmail = (config.auth.adminSeedEmail || 'admin@capacityconnect.com').toLowerCase().trim();
  const rawPassword = config.auth.adminSeedPassword || 'AdminPassword123!';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure default organization ORG001 exists
    const orgQuery = `
      INSERT INTO organizations (name, code)
      VALUES ($1, $2)
      ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, code;
    `;
    const orgRes = await client.query(orgQuery, ['Demo Organization', orgCode]);
    const organization = orgRes.rows[0];
    console.log(`🏢 Organization verified: ${organization.name} (Code: ${organization.code}, ID: ${organization.id})`);

    // 2. Check if admin user already exists
    const userQuery = `SELECT id, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1;`;
    const userRes = await client.query(userQuery, [adminEmail]);

    if (userRes.rows.length > 0) {
      const existing = userRes.rows[0];
      console.log(`ℹ️ Admin user already exists: ${existing.email} (Role: ${existing.role}, ID: ${existing.id})`);
      await client.query('COMMIT');
      return;
    }

    // 3. Hash admin password
    const passwordHash = await hashPassword(rawPassword);

    // 4. Create bootstrap Admin user
    const insertAdminSql = `
      INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, true, true)
      RETURNING id, email, role;
    `;

    const adminRes = await client.query(insertAdminSql, [
      organization.id,
      'System',
      'Administrator',
      adminEmail,
      passwordHash,
      'ADMIN',
    ]);

    const createdAdmin = adminRes.rows[0];
    await client.query('COMMIT');

    console.log(`✅ Successfully provisioned Admin user: ${createdAdmin.email} (Role: ${createdAdmin.role}, ID: ${createdAdmin.id})`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 Admin provisioning failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedAdmin();
}

export { seedAdmin };
