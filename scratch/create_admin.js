const { pool } = require('../backend/dist/config/database');
const { hashPassword } = require('../backend/dist/modules/auth/auth.utils');

async function createAdmin() {
  const hash = await hashPassword('Pass1234!');
  await pool.query("INSERT INTO organizations (name,code) VALUES ('DemoOrg','DEMO') ON CONFLICT(code) DO NOTHING");
  const res = await pool.query("SELECT id FROM organizations WHERE code='DEMO'");
  const orgId = res.rows[0].id;
  await pool.query("INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role) VALUES ($1, 'Demo', 'Admin', 'admin@demo.com', $2, 'ADMIN') ON CONFLICT(email) DO UPDATE SET role='ADMIN', password_hash=$2", [orgId, hash]);
  console.log('Demo Admin created');
  pool.end();
}
createAdmin();
